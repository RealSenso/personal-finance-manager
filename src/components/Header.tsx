import React from 'react';
import { Plus, History, FileText, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  onOpenAddExpense: () => void;
  onOpenWeeklyDigest: () => void;
  onOpenHistory: () => void;
  syncButton?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  currentMonth,
  onMonthChange,
  availableMonths,
  onOpenAddExpense,
  onOpenWeeklyDigest,
  onOpenHistory,
  syncButton,
}) => {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const fmt = (m: string) => {
    const [y, mm] = m.split('-').map(Number);
    return new Date(y, mm - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <header className="shrink-0 relative z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-3 sm:px-5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-9 h-9 shrink-0 bl-cut bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <span className="font-display font-bold text-zinc-950 text-lg leading-none">BL</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-[15px] tracking-[0.12em] text-white uppercase leading-none">
              Blue<span className="text-emerald-400">Lock</span> Ledger
            </h1>
            <div className="bl-label mt-1 text-zinc-500">Egoist Budget System</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="relative flex items-center bl-cut bg-zinc-900 border border-zinc-800 pl-3 pr-2 py-1.5 text-xs">
            <select
              value={currentMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              aria-label="Budget month"
              className="appearance-none bg-transparent text-zinc-200 font-display font-medium tracking-wide focus:outline-none cursor-pointer pr-4"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-zinc-900">
                  {fmt(m)} {m === thisMonth ? '· NOW' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={onOpenHistory}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bl-cut text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:text-white transition-colors cursor-pointer"
            title="Monthly history"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">History</span>
          </button>
          <button
            type="button"
            onClick={onOpenWeeklyDigest}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bl-cut text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:text-white transition-colors cursor-pointer"
            title="Weekly digest"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Digest</span>
          </button>

          {syncButton}

          <button
            type="button"
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3 py-1.5 bl-cut text-xs font-bold uppercase tracking-wider text-zinc-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 transition-colors cursor-pointer glow-blue"
          >
            <Plus className="w-4 h-4" />
            <span>Log</span>
          </button>
        </div>
      </div>
    </header>
  );
};
