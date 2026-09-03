import React from "react";
import { X, History, Calendar, Layers } from "lucide-react";
import { Bucket, Transaction, UserIncomeProfile } from "../types";
import { formatCurrency, getBucketSpendForMonth } from "../lib/insights";

interface MonthlyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  transactions: Transaction[];
  incomeProfile: UserIncomeProfile;
  months: string[];
}

const monthName = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  return new Date(y, mm - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const Row: React.FC<{ label: string; value: string; tone?: string }> = ({
  label,
  value,
  tone,
}) => (
  <div className="flex justify-between">
    <span className="text-zinc-400">{label}</span>
    <span className={tone || "text-zinc-200"}>{value}</span>
  </div>
);

export const MonthlyHistoryModal: React.FC<MonthlyHistoryModalProps> = ({
  isOpen,
  onClose,
  buckets,
  transactions,
  incomeProfile,
  months,
}) => {
  if (!isOpen) return null;

  const recurring = buckets.filter(
    (b) => b.type === "recurring" && !b.isArchived,
  );
  const cols = months.slice(0, 6);

  const totalIncome =
    incomeProfile.stipend +
    incomeProfile.extra +
    (incomeProfile.otherStreams || []).reduce((s, st) => s + st.amount, 0);

  const perMonth = cols.map((m) => {
    const parts = recurring.map((b) => ({
      name: b.name,
      color: b.color,
      value: getBucketSpendForMonth(b.id, transactions, m),
    }));
    return { m, parts, total: parts.reduce((s, p) => s + p.value, 0) };
  });
  const maxTotal = Math.max(1, ...perMonth.map((x) => x.total));

  const summaries = cols.map((m) => {
    const spent = transactions
      .filter((t) => t.type === "expense" && t.date.startsWith(m))
      .reduce((s, t) => s + t.amount, 0);
    const deposited = transactions
      .filter((t) => t.type === "savings_deposit" && t.date.startsWith(m))
      .reduce((s, t) => s + t.amount, 0);
    return { m, spent, deposited, net: totalIncome - spent - deposited };
  });

  const W = 520;
  const H = 190;
  const pad = { l: 8, r: 8, t: 8, b: 22 };
  const bw = 34;
  const step = (W - pad.l - pad.r) / Math.max(1, perMonth.length);
  const chartH = H - pad.t - pad.b;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="m-panel w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Monthly history
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="m-panel p-4 space-y-3">
            <span className="m-label text-emerald-300">
              Recurring spend, by month
            </span>
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full min-w-[420px]"
                role="img"
              >
                {[0.25, 0.5, 0.75, 1].map((f) => (
                  <line
                    key={f}
                    x1={pad.l}
                    x2={W - pad.r}
                    y1={pad.t + chartH * (1 - f)}
                    y2={pad.t + chartH * (1 - f)}
                    stroke="#e7ddc9"
                    strokeWidth={1}
                  />
                ))}
                {perMonth.map((col, i) => {
                  const x = pad.l + step * i + (step - bw) / 2;
                  let y = pad.t + chartH;
                  return (
                    <g key={col.m}>
                      {col.parts.map((p) => {
                        const h = (p.value / maxTotal) * chartH;
                        y -= h;
                        return h > 0.5 ? (
                          <rect
                            key={p.name}
                            x={x}
                            y={y}
                            width={bw}
                            height={h}
                            rx={2}
                            fill={p.color}
                            opacity={0.85}
                          />
                        ) : null;
                      })}
                      <text
                        x={x + bw / 2}
                        y={H - 8}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#7c6e54"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {monthName(col.m).split(" ")[0]}
                      </text>
                      <text
                        x={x + bw / 2}
                        y={pad.t + chartH - (col.total / maxTotal) * chartH - 4}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#5f5340"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {col.total ? `₹${Math.round(col.total / 1000)}k` : ""}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {recurring.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: b.color }}
                  />
                  {b.name}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="m-label text-cyan-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Month by month
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summaries.map((s) => (
                <div key={s.m} className="m-panel p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-semibold text-zinc-100 font-mono">
                      {monthName(s.m)}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      ₹{totalIncome.toLocaleString("en-IN")} in
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <Row label="Spent" value={formatCurrency(s.spent)} />
                    <Row
                      label="Saved"
                      value={`+${formatCurrency(s.deposited)}`}
                      tone="text-emerald-300"
                    />
                    <div className="flex justify-between pt-1 border-t border-zinc-800/80">
                      <span className="text-zinc-400">Retained</span>
                      <span
                        className={
                          s.net >= 0
                            ? "text-emerald-300 font-semibold"
                            : "text-rose-400 font-semibold"
                        }
                      >
                        {formatCurrency(s.net)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="m-label text-purple-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Per envelope
            </span>
            <div className="m-panel overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Envelope</th>
                    <th className="py-2.5 px-4 text-right">Planned</th>
                    {cols.map((m) => (
                      <th key={m} className="py-2.5 px-4 text-right">
                        {monthName(m)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {buckets
                    .filter((b) => !b.isArchived)
                    .map((bucket) => {
                      const isRecurring = bucket.type === "recurring";
                      return (
                        <tr key={bucket.id}>
                          <td className="py-2.5 px-4 font-medium text-zinc-200 flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: bucket.color }}
                            />
                            {bucket.name}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-zinc-400">
                            {formatCurrency(bucket.plannedMonthly)}
                          </td>
                          {cols.map((m) => {
                            const val = isRecurring
                              ? getBucketSpendForMonth(
                                  bucket.id,
                                  transactions,
                                  m,
                                )
                              : transactions
                                  .filter(
                                    (t) =>
                                      t.bucketId === bucket.id &&
                                      t.type === "savings_deposit" &&
                                      t.date.startsWith(m),
                                  )
                                  .reduce((s, t) => s + t.amount, 0);
                            const over =
                              isRecurring && val > bucket.plannedMonthly;
                            return (
                              <td
                                key={m}
                                className={`py-2.5 px-4 text-right font-mono ${over ? "text-rose-400 font-semibold" : "text-zinc-200"}`}
                              >
                                {formatCurrency(val)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
