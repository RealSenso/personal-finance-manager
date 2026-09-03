import React from "react";
import { Plus, History, FileText, ChevronDown } from "lucide-react";

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
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fmt = (m: string) => {
    const [y, mm] = m.split("-").map(Number);
    return new Date(y, mm - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const navBtn =
    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-zinc-300 border border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors cursor-pointer";

  return (
    <header className="shrink-0 relative z-20 border-b border-zinc-800 bg-zinc-900/70 backdrop-blur px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h1 className="font-display font-bold text-xl text-zinc-100 leading-none">
            Mirai
          </h1>
          <span className="text-zinc-400 text-sm leading-none">未来</span>
          <span className="hidden sm:inline text-[11px] text-zinc-500 leading-none">
            · a quiet kakeibo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center rounded-full bg-zinc-900 border border-zinc-800 pl-3.5 pr-2 py-1.5 text-xs">
            <select
              value={currentMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              aria-label="Budget month"
              className="appearance-none bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer pr-4"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {fmt(m)}
                  {m === thisMonth ? " · now" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={onOpenHistory}
            className={`${navBtn} hidden sm:flex`}
            title="Monthly history"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">History</span>
          </button>
          <button
            type="button"
            onClick={onOpenWeeklyDigest}
            className={`${navBtn} hidden sm:flex`}
            title="Weekly digest"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Digest</span>
          </button>

          {syncButton}

          <button
            type="button"
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-pointer"
            title="Log a transaction (press N)"
          >
            <Plus className="w-4 h-4" />
            <span>Log</span>
          </button>
        </div>
      </div>
    </header>
  );
};
