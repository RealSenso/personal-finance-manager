import React, { useState } from 'react';
import { Flame, Sparkles, Clock, PiggyBank, ArrowRight } from 'lucide-react';
import { DailyExpenseAllowance, simulateTomorrowAllowance } from '../lib/dailyAllowance';
import { formatCurrency } from '../lib/insights';

interface DailyAllowanceWidgetProps {
  allowance: DailyExpenseAllowance;
  onSweepToGoals?: (amount: number) => void;
}

export const DailyAllowanceWidget: React.FC<DailyAllowanceWidgetProps> = ({
  allowance,
  onSweepToGoals,
}) => {
  const [simulatedSpend, setSimulatedSpend] = useState<string>('500');
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  const numSimulated = Math.max(0, parseFloat(simulatedSpend) || 0);
  const simulation = simulateTomorrowAllowance(
    allowance.remainingSpendable,
    allowance.remainingDays,
    numSimulated
  );

  const paceLabel =
    allowance.paceStatus === 'ahead'
      ? 'Ahead of pace'
      : allowance.paceStatus === 'behind'
        ? 'Spending fast'
        : 'On track';
  const paceTone =
    allowance.paceStatus === 'ahead'
      ? 'text-emerald-400'
      : allowance.paceStatus === 'behind'
        ? 'text-amber-400'
        : 'text-zinc-400';

  return (
    <div className="bl-panel bl-cut shrink-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-emerald-500/25 rounded-2xl p-4 shadow-lg relative overflow-hidden glow-blue">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bl-label text-emerald-400">Safe Daily Spend</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                {allowance.remainingDays}d left
              </span>
              <span className={`text-[10px] font-display uppercase tracking-wider ${paceTone}`}>{paceLabel}</span>
            </div>

            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums text-glow anim-pulse">
                {formatCurrency(allowance.safeDailyAllowance)}
              </span>
              <span className="text-xs font-medium text-zinc-400">/ day</span>
            </div>

            <p className="text-xs text-zinc-400 mt-1">
              {formatCurrency(allowance.remainingSpendable)} left this month after{' '}
              {formatCurrency(allowance.savingsReserve)} savings +{' '}
              {formatCurrency(allowance.goalCommitments)} goal deposits +{' '}
              {formatCurrency(allowance.fixedCommitments)} fixed bills.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2 flex items-center gap-3">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
                Spent Today (Day {allowance.currentDay})
              </div>
              <div className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-1.5 mt-0.5">
                <span>{formatCurrency(allowance.todaySpent)}</span>
                <span className="text-[11px] font-normal text-zinc-400">
                  / {formatCurrency(allowance.safeDailyAllowance)}
                </span>
              </div>
            </div>

            <div className="border-l border-zinc-800 pl-3">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
                Today Remaining
              </div>
              <div
                className={`text-sm font-bold font-mono mt-0.5 ${
                  allowance.todayRemaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {allowance.todayRemaining >= 0
                  ? formatCurrency(allowance.todayRemaining)
                  : `-${formatCurrency(Math.abs(allowance.todayRemaining))}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
              showSimulator
                ? 'bg-zinc-800 text-white border-zinc-600'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{showSimulator ? 'Close What-If' : 'What-If Simulator'}</span>
          </button>
        </div>
      </div>

      {/* Underspend surplus → goals */}
      {allowance.underspendPool >= 100 && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <PiggyBank className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-zinc-300">
              You're <span className="font-semibold text-emerald-400">
                {formatCurrency(allowance.underspendPool)}
              </span>{' '}
              under your steady pace of {formatCurrency(allowance.baselineDaily)}/day so far.
              Move it to your goals before it drifts back into spending.
            </p>
          </div>
          {onSweepToGoals && (
            <button
              type="button"
              onClick={() => onSweepToGoals(allowance.underspendPool)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              Sweep {formatCurrency(allowance.underspendPool)} to goals
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {showSimulator && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Daily Spend Impact</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  How spending a set amount today changes tomorrow's safe allowance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">If I spend</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1.5 text-xs text-zinc-500 font-mono">₹</span>
                  <input
                    type="number"
                    value={simulatedSpend}
                    onChange={(e) => setSimulatedSpend(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-6 pr-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="500"
                  />
                </div>
                <span className="text-xs text-zinc-400">today:</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-3 border-t border-zinc-800/60 font-mono">
              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Today's Remaining</span>
                <span className="text-white font-bold text-sm">
                  {formatCurrency(Math.max(0, allowance.safeDailyAllowance - numSimulated))}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Tomorrow's Safe Spend</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-emerald-400 font-bold text-sm">
                    {formatCurrency(simulation.newAllowanceTomorrow)}/day
                  </span>
                  <span
                    className={`text-[11px] ${
                      simulation.difference >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    ({simulation.difference >= 0 ? '+' : ''}
                    {formatCurrency(simulation.difference)})
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Month-End Spendable Left</span>
                <span className="text-zinc-200 font-bold text-sm">
                  {formatCurrency(Math.max(0, allowance.remainingSpendable - numSimulated))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
