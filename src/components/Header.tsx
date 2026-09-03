import React from 'react';
import { 
  Wallet, 
  Plus, 
  Upload, 
  FileText, 
  History, 
  Tag, 
  HardDrive, 
  Download, 
  Calendar,
  Lock,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  onOpenAddExpense: () => void;
  onOpenCsvImport: () => void;
  onOpenWeeklyDigest: () => void;
  onOpenHistory: () => void;
  onOpenRules: () => void;
  onOpenStorageManager: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  onMonthChange,
  availableMonths,
  onOpenAddExpense,
  onOpenCsvImport,
  onOpenWeeklyDigest,
  onOpenHistory,
  onOpenRules,
  onOpenStorageManager,
  onOpenExport,
}) => {
  const allowedEmail = import.meta.env.VITE_ALLOWED_USER_EMAIL || 'official.senso.vt@gmail.com';

  const formatMonthDisplay = (m: string) => {
    const [year, month] = m.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-30 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Context */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-zinc-100 tracking-tight">
                  Personal Finance Manager
                </h1>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/60 text-zinc-300">
                  Envelope System
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-zinc-400">
                  <Lock className="w-3 h-3 text-zinc-400" />
                  {allowedEmail}
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={onOpenStorageManager}
                  className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Zero-Config Local Storage & Auto-Backup Manager"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-mono text-[11px]">Local-First (0 Config)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 mr-2" />
            <select
              value={currentMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              aria-label="Select Budget Month"
              className="bg-transparent border-none text-zinc-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-zinc-900 text-zinc-200">
                  {formatMonthDisplay(m)} {m === '2026-09' ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Action Navigation */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
            title="Side-by-side monthly history and trend charts"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>History</span>
          </button>

          <button
            type="button"
            onClick={onOpenWeeklyDigest}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
            title="View rule-based weekly financial briefing"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Digest</span>
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
            title="Manage CSV keyword-to-bucket auto-rules"
          >
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rules</span>
          </button>

          <button
            type="button"
            onClick={onOpenCsvImport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
            title="Import bank statement CSV with auto-categorization"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
            title="Export CSV or JSON backup"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={onOpenStorageManager}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:text-white transition-colors cursor-pointer"
            title="Zero-Config Local Storage & Auto-Backup"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Storage & Sync</span>
          </button>

          {/* Primary Action */}
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer ml-1"
          >
            <Plus className="w-4 h-4" />
            <span>Log Transaction</span>
          </button>
        </div>
      </div>
    </header>
  );
};
