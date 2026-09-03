import React from 'react';
import { Cloud, CloudOff, RefreshCw, LogOut, AlertTriangle } from 'lucide-react';
import type { SyncStatus } from '../lib/useCloudSync';

interface SyncButtonProps {
  enabled: boolean;
  status: SyncStatus;
  email: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const SyncButton: React.FC<SyncButtonProps> = ({
  enabled,
  status,
  email,
  onSignIn,
  onSignOut,
}) => {
  if (!enabled) {
    return (
      <span
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 bg-zinc-900 border border-zinc-800"
        title="Set VITE_FIREBASE_* env vars to enable multi-device sync"
      >
        <CloudOff className="w-3.5 h-3.5" />
        <span>Local only</span>
      </span>
    );
  }

  if (status === 'signed_out') {
    return (
      <button
        type="button"
        onClick={onSignIn}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
        title="Sign in with Google to sync across devices"
      >
        <Cloud className="w-3.5 h-3.5 text-emerald-400" />
        <span>Sync devices</span>
      </button>
    );
  }

  const label =
    status === 'synced' ? 'Synced' : status === 'error' ? 'Sync error' : 'Syncing…';
  const Icon = status === 'error' ? AlertTriangle : status === 'synced' ? Cloud : RefreshCw;
  const tone =
    status === 'error'
      ? 'text-rose-400 border-rose-500/30'
      : status === 'synced'
        ? 'text-emerald-400 border-zinc-800'
        : 'text-amber-400 border-zinc-800';

  return (
    <button
      type="button"
      onClick={onSignOut}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border hover:bg-zinc-800/80 transition-colors cursor-pointer group ${tone}`}
      title={`${email || 'Signed in'} — click to sign out`}
    >
      <Icon className={`w-3.5 h-3.5 ${status === 'connecting' ? 'animate-spin' : ''}`} />
      <span className="group-hover:hidden">{label}</span>
      <span className="hidden group-hover:flex items-center gap-1">
        <LogOut className="w-3.5 h-3.5" /> Sign out
      </span>
    </button>
  );
};
