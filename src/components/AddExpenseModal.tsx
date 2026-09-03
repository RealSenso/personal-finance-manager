import React, { useState } from 'react';
import { X, Plus, Minus, PiggyBank, Receipt, Calendar, Wallet, Users } from 'lucide-react';
import { Bucket, Transaction, TransactionType } from '../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  initialBucketId?: string;
  initialType?: TransactionType;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  buckets,
  onAddTransaction,
  initialBucketId,
  initialType = 'expense',
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [bucketId, setBucketId] = useState<string>(
    initialBucketId || buckets[0]?.id || ''
  );
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [paidBy, setPaidBy] = useState<'me' | 'other'>('me');
  const [counterparty, setCounterparty] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Format today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(todayStr);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid positive amount in ₹');
      return;
    }
    if (!bucketId) {
      setErrorMessage('Please select a bucket envelope');
      return;
    }
    const isBorrowed = type === 'expense' && paidBy === 'other';
    if (isBorrowed && !counterparty.trim()) {
      setErrorMessage('Enter the name of the person who paid for you');
      return;
    }

    setErrorMessage('');

    onAddTransaction({
      bucketId,
      amount: numAmount,
      type,
      date,
      note: note.trim() || merchant.trim() || (type === 'expense' ? 'Expense' : 'Deposit'),
      merchant: merchant.trim() || undefined,
      source: 'manual',
      paidBy: type === 'expense' ? paidBy : undefined,
      counterparty: isBorrowed ? counterparty.trim() : undefined,
      settled: isBorrowed ? false : undefined,
    });

    setAmount('');
    setNote('');
    setMerchant('');
    setPaidBy('me');
    setCounterparty('');
    onClose();
  };

  const activeBuckets = buckets.filter((b) => !b.isArchived);
  const filteredBuckets =
    type === 'savings_deposit'
      ? activeBuckets.filter((b) => b.type === 'savings_goal')
      : activeBuckets;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {type === 'expense' ? (
              <Receipt className="w-5 h-5 text-rose-400" />
            ) : (
              <PiggyBank className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
              {type === 'expense' ? 'Log New Expense' : 'Log Savings Deposit'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (filteredBuckets.length > 0) setBucketId(filteredBuckets[0].id);
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                type === 'expense'
                  ? 'bg-zinc-800 text-rose-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('savings_deposit');
                const savings = activeBuckets.filter((b) => b.type === 'savings_goal');
                if (savings.length > 0) setBucketId(savings[0].id);
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                type === 'savings_deposit'
                  ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Savings Deposit</span>
            </button>
          </div>

          {/* Amount (₹) */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Amount (₹) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-base font-semibold">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Bucket Envelope */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Target Envelope / Bucket <span className="text-rose-400">*</span>
            </label>
            <select
              value={bucketId}
              onChange={(e) => setBucketId(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {filteredBuckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.type === 'recurring' ? `Recurring • ₹${b.plannedMonthly}/mo` : `Goal • Target ₹${b.targetAmount}`})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Paid By (debt tracking) */}
          {type === 'expense' && (
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Paid by
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPaidBy('me')}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    paidBy === 'me'
                      ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Me</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy('other')}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    paidBy === 'other'
                      ? 'bg-zinc-800 text-amber-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Someone else</span>
                </button>
              </div>
              {paidBy === 'other' && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Who paid? (you'll owe them this amount)"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-amber-400/80 mt-1">
                    Logged against the envelope now and tracked as money you owe {counterparty.trim() || 'them'} until you settle up.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Merchant / Payee */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Merchant / Payee (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Swiggy, Jio, Anthropic, Landlord"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description / Note */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Note / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Dinner with team, monthly recharge"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer"
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
