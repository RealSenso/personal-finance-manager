import React, { useState } from "react";
import {
  X,
  Sparkles,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Calendar,
  Sliders,
  HelpCircle,
  PiggyBank,
  Check,
  Zap,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { Bucket, UserIncomeProfile } from "../types";
import {
  optimizeSavingsDistribution,
  SavingsStrategy,
  SmartSavingsOptimizationResult,
} from "../lib/smartSavings";
import { formatCurrency } from "../lib/insights";

interface SmartSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  incomeProfile: UserIncomeProfile;
  onApplyAllocations: (updatedBuckets: Bucket[]) => void;
}

export const SmartSavingsModal: React.FC<SmartSavingsModalProps> = ({
  isOpen,
  onClose,
  buckets,
  incomeProfile,
  onApplyAllocations,
}) => {
  const [strategy, setStrategy] = useState<SavingsStrategy>(
    "balanced_accelerator",
  );
  const [hasApplied, setHasApplied] = useState<boolean>(false);

  if (!isOpen) return null;

  const result: SmartSavingsOptimizationResult = optimizeSavingsDistribution(
    buckets,
    incomeProfile,
    strategy,
    new Date(2026, 8, 3),
  );

  const handleApply = () => {
    // Create new bucket array with updated plannedMonthly for savings goals
    const updated = buckets.map((bucket) => {
      if (bucket.type === "savings_goal") {
        const alloc = result.allocations.find((a) => a.bucketId === bucket.id);
        if (alloc) {
          return {
            ...bucket,
            plannedMonthly: alloc.recommendedMonthly,
          };
        }
      }
      return bucket;
    });

    onApplyAllocations(updated);
    setHasApplied(true);
    setTimeout(() => {
      onClose();
      setHasApplied(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Smart Savings Goal Optimizer
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Fast Purchase Engine
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Calculates monthly deposits to buy your items as early as
                possible while still depositing into everything.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Capacity Banner */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Monthly Savings Capacity
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {formatCurrency(result.availableSavingsPool)}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  / month available
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                {formatCurrency(result.totalMonthlyIncome)} income -{" "}
                {formatCurrency(result.totalRecurringExpenses)} recurring
                expenses
              </div>
            </div>

            {/* Quick Summary Pill */}
            {result.cascadeTimelineSummary && (
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 text-xs space-y-1 sm:max-w-xs">
                <div className="text-zinc-200 font-medium flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Earliest Purchase in{" "}
                    {result.cascadeTimelineSummary.firstGoalReadyInMonths} mos
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  <strong className="text-zinc-300 font-semibold">
                    {result.cascadeTimelineSummary.firstGoalName}
                  </strong>{" "}
                  will be fully funded first, then its monthly deposit cascades
                  to your other goals!
                </div>
              </div>
            )}
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Allocation Distribution Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setStrategy("balanced_accelerator")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  strategy === "balanced_accelerator"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-zinc-100"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">
                    Balanced Accelerator
                  </span>
                  {strategy === "balanced_accelerator" && (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Guaranteed baseline deposit into every goal + 70% surplus
                  accelerated to buy nearest item fastest.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrategy("high_velocity")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  strategy === "high_velocity"
                    ? "bg-indigo-500/10 border-indigo-500/50 text-zinc-100"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">
                    Maximum Velocity
                  </span>
                  {strategy === "high_velocity" && (
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Small token baseline deposit to other items + 85% focused on
                  buying the closest item ASAP.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrategy("proportional")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  strategy === "proportional"
                    ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">
                    Even Progress
                  </span>
                  {strategy === "proportional" && (
                    <Check className="w-3.5 h-3.5 text-zinc-200" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  50% equal baseline + 50% target weighting. All items progress
                  at similar percentage speeds.
                </p>
              </button>
            </div>
          </div>

          {/* Goal Breakdown Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Optimized Monthly Deposit Breakdown
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {result.allocations.length} Active Goals
              </span>
            </div>

            <div className="space-y-2.5">
              {result.allocations.map((alloc) => {
                const percentDone =
                  alloc.targetAmount > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (alloc.currentBalance / alloc.targetAmount) * 100,
                        ),
                      )
                    : 100;

                return (
                  <div
                    key={alloc.bucketId}
                    className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Goal info & Progress */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: alloc.color }}
                        />
                        <h4 className="text-sm font-bold text-zinc-100">
                          {alloc.bucketName}
                        </h4>
                        {alloc.isAchieved && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Achieved
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>
                          {formatCurrency(alloc.currentBalance)} of{" "}
                          {formatCurrency(alloc.targetAmount)}
                        </span>
                        <span>{percentDone}%</span>
                      </div>

                      <div className="mt-1 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${percentDone}%` }}
                        />
                      </div>

                      <div className="text-[11px] font-mono text-zinc-400 mt-1">
                        {alloc.remainingAmount > 0 ? (
                          <span>
                            {formatCurrency(alloc.remainingAmount)} remaining
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            Goal complete!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recommended Monthly Plan */}
                    <div className="sm:border-l sm:border-zinc-800 sm:pl-4 min-w-[240px]">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
                        Smart Monthly Deposit
                      </div>
                      <div className="text-xl font-extrabold font-mono text-zinc-100 mt-0.5 flex items-baseline gap-2">
                        <span>
                          {formatCurrency(alloc.recommendedMonthly)}/mo
                        </span>
                        <span className="text-xs font-normal text-emerald-400">
                          ({alloc.percentageOfPool}%)
                        </span>
                      </div>

                      {/* Baseline vs Accelerator Pill */}
                      {!alloc.isAchieved && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 mt-1">
                          <span className="text-zinc-300">
                            ₹{alloc.baselineShare.toLocaleString("en-IN")} base
                          </span>
                          <span>+</span>
                          <span className="text-emerald-400 font-medium">
                            ₹{alloc.acceleratorShare.toLocaleString("en-IN")}{" "}
                            booster
                          </span>
                        </div>
                      )}

                      {/* Ready Date & Time Saved */}
                      <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">Ready to buy:</span>
                        <span className="text-emerald-400 font-semibold">
                          {alloc.completionDateStr}
                        </span>
                      </div>

                      {alloc.monthsSavedVsEqualSplit > 0 && (
                        <div className="text-[10px] text-emerald-400/90 font-medium mt-0.5">
                          ⚡ Ready ~{alloc.monthsSavedVsEqualSplit} mos earlier
                          than equal split
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cascade Explanation Callout */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-300/90 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-emerald-300 font-semibold block">
                How the Cascade Snowball Works
              </strong>
              <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                By accelerating the closest item, you get to buy it much
                earlier. The exact moment it is fully funded, its entire monthly
                allocation automatically cascades to turbocharge your next
                savings goal!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="text-xs text-zinc-400">
            Total Allocated:{" "}
            <strong className="text-zinc-100 font-mono">
              {formatCurrency(
                result.allocations.reduce(
                  (s, a) => s + a.recommendedMonthly,
                  0,
                ),
              )}
            </strong>{" "}
            / {formatCurrency(result.availableSavingsPool)}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={hasApplied}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              {hasApplied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Applied to Goals!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Optimized Goals</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
