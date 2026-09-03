import React, { useState } from "react";
import { Receipt, Search, Trash2, Pencil, HandCoins } from "lucide-react";
import { Bucket, Transaction } from "../types";
import { formatCurrency } from "../lib/insights";

interface TransactionListProps {
  transactions: Transaction[];
  buckets: Bucket[];
  currentMonth: string;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  buckets,
  currentMonth,
  onDeleteTransaction,
  onEditTransaction,
}) => {
  const [query, setQuery] = useState("");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [monthOnly, setMonthOnly] = useState(true);

  const byId = new Map(buckets.map((b) => [b.id, b]));

  const rows = transactions
    .filter((t) => {
      if (monthOnly && !t.date.startsWith(currentMonth)) return false;
      if (bucketFilter !== "all" && t.bucketId !== bucketFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const name = byId.get(t.bucketId)?.name.toLowerCase() || "";
        if (
          !(t.note || "").toLowerCase().includes(q) &&
          !(t.merchant || "").toLowerCase().includes(q) &&
          !name.includes(q)
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const field =
    "bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-emerald-500";

  return (
    <div className="m-panel p-3.5 flex flex-col lg:flex-1 lg:min-h-0">
      {/* Header + filters */}
      <div className="shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="m-label text-emerald-300 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" />
            Ledger ({rows.length})
          </span>
          <button
            onClick={() => setMonthOnly((v) => !v)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
              monthOnly
                ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {monthOnly ? "This month" : "All time"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${field} w-full pl-8 pr-3 py-1.5`}
            />
          </div>
          <select
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value)}
            aria-label="Filter by envelope"
            className={`${field} px-2.5 py-1.5 cursor-pointer max-w-[8rem]`}
          >
            <option value="all">All</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rows — vertical scroll only, no horizontal scroll */}
      <ul className="mt-3 lg:flex-1 lg:min-h-0 lg:m-scroll divide-y divide-zinc-800/70 lg:pr-1">
        {rows.length === 0 ? (
          <li className="py-10 text-center text-zinc-500 text-xs">
            Nothing here yet.
          </li>
        ) : (
          rows.map((tx) => {
            const bucket = byId.get(tx.bucketId);
            const expense = tx.type === "expense";
            return (
              <li
                key={tx.id}
                className="group flex items-center gap-3 py-2.5 hover:bg-zinc-800/30 -mx-1.5 px-1.5 rounded-lg transition-colors"
              >
                <span className="font-mono text-[11px] text-zinc-500 w-12 shrink-0">
                  {tx.date.slice(5)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-zinc-200 truncate">
                      {tx.note || tx.merchant || "Untitled"}
                    </span>
                    {tx.paidBy === "other" && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          tx.settled
                            ? "bg-zinc-800 text-zinc-400 border-zinc-700/60"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                        }`}
                        title={
                          tx.settled
                            ? `Repaid to ${tx.counterparty || "someone"}`
                            : `You owe ${tx.counterparty || "someone"}`
                        }
                      >
                        <HandCoins className="w-2.5 h-2.5" />
                        {tx.settled
                          ? "Repaid"
                          : `Owe ${tx.counterparty || ""}`.trim()}
                      </span>
                    )}
                  </div>
                  {bucket && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] mt-0.5"
                      style={{ color: bucket.color }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: bucket.color }}
                      />
                      {bucket.name}
                    </span>
                  )}
                </div>

                <span
                  className={`font-mono text-xs font-semibold shrink-0 tabular-nums ${
                    expense ? "text-zinc-200" : "text-emerald-300"
                  }`}
                >
                  {expense ? "−" : "+"}
                  {formatCurrency(tx.amount)}
                </span>

                <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    className="text-zinc-400 hover:text-emerald-300 p-1 rounded cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTransaction(tx.id)}
                    className="text-zinc-400 hover:text-rose-400 p-1 rounded cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};
