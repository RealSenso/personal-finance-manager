import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseEnabled } from './firebase';
import type { AppSnapshot } from '../types';

export type SyncStatus =
  | 'disabled'
  | 'signed_out'
  | 'connecting'
  | 'synced'
  | 'error';

interface Args {
  snapshot: AppSnapshot;
  onRemote: (snap: AppSnapshot) => void;
}

const pick = (s: AppSnapshot): AppSnapshot => ({
  income: s.income,
  buckets: s.buckets,
  transactions: s.transactions,
  rules: s.rules,
});

/**
 * Active multi-device sync via a single Firestore document at users/{uid}.
 * Last write wins; local edits are debounced up, remote edits stream down.
 * No-op (status 'disabled') when Firebase env vars are not configured.
 */
export function useCloudSync({ snapshot, onRemote }: Args) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SyncStatus>(
    firebaseEnabled ? 'signed_out' : 'disabled'
  );

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const onRemoteRef = useRef(onRemote);
  onRemoteRef.current = onRemote;

  const revRef = useRef('');               // rev we last wrote or applied
  const appliedSerializedRef = useRef(''); // content last received from remote
  const readyRef = useRef(false);          // first snapshot received for this user
  const timerRef = useRef<number | null>(null);

  // Auth state
  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      readyRef.current = false;
      setStatus(u ? 'connecting' : 'signed_out');
    });
  }, []);

  // Stream the user's document
  useEffect(() => {
    if (!firebaseEnabled || !db || !user) return;
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        readyRef.current = true;
        const data = snap.data() as (AppSnapshot & { rev?: string }) | undefined;

        if (!snap.exists() || !data || !data.buckets) {
          // Brand-new account: seed it with whatever this device currently has.
          const rev = crypto.randomUUID();
          revRef.current = rev;
          appliedSerializedRef.current = JSON.stringify(pick(snapshotRef.current));
          setDoc(ref, { ...pick(snapshotRef.current), rev, updatedAt: serverTimestamp() })
            .then(() => setStatus('synced'))
            .catch(() => setStatus('error'));
          return;
        }

        if (data.rev && data.rev === revRef.current) {
          setStatus('synced');
          return; // our own write echoing back
        }

        const incoming = pick(data);
        const incomingStr = JSON.stringify(incoming);
        revRef.current = data.rev || '';
        if (incomingStr !== JSON.stringify(pick(snapshotRef.current))) {
          appliedSerializedRef.current = incomingStr;
          onRemoteRef.current(incoming);
        }
        setStatus('synced');
      },
      () => setStatus('error')
    );
    return unsub;
  }, [user]);

  // Push local changes up (debounced)
  const serialized = JSON.stringify(pick(snapshot));
  useEffect(() => {
    if (!firebaseEnabled || !db || !user || !readyRef.current) return;
    // This exact state just came down from remote — don't echo it back.
    if (serialized === appliedSerializedRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const rev = crypto.randomUUID();
      revRef.current = rev;
      setStatus('connecting');
      setDoc(doc(db!, 'users', user.uid), {
        ...pick(snapshotRef.current),
        rev,
        updatedAt: serverTimestamp(),
      })
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }, 1000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [serialized, user]);

  const signIn = useCallback(async () => {
    if (!auth) return;
    try {
      setStatus('connecting');
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setStatus('error');
    }
  }, []);

  const signOutNow = useCallback(async () => {
    if (!auth) return;
    revRef.current = '';
    appliedSerializedRef.current = '';
    await signOut(auth);
  }, []);

  return {
    enabled: firebaseEnabled,
    status,
    user,
    signIn,
    signOut: signOutNow,
  };
}
