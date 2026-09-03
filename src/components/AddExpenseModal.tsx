import React, { useEffect, useState } from "react";
import {
  X,
  Plus,
  Minus,
  PiggyBank,
  Receipt,
  Wallet,
  Users,
} from "lucide-react";
import { Bucket, Transaction, TransactionType } from "../types";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  onAddTransaction: (
    transaction: Omit<Transaction, "id" | "createdAt">,
  ) => void;
  /** When set, the dialog edits this transaction instead of creating one. */
  editTx?: Transaction | null;
  onUpdateTransaction?: (tx: Transaction) => void;
  initialBucketId?: string;
  initialType?: TransactionType;
}

const today = () => new Date().toISOString().slice(0, 10);
const sameName = (a?: string, b?: string) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  buckets,
  onAddTransaction,
  editTx,
  onUpdateTransaction,
  initialBucketId,
  initialType = "expense",
}) => {
  const isEdit = !!editTx;

  const [type, setType] = useState<TransactionType>(initialType);
  const [bucketId, setBucketId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "other">("me");
  const [counterparty, setCounterparty] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState("");

  const active = buckets.filter((b) => !b.isArchived);

  // Re-seed the form every time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    if (editTx) {
      setType(editTx.type);
      setBucketId(editTx.bucketId);
      setAmount(String(editTx.amount));
      setNote(editTx.note || "");
      setPaidBy(editTx.paidBy === "other" ? "other" : "me");
      setCounterparty(editTx.counterparty || "");
      setDate(editTx.date);
      setError("");
      return;
    }
    const startType = initialType;
    setType(startType);
    const pool =
      startType === "savings_deposit"
        ? active.filter((b) => b.type === "savings_goal")
        : active;
    setBucketId(
      initialBucketId && pool.some((b) => b.id === initialBucketId)
        ? initialBucketId
        : pool[0]?.id || "",
    );
    setAmount("");
    setNote("");
    setPaidBy("me");
    setCounterparty("");
    setDate(today());
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editTx, initialBucketId, initialType]);

  if (!isOpen) return null;

  const pool =
    type === "savings_deposit"
      ? active.filter((b) => b.type === "savings_goal")
      : active;

  const switchType = (t: TransactionType) => {
    setType(t);
    const p =
      t === "savings_deposit"
        ? active.filter((b) => b.type === "savings_goal")
        : active;
    if (!p.some((b) => b.id === bucketId)) setBucketId(p[0]?.id || "");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return setError("Enter a positive amount");
    if (!bucketId) return setError("Pick an envelope");
    const borrowed = type === "expense" && paidBy === "other";
    if (borrowed && !counterparty.trim()) return setError("Who paid for you?");
    setError("");

    const common = {
      bucketId,
      amount: n,
      type,
      date,
      note: note.trim() || (type === "expense" ? "Expense" : "Deposit"),
      paidBy: type === "expense" ? paidBy : undefined,
      counterparty: borrowed ? counterparty.trim() : undefined,
    };

    if (isEdit && editTx && onUpdateTransaction) {
      const keepSettled =
        editTx.paidBy === "other" &&
        sameName(editTx.counterparty, counterparty);
      onUpdateTransaction({
        ...editTx,
        ...common,
        settled: borrowed ? (keepSettled ? editTx.settled : false) : undefined,
      });
    } else {
      onAddTransaction({
        ...common,
        source: "manual",
        settled: borrowed ? false : undefined,
      });
    }
    onClose();
  };

  const seg = (activeSel: boolean, tone: string) =>
    `py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
      activeSel
        ? `bg-zinc-800 ${tone} font-semibold`
        : "text-zinc-400 hover:text-zinc-200"
    }`;
  const field =
    "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500";

  const title = isEdit
    ? "Edit transaction"
    : type === "expense"
      ? "Log an expense"
      : "Log a savings deposit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="m-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {type === "expense" ? (
              <Receipt className="w-4 h-4 text-rose-400" />
            ) : (
              <PiggyBank className="w-4 h-4 text-emerald-300" />
            )}
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => switchType("expense")}
              className={seg(type === "expense", "text-rose-400")}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => switchType("savings_deposit")}
              className={seg(type === "savings_deposit", "text-emerald-300")}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Amount (₹) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-base">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-base font-mono font-semibold text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Envelope <span className="text-rose-400">*</span>
            </label>
            <select
              value={bucketId}
              onChange={(e) => setBucketId(e.target.value)}
              required
              className={`${field} cursor-pointer`}
            >
              {pool.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={`${field} font-mono`}
            />
          </div>

          {type === "expense" && (
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1">
                Paid by
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPaidBy("me")}
                  className={seg(paidBy === "me", "text-emerald-300")}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Me</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy("other")}
                  className={seg(paidBy === "other", "text-amber-400")}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Someone else</span>
                </button>
              </div>
              {paidBy === "other" && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Who paid? You'll owe them this."
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    className={`${field} focus:border-amber-500`}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">
              Note
            </label>
            <input
              type="text"
              placeholder="e.g. dinner with friends"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={field}
            />
          </div>

          {error && (
            <div className="bg-rose-950/50 border border-rose-500/40 text-rose-300 px-3 py-2 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div className="pt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              {isEdit ? "Save changes" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
