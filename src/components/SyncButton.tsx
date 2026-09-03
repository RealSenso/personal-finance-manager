import React from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import type { SyncStatus } from "../lib/useCloudSync";

interface SyncButtonProps {
  enabled: boolean;
  status: SyncStatus;
  email: string | null;
  lastError?: string | null;
  errorHint?: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onRetry: () => void;
}

export const SyncButton: React.FC<SyncButtonProps> = ({
  enabled,
  status,
  email,
  lastError,
  errorHint,
  onSignIn,
  onSignOut,
  onRetry,
}) => {
  if (!enabled) {
    return (
      <span
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-500 bg-zinc-900 border border-zinc-800"
        title="Set VITE_FIREBASE_* env vars to enable multi-device sync"
      >
        <CloudOff className="w-3.5 h-3.5" />
        <span>Local only</span>
      </span>
    );
  }

  // Signed in but Firestore/sync is failing → primary action is Retry.
  if (status === "error" && email) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-rose-500/10 border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
        title={
          errorHint || `Sync error: ${lastError || "unknown"} — click to retry`
        }
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Sync blocked — retry</span>
      </button>
    );
  }

  // Not signed in (or a sign-in attempt errored).
  if (status === "signed_out" || (status === "error" && !email)) {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-zinc-900 border transition-colors cursor-pointer ${
          status === "error"
            ? "text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
            : "text-zinc-300 border-zinc-800 hover:border-emerald-500/40 hover:text-zinc-100"
        }`}
        title={
          status === "error"
            ? errorHint || `Sign-in failed: ${lastError}`
            : "Sign in with Google to sync across devices"
        }
      >
        <Cloud className="w-3.5 h-3.5 text-emerald-400" />
        <span>
          {status === "error" ? "Sign-in failed — retry" : "Sync devices"}
        </span>
      </button>
    );
  }

  const label = status === "synced" ? "Synced" : "Syncing…";
  const Icon = status === "synced" ? Cloud : RefreshCw;
  const tone =
    status === "synced"
      ? "text-emerald-400 border-zinc-800"
      : "text-amber-400 border-zinc-800";

  return (
    <button
      type="button"
      onClick={onSignOut}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-zinc-900 border hover:bg-zinc-800/80 transition-colors cursor-pointer group ${tone}`}
      title={`${email || "Signed in"} — click to sign out`}
    >
      <Icon
        className={`w-3.5 h-3.5 ${status === "connecting" ? "animate-spin" : ""}`}
      />
      <span className="group-hover:hidden">{label}</span>
      <span className="hidden group-hover:flex items-center gap-1">
        <LogOut className="w-3.5 h-3.5" /> Sign out
      </span>
    </button>
  );
};
