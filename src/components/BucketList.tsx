import React, { useState } from "react";
import { Plus, Wallet, PiggyBank, Layers, Sparkles } from "lucide-react";
import { Bucket, Transaction } from "../types";
import { BucketCard } from "./BucketCard";

interface BucketListProps {
  buckets: Bucket[];
  transactions: Transaction[];
  currentMonth: string;
  onEditBucket: (bucket: Bucket) => void;
  onDeleteBucket: (bucketId: string) => void;
  onQuickAction: (bucket: Bucket, type: "expense" | "savings_deposit") => void;
  onAddNewBucket: () => void;
  onOpenSmartSavings?: () => void;
}

export const BucketList: React.FC<BucketListProps> = ({
  buckets,
  transactions,
  currentMonth,
  onEditBucket,
  onDeleteBucket,
  onQuickAction,
  onAddNewBucket,
  onOpenSmartSavings,
}) => {
  const [filterType, setFilterType] = useState<
    "all" | "recurring" | "savings_goal"
  >("all");

  const filtered = buckets.filter((b) => {
    if (b.isArchived) return false;
    if (filterType === "all") return true;
    return b.type === filterType;
  });
  const recurringCount = buckets.filter(
    (b) => b.type === "recurring" && !b.isArchived,
  ).length;
  const savingsCount = buckets.filter(
    (b) => b.type === "savings_goal" && !b.isArchived,
  ).length;

  const pill = (
    v: typeof filterType,
    label: string,
    icon?: React.ReactNode,
  ) => (
    <button
      onClick={() => setFilterType(v)}
      className={`px-2.5 py-1 rounded-md text-xs font-display font-medium tracking-wide transition-colors cursor-pointer flex items-center gap-1 ${
        filterType === v
          ? "bg-emerald-500 text-zinc-950"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="m-panel bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col lg:min-h-0 lg:h-full">
      {/* Header */}
      <div className="shrink-0 flex flex-col gap-2.5 p-3 border-b border-zinc-800/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="m-label text-emerald-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Envelopes & Goals ({filtered.length})
          </span>
          <div className="flex items-center gap-2">
            {savingsCount > 0 && onOpenSmartSavings && (
              <button
                type="button"
                onClick={onOpenSmartSavings}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Optimize</span>
              </button>
            )}
            <button
              onClick={onAddNewBucket}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-700/80 hover:border-emerald-500/40 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">New</span>
            </button>
          </div>
        </div>
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 self-start">
          {pill("all", `All ${buckets.length}`)}
          {pill(
            "recurring",
            `Recurring ${recurringCount}`,
            <Wallet className="w-3 h-3 text-cyan-400" />,
          )}
          {pill(
            "savings_goal",
            `Goals ${savingsCount}`,
            <PiggyBank className="w-3 h-3 text-emerald-400" />,
          )}
        </div>
      </div>

      {/* Scroll region */}
      <div className="m-scroll p-3 grid grid-cols-1 xl:grid-cols-2 gap-3 content-start">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center text-zinc-500 text-xs py-12 font-display tracking-wide">
            No envelopes in this filter.
          </div>
        ) : (
          filtered.map((bucket, i) => (
            <div
              key={bucket.id}
              className="anim-rise"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <BucketCard
                bucket={bucket}
                transactions={transactions}
                currentMonth={currentMonth}
                onEdit={onEditBucket}
                onDelete={onDeleteBucket}
                onQuickAction={onQuickAction}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
