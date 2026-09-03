import React from "react";
import { PieChart } from "lucide-react";
import { Bucket, Transaction } from "../types";
import { formatCurrency } from "../lib/insights";

interface Props {
  buckets: Bucket[];
  transactions: Transaction[];
  currentMonth: string;
}

/** Where this month's spending actually went, envelope by envelope. */
export const SpendingBreakdown: React.FC<Props> = ({
  buckets,
  transactions,
  currentMonth,
}) => {
  const byId = new Map(buckets.map((b) => [b.id, b]));
  const totals = new Map<string, number>();
  let total = 0;
  for (const t of transactions) {
    if (t.type !== "expense" || !t.date.startsWith(currentMonth)) continue;
    totals.set(t.bucketId, (totals.get(t.bucketId) || 0) + t.amount);
    total += t.amount;
  }

  const rows = Array.from(totals.entries())
    .map(([id, amount]) => ({
      id,
      amount,
      name: byId.get(id)?.name || "Uncategorised",
      color: byId.get(id)?.color || "#9c8c6f",
    }))
    .sort((a, b) => b.amount - a.amount);

  const top = rows.slice(0, 5);
  const restAmount = rows.slice(5).reduce((s, r) => s + r.amount, 0);
  const max = rows[0]?.amount || 1;

  return (
    <div className="m-panel p-3 shrink-0">
      <div className="flex items-center justify-between">
        <span className="m-label text-emerald-300 flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5" />
          Where it went
        </span>
        <span className="text-xs font-mono text-zinc-400">
          {formatCurrency(total)}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] text-zinc-500 mt-2">
          No spending logged this month yet.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {top.map((r) => (
            <li key={r.id}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-300 truncate pr-2">{r.name}</span>
                <span className="font-mono text-zinc-400 shrink-0">
                  {formatCurrency(r.amount)} ·{" "}
                  {Math.round((r.amount / total) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, (r.amount / max) * 100)}%`,
                    backgroundColor: r.color,
                  }}
                />
              </div>
            </li>
          ))}
          {restAmount > 0 && (
            <li className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
              <span>+{rows.length - 5} more</span>
              <span className="font-mono">{formatCurrency(restAmount)}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
