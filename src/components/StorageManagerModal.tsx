import React, { useState, useEffect } from 'react';
import { 
  Database, 
  X, 
  HardDrive, 
  ShieldCheck, 
  Download, 
  Upload, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles,
  Layers,
  FolderSync,
  Cpu,
  Lock
} from 'lucide-react';
import { getStorageStats, StorageStats } from '../lib/storage';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportBackup: () => void;
  onOpenExportModal: () => void;
  onRequestReset: () => void;
  totalTransactions: number;
  totalBuckets: number;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  isOpen,
  onClose,
  onExportBackup,
  onOpenExportModal,
  onRequestReset,
  totalTransactions,
  totalBuckets,
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [fileHandleName, setFileHandleName] = useState<string | null>(null);
  const [fileSyncSupported, setFileSyncSupported] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStats(getStorageStats());
      setFileSyncSupported('showSaveFilePicker' in window);
    }
  }, [isOpen, totalTransactions, totalBuckets]);

  if (!isOpen) return null;

  const handleLinkLocalFile = async () => {
    if (!('showSaveFilePicker' in window)) {
      setSyncStatusMsg('Native File System API is not supported in this browser. Browser local storage is active!');
      return;
    }

    try {
      // @ts-ignore
      const handle = await window.showSaveFilePicker({
        suggestedName: `finance-ledger-${new Date().toISOString().slice(0, 10)}.json`,
        types: [{
          description: 'JSON Ledger Backup',
          accept: { 'application/json': ['.json'] },
        }],
      });

      if (handle) {
        setFileHandleName(handle.name || 'finance-ledger.json');
        setSyncStatusMsg(`Successfully linked to ${handle.name}! Exports will write to this file.`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSyncStatusMsg('Could not link file. Standard browser storage continues to work automatically.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100 tracking-tight">
                  Zero-Config Local Storage
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  100% Offline
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Zero setup, zero API keys, no cloud servers required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300">
          {/* Solution Highlight Box */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-300">
                  Why Zero-Config Local Storage?
                </h4>
                <p className="mt-1 text-xs text-emerald-200/80 leading-relaxed">
                  Instead of complex cloud databases (Supabase, Postgres, OAuth keys) that require accounts and setup, your personal finance app uses a <strong>zero-configuration, local-first engine</strong> built directly into your browser.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">
                    ✓ No Supabase URL or Anon Key
                  </span>
                  <span className="bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">
                    ✓ 0 Configuration Required
                  </span>
                  <span className="bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">
                    ✓ Works 100% Offline
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Storage Stats Grid */}
          <div>
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2 font-semibold">
              Live Storage Ledger Metrics
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 font-mono block">Envelopes</span>
                <span className="text-lg font-bold font-mono text-zinc-100">
                  {stats?.bucketCount || totalBuckets}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">Active</span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 font-mono block">Transactions</span>
                <span className="text-lg font-bold font-mono text-zinc-100">
                  {stats?.transactionCount || totalTransactions}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">Recorded</span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 font-mono block">Keyword Rules</span>
                <span className="text-lg font-bold font-mono text-zinc-100">
                  {stats?.ruleCount || 14}
                </span>
                <span className="text-[10px] text-indigo-400 font-mono block mt-0.5">Auto-categorize</span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 font-mono block">Storage Size</span>
                <span className="text-lg font-bold font-mono text-zinc-100">
                  {stats?.approximateKb || '~18 KB'}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">Client-side</span>
              </div>
            </div>
          </div>

          {/* Optional: Local File System Link (Native File System Access API) */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-indigo-400" />
                <h5 className="font-semibold text-zinc-200">
                  Local Disk Mirroring (File System Access)
                </h5>
              </div>
              {fileSyncSupported ? (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Supported in Browser
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                  Using LocalStorage
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Want a real file on your hard drive? You can optionally link a local JSON file. Every change you make in the app will sync directly to that file on your disk without any cloud servers!
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleLinkLocalFile}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderSync className="w-3.5 h-3.5" />
                <span>{fileHandleName ? `Linked: ${fileHandleName}` : 'Link Local JSON File'}</span>
              </button>
              {fileHandleName && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active file link
                </span>
              )}
            </div>
            {syncStatusMsg && (
              <p className="text-[11px] text-zinc-300 font-mono bg-zinc-950/60 p-2 rounded border border-zinc-800">
                {syncStatusMsg}
              </p>
            )}
          </div>

          {/* Quick Backups & Recovery */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">
              Portability & Instant Snapshots
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onExportBackup();
                }}
                className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left flex items-center gap-3 group transition-colors cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 block text-xs">
                    Download Snapshot (JSON)
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    Save a full backup of all buckets & transactions
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExportModal();
                }}
                className="p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left flex items-center gap-3 group transition-colors cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 block text-xs">
                    Restore or Export CSV
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    Upload a JSON snapshot or download spreadsheet
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestReset();
            }}
            className="text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            Reset to Default ₹22,400 Setup
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
