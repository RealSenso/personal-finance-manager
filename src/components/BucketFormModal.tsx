import React, { useState, useEffect } from 'react';
import { X, Wallet, PiggyBank, Trash2, AlertCircle, Sparkles, Clock } from 'lucide-react';
import { Bucket, BucketType, UserIncomeProfile } from '../types';
import { optimizeSavingsDistribution } from '../lib/smartSavings';
import { formatCurrency } from '../lib/insights';

interface BucketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bucketData: Omit<Bucket, 'id'>, bucketId?: string) => void;
  onDelete?: (bucketId: string) => void;
  bucketToEdit?: Bucket | null;
  allBuckets?: Bucket[];
  incomeProfile?: UserIncomeProfile;
}

const COLOR_OPTIONS = [
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#14b8a6', // Teal
];

export const BucketFormModal: React.FC<BucketFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  bucketToEdit,
  allBuckets,
  incomeProfile,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<BucketType>('recurring');
  const [plannedMonthly, setPlannedMonthly] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [category, setCategory] = useState('General');
  const [color, setColor] = useState('#10b981');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (bucketToEdit) {
      setName(bucketToEdit.name);
      setType(bucketToEdit.type);
      setPlannedMonthly(bucketToEdit.plannedMonthly.toString());
      setTargetAmount(bucketToEdit.targetAmount ? bucketToEdit.targetAmount.toString() : '');
      setCurrentBalance(bucketToEdit.currentBalance.toString());
      setCategory(bucketToEdit.category || 'General');
      setColor(bucketToEdit.color || '#10b981');
      setNotes(bucketToEdit.notes || '');
    } else {
      setName('');
      setType('recurring');
      setPlannedMonthly('2000');
      setTargetAmount('50000');
      setCurrentBalance('0');
      setCategory('General');
      setColor('#10b981');
      setNotes('');
    }
  }, [bucketToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter a bucket name');
      return;
    }

    setErrorMessage('');
    const planned = parseFloat(plannedMonthly) || 0;
    const target = type === 'savings_goal' ? parseFloat(targetAmount) || 0 : undefined;
    const balance = parseFloat(currentBalance) || 0;

    onSave(
      {
        name: name.trim(),
        type,
        plannedMonthly: planned,
        targetAmount: target,
        currentBalance: balance,
        category: category.trim(),
        color,
        icon: type === 'recurring' ? 'wallet' : 'piggy-bank',
        notes: notes.trim(),
      },
      bucketToEdit?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {type === 'recurring' ? (
              <Wallet className="w-5 h-5 text-indigo-400" />
            ) : (
              <PiggyBank className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
              {bucketToEdit ? 'Edit Envelope / Goal' : 'Create New Envelope / Goal'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Type Selector */}
          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium">Bucket Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setType('recurring')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  type === 'recurring'
                    ? 'bg-zinc-800 text-indigo-400 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Recurring Envelope</span>
              </button>
              <button
                type="button"
                onClick={() => setType('savings_goal')}
                className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  type === 'savings_goal'
                    ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <PiggyBank className="w-3.5 h-3.5" />
                <span>Savings Goal</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {type === 'recurring'
                ? 'Resets each month. Compares planned allowance vs actual spend.'
                : 'Accumulates towards a target amount. Never resets. Computes dynamic ETA.'}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="text-zinc-400 block mb-1 font-medium">
              Bucket Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fun Fund, Hostel Fund, Claude Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Planned Monthly Amount */}
          <div>
            <label className="text-zinc-400 block mb-1 font-medium">
              {type === 'recurring' ? 'Planned Monthly Budget (₹)' : 'Planned Monthly Deposit (₹)'}{' '}
              <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono font-semibold">
                ₹
              </span>
              <input
                type="number"
                min="0"
                required
                value={plannedMonthly}
                onChange={(e) => setPlannedMonthly(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Smart Calculation Helpers for Savings Goals */}
            {type === 'savings_goal' && (
              <div className="mt-2 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-zinc-500">Quick target pace:</span>
                  {[3, 6, 12].map((months) => {
                    const target = parseFloat(targetAmount) || 0;
                    const cur = parseFloat(currentBalance) || 0;
                    const gap = Math.max(0, target - cur);
                    const calculated = gap > 0 ? Math.round(gap / months / 50) * 50 : 0;
                    return (
                      <button
                        key={months}
                        type="button"
                        onClick={() => setPlannedMonthly(calculated.toString())}
                        disabled={gap === 0}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer border border-zinc-700/60 font-mono text-[10px]"
                      >
                        {months} mos (₹{calculated.toLocaleString('en-IN')}/mo)
                      </button>
                    );
                  })}
                </div>

                {allBuckets && incomeProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      const opt = optimizeSavingsDistribution(allBuckets, incomeProfile, 'balanced_accelerator');
                      const match = opt.allocations.find((a) => a.bucketId === bucketToEdit?.id);
                      if (match) {
                        setPlannedMonthly(match.recommendedMonthly.toString());
                      } else if (opt.availableSavingsPool > 0) {
                        // For a brand new goal, suggest half of available pool or balanced
                        const suggested = Math.round((opt.availableSavingsPool * 0.4) / 50) * 50;
                        setPlannedMonthly(suggested.toString());
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer pt-0.5"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Auto-Calculate Optimal Accelerated Deposit</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Target Amount & Accumulated (if savings goal) */}
          {type === 'savings_goal' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  Target Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono font-semibold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">
                  Current Accumulated (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono font-semibold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Category & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Category</label>
              <input
                type="text"
                placeholder="e.g. Subscriptions, Living, Tech"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1 font-medium">Accent Color</label>
              <div className="flex items-center gap-1.5 pt-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                      color === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-zinc-400 block mb-1 font-medium">Notes / Purpose</label>
            <input
              type="text"
              placeholder="e.g. Swiggy food delivery, dining with friends"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-between gap-2.5">
            {bucketToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(bucketToEdit.id);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Delete this envelope"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Envelope</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer"
              >
                {bucketToEdit ? 'Save Changes' : 'Create Bucket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
