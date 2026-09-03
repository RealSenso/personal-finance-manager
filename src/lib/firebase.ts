// Firebase is optional. When the VITE_FIREBASE_* env vars are absent the app stays
// 100% local (localStorage only) and every export here is null / a no-op.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  cfg.apiKey && cfg.projectId && cfg.appId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseEnabled) {
  app = initializeApp(cfg as Required<typeof cfg>);
  auth = getAuth(app);
  // ignoreUndefinedProperties: transactions/buckets carry optional fields that are
  // sometimes explicitly `undefined` (e.g. merchant, counterparty). Without this,
  // setDoc() throws "Unsupported field value: undefined" and sync breaks.
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
}

export { app, auth, db };
export const googleProvider = new GoogleAuthProvider();
