import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseEnabled } from "./firebase";
import type { AppSnapshot } from "../types";

export type SyncStatus =
  "disabled" | "signed_out" | "connecting" | "synced" | "error";

interface Args {
  snapshot: AppSnapshot;
  onRemote: (snap: AppSnapshot) => void;
}

const pick = (s: AppSnapshot): AppSnapshot => ({
  income: s.income,
  buckets: s.buckets,
  transactions: s.transactions,
});

const newRev = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function logErr(where: string, e: unknown): string {
  const code =
    (e as { code?: string })?.code ||
    (e as { message?: string })?.message ||
    String(e);
  // eslint-disable-next-line no-console
  console.error(`[sync] ${where}:`, code, e);
  return code;
}

/**
 * Active multi-device sync via a single Firestore document at users/{uid}.
 * Last write wins; local edits are debounced up, remote edits stream down.
 * No-op (status 'disabled') when Firebase env vars are not configured.
 */
export function useCloudSync({ snapshot, onRemote }: Args) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SyncStatus>(
    firebaseEnabled ? "signed_out" : "disabled",
  );
  const [lastError, setLastError] = useState<string | null>(null);

  const fail = useCallback((where: string, e: unknown) => {
    setLastError(logErr(where, e));
    setStatus("error");
  }, []);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const onRemoteRef = useRef(onRemote);
  onRemoteRef.current = onRemote;

  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => {
    setLastError(null);
    if (auth?.currentUser) setStatus("connecting");
    setNonce((n) => n + 1);
  }, []);

  const revRef = useRef("");
  const appliedSerializedRef = useRef("");
  const readyRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Auth state (+ complete any redirect sign-in)
  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    getRedirectResult(auth).catch((e) => fail("redirect-result", e));
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      readyRef.current = false;
      if (u) {
        setLastError(null);
        setStatus("connecting");
      } else {
        setStatus("signed_out");
      }
    });
  }, [fail]);

  // Stream the user's document
  useEffect(() => {
    if (!firebaseEnabled || !db || !user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        readyRef.current = true;
        const data = snap.data() as
          (AppSnapshot & { rev?: string }) | undefined;

        if (!snap.exists() || !data || !data.buckets) {
          const rev = newRev();
          revRef.current = rev;
          appliedSerializedRef.current = JSON.stringify(
            pick(snapshotRef.current),
          );
          setDoc(ref, {
            ...pick(snapshotRef.current),
            rev,
            updatedAt: serverTimestamp(),
          })
            .then(() => setStatus("synced"))
            .catch((e) => fail("seed-write", e));
          return;
        }

        if (data.rev && data.rev === revRef.current) {
          setStatus("synced");
          return;
        }

        const incoming = pick(data);
        const incomingStr = JSON.stringify(incoming);
        revRef.current = data.rev || "";
        if (incomingStr !== JSON.stringify(pick(snapshotRef.current))) {
          appliedSerializedRef.current = incomingStr;
          onRemoteRef.current(incoming);
        }
        setStatus("synced");
      },
      (e) => fail("snapshot", e),
    );
    return unsub;
  }, [user, fail, nonce]);

  // Push local changes up (debounced)
  const serialized = JSON.stringify(pick(snapshot));
  useEffect(() => {
    if (!firebaseEnabled || !db || !user || !readyRef.current) return;
    if (serialized === appliedSerializedRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const rev = newRev();
      revRef.current = rev;
      setStatus("connecting");
      setDoc(doc(db!, "users", user.uid), {
        ...pick(snapshotRef.current),
        rev,
        updatedAt: serverTimestamp(),
      })
        .then(() => setStatus("synced"))
        .catch((e) => fail("push", e));
    }, 1000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [serialized, user, fail]);

  const signIn = useCallback(async () => {
    if (!auth) return;
    setLastError(null);
    setStatus("connecting");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string })?.code || "";
      // Popup blocked / unsupported → fall back to a full-page redirect.
      if (
        code.includes("popup") ||
        code.includes("cancelled") ||
        code.includes("operation-not-supported")
      ) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (e2) {
          fail("signin-redirect", e2);
          return;
        }
      }
      fail("signin-popup", e);
    }
  }, [fail]);

  const signOutNow = useCallback(async () => {
    if (!auth) return;
    revRef.current = "";
    appliedSerializedRef.current = "";
    readyRef.current = false;
    await signOut(auth);
  }, []);

  const errorHint =
    lastError &&
    /permission-denied|insufficient permissions|PERMISSION_DENIED/i.test(
      lastError,
    )
      ? "Firestore is rejecting access. Publish the users/{uid} security rule for project " +
        "finance-aec85 (Firebase console → Firestore → Rules), then Retry."
      : lastError && /unauthorized-domain/i.test(lastError)
        ? "This domain is not authorised for sign-in. Add it in Firebase console → Authentication → Settings → Authorized domains."
        : lastError &&
            /operation-not-allowed|configuration-not-found/i.test(lastError)
          ? "Google sign-in is not enabled for this Firebase project (Authentication → Sign-in method)."
          : lastError
            ? `Sync failed: ${lastError}`
            : null;

  return {
    enabled: firebaseEnabled,
    status,
    user,
    lastError,
    errorHint,
    signIn,
    signOut: signOutNow,
    retry,
  };
}
