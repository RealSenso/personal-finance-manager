import React, { useState } from 'react';
import { 
  TrendingUp, 
  PiggyBank, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Edit2,
  CalendarDays
} from 'lucide-react';
import { Bucket, Transaction, UserIncomeProfile } from '../types';
import { formatCurrency, getDaysInMonth } from '../lib/insights';
import { calculateDailyAllowance } from '../lib/dailyAllowance';
import { DailyAllowanceWidget } from './DailyAllowanceWidget';

interface DashboardStatsProps {
  incomeProfile: UserIncomeProfile;
  buckets: Bucket[];
  transactions: Transaction[];
  currentMonth: string;
  onUpdateIncome: (newProfile: UserIncomeProfile) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  incomeProfile,
  buckets,
  transactions,
  currentMonth,
  onUpdateIncome,
}) => {
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [stipendInput, setStipendInput] = useState(incomeProfile.stipend.toString());
  const [extraInput, setExtraInput] = useState(incomeProfile.extra.toString());

  // Date pacing calculations
  const [year, month] = currentMonth.split('-').map(Number);
  const totalDaysInMonth = getDaysInMonth(year, month - 1);
  const today = new Date();
  const isCurrentCalendarMonth = 
    today.getFullYear() === year && today.getMonth() === month - 1;
  const currentDay = isCurrentCalendarMonth ? Math.min(today.getDate(), totalDaysInMonth) : totalDaysInMonth;
  const monthProgressPercent = Math.round((currentDay / totalDaysInMonth) * 100);

  // Income calculations
  const totalIncome =
    incomeProfile.stipend +
    incomeProfile.extra +
    (incomeProfile.otherStreams || []).reduce((s, st) => s + st.amount, 0);

  // Planned allocations (both recurring and monthly planned savings deposits)
  const totalPlannedAllocations = buckets
    .filter((b) => !b.isArchived)
    .reduce((sum, b) => sum + b.plannedMonthly, 0);

  const unallocated = totalIncome - totalPlannedAllocations;

  // Month-to-date spending (recurring envelopes)
  const recurringBuckets = buckets.filter((b) => b.type === 'recurring' && !b.isArchived);
  const totalRecurringBudget = recurringBuckets.reduce((s, b) => s + b.plannedMonthly, 0);

  const monthExpenses = transactions.filter(
    (tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth)
  );
  const totalSpentThisMonth = monthExpenses.reduce((s, tx) => s + tx.amount, 0);
  const spentPercentOfRecurring =
    totalRecurringBudget > 0
      ? Math.round((totalSpentThisMonth / totalRecurringBudget) * 100)
      : 0;

  const dailyAllowance = calculateDailyAllowance(
    buckets,
    transactions,
    currentMonth,
    new Date(2026, 8, 3)
  );

  // Savings Goals Accumulation
  const savingsGoals = buckets.filter((b) => b.type === 'savings_goal' && !b.isArchived);
  const totalSavedAccumulated = savingsGoals.reduce((s, b) => s + b.currentBalance, 0);
  const totalSavingsTarget = savingsGoals.reduce((s, b) => s + (b.targetAmount || 0), 0);
  const savingsTargetPercent =
    totalSavingsTarget > 0
      ? Math.round((totalSavedAccumulated / totalSavingsTarget) * 100)
      : 0;

  // Month-to-date savings deposits
  const monthDeposits = transactions.filter(
    (tx) => tx.type === 'savings_deposit' && tx.date.startsWith(currentMonth)
  );
  const totalDepositedThisMonth = monthDeposits.reduce((s, tx) => s + tx.amount, 0);

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const stipend = parseFloat(stipendInput) || 0;
    const extra = parseFloat(extraInput) || 0;
    onUpdateIncome({
      ...incomeProfile,
      stipend,
      extra,
    });
    setIsEditingIncome(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Stat Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Income */}
        <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors relative group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Monthly Income</span>
            <button
              onClick={() => setIsEditingIncome(!isEditingIncome)}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Edit monthly income streams"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {formatCurrency(totalIncome)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1 font-mono">
              <span>₹{incomeProfile.stipend.toLocaleString('en-IN')} stipend</span>
              <span>+</span>
              <span>₹{incomeProfile.extra.toLocaleString('en-IN')} extra</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Envelope Allocation</span>
            <span className="font-mono text-zinc-300">
              {Math.round((totalPlannedAllocations / totalIncome) * 100)}% Assigned
            </span>
          </div>

          {/* Quick Edit Income Form Dropdown */}
          {isEditingIncome && (
            <div className="absolute top-12 left-0 right-0 z-20 bg-zinc-950 border border-zinc-700 rounded-xl p-4 shadow-2xl">
              <form onSubmit={handleSaveIncome} className="space-y-3">
                <div className="text-xs font-semibold text-zinc-200">Adjust Monthly Income</div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Monthly Stipend (₹)</label>
                  <input
                    type="number"
                    value={stipendInput}
                    onChange={(e) => setStipendInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Extra / Freelance (₹)</label>
                  <input
                    type="number"
                    value={extraInput}
                    onChange={(e) => setExtraInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingIncome(false)}
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded text-xs"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Budget Allocation Status (Zero-Sum Indicator) */}
        <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Allocated vs Unallocated</span>
            {unallocated === 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Balanced
              </span>
            ) : unallocated > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-3 h-3" />
                Surplus
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="w-3 h-3" />
                Deficit
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {formatCurrency(totalPlannedAllocations)}
            </div>
            <div className="text-xs mt-1 font-mono">
              {unallocated === 0 ? (
                <span className="text-emerald-400 font-medium">₹0 unallocated (Zero-Sum)</span>
              ) : unallocated > 0 ? (
                <span className="text-amber-400 font-medium">
                  +{formatCurrency(unallocated)} unallocated
                </span>
              ) : (
                <span className="text-rose-400 font-medium">
                  -{formatCurrency(Math.abs(unallocated))} over-budgeted
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Envelopes Planned</span>
            <span className="font-mono text-zinc-300">{buckets.length} Buckets</span>
          </div>
        </div>

        {/* Month-to-Date Spend */}
        <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Monthly Expenses</span>
            <span className="text-[11px] font-mono font-medium text-zinc-400">
              {spentPercentOfRecurring}% of budget
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {formatCurrency(totalSpentThisMonth)}
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1 font-mono">
              <span>of {formatCurrency(totalRecurringBudget)} planned</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Remaining Allowance</span>
            <span className="font-mono text-emerald-400 font-medium">
              {formatCurrency(Math.max(0, totalRecurringBudget - totalSpentThisMonth))}
            </span>
          </div>
        </div>

        {/* Total Savings Goals Accumulation */}
        <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Saved (Goals)</span>
            <span className="text-[11px] font-mono font-medium text-emerald-400">
              {savingsTargetPercent}% of target
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {formatCurrency(totalSavedAccumulated)}
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1 font-mono">
              <span>of {formatCurrency(totalSavingsTarget)} target</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>This Month Deposits</span>
            <span className="font-mono text-indigo-400 font-medium">
              +{formatCurrency(totalDepositedThisMonth)}
            </span>
          </div>
        </div>
      </div>

      {/* Smart Daily Expense Allowance Widget */}
      <DailyAllowanceWidget allowance={dailyAllowance} />

      {/* Month Timeline & Pacing Anchor */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-200">
              Month Progress: Day {currentDay} of {totalDaysInMonth} ({monthProgressPercent}% elapsed)
            </div>
            <div className="text-[11px] text-zinc-400">
              {totalDaysInMonth - currentDay} days remaining in this budget cycle
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="flex items-center gap-3 sm:w-72">
          <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden relative">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${monthProgressPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono font-medium text-zinc-300 min-w-10 text-right">
            {monthProgressPercent}%
          </span>
        </div>
      </div>
    </div>
  );
};
