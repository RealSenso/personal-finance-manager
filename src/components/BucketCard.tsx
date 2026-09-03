import React from "react";
import {
  PiggyBank,
  Wallet,
  Plus,
  Minus,
  MoreVertical,
  Edit,
  Trash2,
  Target,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Bucket, Transaction } from "../types";
import {
  formatCurrency,
  getBucketSpendForMonth,
  calculateSavingsETA,
  getDaysInMonth,
} from "../lib/insights";

interface BucketCardProps {
  bucket: Bucket;
  transactions: Transaction[];
  currentMonth: string;
  onEdit: (bucket: Bucket) => void;
  onDelete: (bucketId: string) => void;
  onQuickAction: (bucket: Bucket, type: "expense" | "savings_deposit") => void;
}

export const BucketCard: React.FC<BucketCardProps> = ({
  bucket,
  transactions,
  currentMonth,
  onEdit,
  onDelete,
  onQuickAction,
}) => {
  const [year, month] = currentMonth.split("-").map(Number);
  const totalDays = getDaysInMonth(year, month - 1);
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month - 1;
  const currentDay = isCurrentMonth
    ? Math.min(today.getDate(), totalDays)
    : totalDays;
  const monthProgressRatio = currentDay / totalDays;
  const monthProgressPercent = Math.round(monthProgressRatio * 100);

  if (bucket.type === "recurring") {
    const spent = getBucketSpendForMonth(bucket.id, transactions, currentMonth);
    const planned = bucket.plannedMonthly;
    const remaining = planned - spent;
    const spentRatio = planned > 0 ? spent / planned : 0;
    const spentPercent = Math.min(100, Math.round(spentRatio * 100));
    const isExceeded = spent > planned;
    const isHot =
      !bucket.isFixed &&
      !isExceeded &&
      spentRatio > monthProgressRatio + 0.15 &&
      spent > 0;

    return (
      <div className="m-panel bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-emerald-500/40 transition-all group relative">
        <div>
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shadow-inner"
                style={{
                  backgroundColor: `${bucket.color}20`,
                  color: bucket.color,
                  border: `1px solid ${bucket.color}40`,
                }}
              >
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                  {bucket.name}
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {bucket.category || "Recurring"}
                </span>
              </div>
            </div>

            {/* Pacing Chip */}
            <div className="flex items-center gap-1.5">
              {isExceeded ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold">
                  Exceeded
                </span>
              ) : bucket.isFixed ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold">
                  Fixed
                </span>
              ) : isHot ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
                  Fast pace
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  On track
                </span>
              )}

              {/* Action menu */}
              <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(bucket);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title={`Edit ${bucket.name}`}
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(bucket.id);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title={`Delete ${bucket.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Amount row */}
          <div className="mt-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-zinc-100">
                {formatCurrency(spent)}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                of {formatCurrency(planned)}
              </span>
            </div>

            {/* Progress Bar with Month Pace Indicator */}
            <div className="mt-2 relative">
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isExceeded
                      ? "bg-rose-500"
                      : isHot
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round(spentRatio * 100))}%`,
                  }}
                />
              </div>

              {/* Month Pace Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-zinc-400/70 z-10"
                style={{ left: `${monthProgressPercent}%` }}
                title={`Current day marker (${monthProgressPercent}% of month)`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1.5 font-mono">
              <span>{Math.round(spentRatio * 100)}% spent</span>
              <span>
                {remaining >= 0 ? (
                  <span className="text-zinc-300">
                    {formatCurrency(remaining)} left
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold">
                    +{formatCurrency(Math.abs(remaining))} over
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer Quick Action */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 truncate max-w-[160px]">
            {bucket.notes || "Monthly recurring"}
          </span>
          <button
            onClick={() => onQuickAction(bucket, "expense")}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
          >
            <Minus className="w-3 h-3 text-rose-400" />
            <span>Log Spend</span>
          </button>
        </div>
      </div>
    );
  }

  // Savings Goal Card
  const eta = calculateSavingsETA(bucket, transactions);
  const target = bucket.targetAmount || 0;
  const current = bucket.currentBalance;
  const remaining = Math.max(0, target - current);
  const percentComplete = eta.percentageComplete;
  const isGoalReached = current >= target && target > 0;

  return (
    <div className="m-panel bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-emerald-500/40 transition-all group relative">
      <div>
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shadow-inner"
              style={{
                backgroundColor: `${bucket.color}20`,
                color: bucket.color,
                border: `1px solid ${bucket.color}40`,
              }}
            >
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                {bucket.name}
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono">
                Savings Goal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isGoalReached ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Achieved
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-semibold">
                {percentComplete}%
              </span>
            )}

            <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(bucket);
                }}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title={`Edit ${bucket.name}`}
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(bucket.id);
                }}
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                title={`Delete ${bucket.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Amount & Progress */}
        <div className="mt-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-zinc-100">
              {formatCurrency(current)}
            </span>
            <span className="text-xs font-mono text-zinc-400">
              target {formatCurrency(target)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, percentComplete)}%` }}
            />
          </div>

          {/* Savings Velocity & ETA */}
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-1 text-zinc-300">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>+{formatCurrency(bucket.plannedMonthly)}/mo</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-300">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>ETA: {eta.estimatedDateStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Quick Action */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 font-mono">
          {remaining > 0
            ? `${formatCurrency(remaining)} to target`
            : "Fully funded!"}
        </span>
        <button
          onClick={() => onQuickAction(bucket, "savings_deposit")}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Deposit</span>
        </button>
      </div>
    </div>
  );
};
