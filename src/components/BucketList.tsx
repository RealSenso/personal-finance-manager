import React, { useState } from 'react';
import { Plus, Filter, Wallet, PiggyBank, Layers, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { Bucket, Transaction } from '../types';
import { BucketCard } from './BucketCard';

interface BucketListProps {
  buckets: Bucket[];
  transactions: Transaction[];
  currentMonth: string;
  onEditBucket: (bucket: Bucket) => void;
  onDeleteBucket: (bucketId: string) => void;
  onQuickAction: (bucket: Bucket, type: 'expense' | 'savings_deposit') => void;
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
  const [filterType, setFilterType] = useState<'all' | 'recurring' | 'savings_goal'>('all');

  const filteredBuckets = buckets.filter((b) => {
    if (b.isArchived) return false;
    if (filterType === 'all') return true;
    return b.type === filterType;
  });

  const recurringCount = buckets.filter((b) => b.type === 'recurring' && !b.isArchived).length;
  const savingsCount = buckets.filter((b) => b.type === 'savings_goal' && !b.isArchived).length;

  return (
    <div className="space-y-3.5">
      {/* List Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight">
            Envelopes & Savings Goals
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            ({filteredBuckets.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({buckets.length})
            </button>
            <button
              onClick={() => setFilterType('recurring')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'recurring'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wallet className="w-3 h-3 text-cyan-400" />
              <span>Recurring ({recurringCount})</span>
            </button>
            <button
              onClick={() => setFilterType('savings_goal')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'savings_goal'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PiggyBank className="w-3 h-3 text-emerald-400" />
              <span>Goals ({savingsCount})</span>
            </button>
          </div>

          {/* Smart Goal Optimizer Button */}
          {savingsCount > 0 && onOpenSmartSavings && (
            <button
              type="button"
              onClick={onOpenSmartSavings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer shadow-xs"
              title="Auto-calculate deposits to buy items as early as possible"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart Goal Optimizer</span>
            </button>
          )}

          {/* Add Bucket Button */}
          <button
            onClick={onAddNewBucket}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Bucket</span>
          </button>
        </div>
      </div>

      {/* Smart Savings Callout for Goals */}
      {(filterType === 'savings_goal' || savingsCount > 1) && onOpenSmartSavings && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/20 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <span>Fast-Purchase Distribution Active</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  Cascade Enabled
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Distributes savings deposits so you buy stuff as early as possible without neglecting any goal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSmartSavings}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Optimize Deposits</span>
          </button>
        </div>
      )}

      {/* Buckets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredBuckets.map((bucket) => (
          <BucketCard
            key={bucket.id}
            bucket={bucket}
            transactions={transactions}
            currentMonth={currentMonth}
            onEdit={onEditBucket}
            onDelete={onDeleteBucket}
            onQuickAction={onQuickAction}
          />
        ))}
      </div>
    </div>
  );
};
