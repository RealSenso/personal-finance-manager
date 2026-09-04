import React, { useState } from "react";
import {
  Receipt,
  Search,
  Trash2,
  Pencil,
  HandCoins,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  ArrowRight,
} from "lucide-react";
import { Bucket, Transaction, UserIncomeProfile, Investment } from "../types";
import { formatCurrency } from "../lib/insights";
import { calculateDailyAllowance } from "../lib/dailyAllowance";
import { normalize } from "../lib/investments";

interface TransactionListProps {
  transactions: Transaction[];
  buckets: Bucket[];
  incomeProfile: UserIncomeProfile;
  investments: Investment[];
  currentMonth: string;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onSweepToGoals: (amount: number, date: string) => void;
  onStageInvestment: (id: string, amount: number, date: string) => void;
  onUnstageInvestment: (id: string, entryId: string) => void;
  onOpenInvestments: () => void;
}

const MF_DAILY_CAP = 100;

type Scope = "day" | "month" | "all";

// Local-calendar YYYY-MM-DD (timezone-safe — no UTC round-trip).
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
const parseLocal = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const todayIso = () => iso(new Date());
const addDays = (s: string, n: number) => {
  const d = parseLocal(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const dayLabel = (d: string) => {
  const base = parseLocal(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (d === todayIso()) return `Today · ${base}`;
  if (d === addDays(todayIso(), -1)) return `Yesterday · ${base}`;
  return base;
};

const monthLabel = (m: string) => {
  const [y, mm] = m.split("-").map(Number);
  return new Date(y, mm - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

type LedgerEntry =
  | { kind: "tx"; date: string; sort: string; tx: Transaction }
  | {
      kind: "stage" | "buy" | "redeem";
      date: string;
      sort: string;
      fundId: string;
      fundName: string;
      entryId: string;
      amount: number;
    };

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  buckets,
  incomeProfile,
  investments,
  currentMonth,
  onDeleteTransaction,
  onEditTransaction,
  onSweepToGoals,
  onStageInvestment,
  onUnstageInvestment,
  onOpenInvestments,
}) => {
  const [scope, setScope] = useState<Scope>("month");
  const [day, setDay] = useState(todayIso());
  const [query, setQuery] = useState("");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [mfInput, setMfInput] = useState("");
  const [mfFundId, setMfFundId] = useState("");

  const byId = new Map(buckets.map((b) => [b.id, b]));

  const stepDay = (n: number) => setDay(addDays(day, n));

  // Day-view manual sweep: this day's discretionary spend vs the steady daily
  // budget for its month; the leftover can be pushed into savings goals.
  const fixedIds = new Set(
    buckets.filter((b) => b.type === "recurring" && b.isFixed).map((b) => b.id),
  );
  const dayBudget = calculateDailyAllowance(
    buckets,
    transactions,
    incomeProfile,
    day.slice(0, 7),
    parseLocal(day),
  ).baselineDaily;
  const daySpent = transactions
    .filter(
      (t) =>
        t.type === "expense" && t.date === day && !fixedIds.has(t.bucketId),
    )
    .reduce((s, t) => s + t.amount, 0);
  const daySwept = transactions
    .filter(
      (t) =>
        t.type === "savings_deposit" &&
        t.merchant === "Auto Sweep" &&
        t.date === day,
    )
    .reduce((s, t) => s + t.amount, 0);

  // Split-sweep: optionally divert a small fixed amount into a mutual fund
  // (capped per day), the rest goes to savings goals.
  const funds = investments.map(normalize);
  const mfToday = funds
    .flatMap((f) => f.staged || [])
    .filter((c) => c.date === day)
    .reduce((s, c) => s + c.amount, 0);

  const dayLeftover = Math.max(
    0,
    Math.round(dayBudget - daySpent - daySwept - mfToday),
  );
  const openGoals = buckets.some(
    (b) =>
      b.type === "savings_goal" &&
      !b.isArchived &&
      b.currentBalance < (b.targetAmount || 0),
  );
  const mfCap = Math.max(0, Math.min(MF_DAILY_CAP - mfToday, dayLeftover));
  const activeFundId = mfFundId || funds[0]?.id || "";
  const mfAmt = Math.max(
    0,
    Math.min(mfCap, Math.round(parseFloat(mfInput || "0") || 0)),
  );
  const goalsAmt = Math.max(0, dayLeftover - mfAmt);

  const doSweep = () => {
    if (mfAmt > 0 && activeFundId) onStageInvestment(activeFundId, mfAmt, day);
    if (goalsAmt > 0) onSweepToGoals(goalsAmt, day);
    setMfInput("");
  };

  // The ledger and the investment ledger, shown together.
  const q = query.toLowerCase();
  const inScope = (d: string) =>
    scope === "day"
      ? d === day
      : scope === "month"
        ? d.startsWith(currentMonth)
        : true;

  const txEntries: LedgerEntry[] = transactions
    .filter((t) => {
      if (!inScope(t.date)) return false;
      if (bucketFilter !== "all" && t.bucketId !== bucketFilter) return false;
      if (query && scope !== "day") {
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
    .map((t) => ({
      kind: "tx" as const,
      date: t.date,
      sort: t.createdAt || t.id,
      tx: t,
    }));

  const invEntries: LedgerEntry[] =
    bucketFilter !== "all"
      ? []
      : funds.flatMap((f) => {
          if (query && !f.name.toLowerCase().includes(q)) return [];
          const mk = (kind: "stage" | "buy" | "redeem") => (e: {
            id: string;
            amount: number;
            date: string;
          }) => ({
            kind,
            date: e.date,
            sort: e.id,
            fundId: f.id,
            fundName: f.name,
            entryId: e.id,
            amount: e.amount,
          });
          return [
            ...(f.staged || []).map(mk("stage")),
            ...(f.lots || []).map(mk("buy")),
            ...(f.withdrawals || []).map(mk("redeem")),
          ].filter((e) => inScope(e.date));
        });

  const entries = [...txEntries, ...invEntries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.sort.localeCompare(a.sort),
  );

  const groups: { date: string; items: LedgerEntry[] }[] = [];
  for (const e of entries) {
    const g = groups[groups.length - 1];
    if (g && g.date === e.date) g.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }

  const field =
    "bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-emerald-500";
  const scopeBtn = (s: Scope, label: string) => (
    <button
      key={s}
      onClick={() => setScope(s)}
      className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
        scope === s
          ? "bg-emerald-500 text-zinc-950"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="m-panel p-3.5 flex flex-col lg:flex-1 lg:min-h-0">
      {/* Header + view controls */}
      <div className="shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="m-label text-emerald-300 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" />
            Ledger ({entries.length})
          </span>
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
            {scopeBtn("day", "Day")}
            {scopeBtn("month", "Month")}
            {scopeBtn("all", "All")}
          </div>
        </div>

        {scope === "day" ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => stepDay(-1)}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Previous day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={day}
                max={todayIso()}
                onChange={(e) => e.target.value && setDay(e.target.value)}
                className={`${field} flex-1 px-2.5 py-1.5 font-mono text-center`}
              />
              <button
                onClick={() => stepDay(1)}
                disabled={day >= todayIso()}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                title="Next day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {day !== todayIso() && (
                <button
                  onClick={() => setDay(todayIso())}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Today
                </button>
              )}
            </div>

            {/* This day's leftover → goals (and optionally a small MF buy) */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">
                  Spent{" "}
                  <span className="font-mono text-zinc-200">
                    {formatCurrency(daySpent)}
                  </span>{" "}
                  of {formatCurrency(Math.round(dayBudget))}/day
                  {daySwept > 0 && (
                    <span className="text-emerald-300">
                      {" "}
                      · {formatCurrency(daySwept)} → goals
                    </span>
                  )}
                  {mfToday > 0 && (
                    <span className="text-indigo-400">
                      {" "}
                      · {formatCurrency(mfToday)} → MF
                    </span>
                  )}
                </span>
                {!(dayLeftover >= 1 && (openGoals || funds.length > 0)) && (
                  <span className="text-[11px] text-zinc-500">
                    {dayLeftover < 1 ? "no leftover" : "nowhere to sweep"}
                  </span>
                )}
              </div>

              {dayLeftover >= 1 && (openGoals || funds.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  {funds.length > 0 && mfCap > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <span>MF</span>
                      <span className="text-zinc-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        max={mfCap}
                        step="1"
                        placeholder="0"
                        value={mfInput}
                        onChange={(e) => setMfInput(e.target.value)}
                        className="w-12 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setMfInput(String(mfCap))}
                        className="text-emerald-300 hover:text-emerald-400"
                        title={`Max ₹${mfCap} today`}
                      >
                        max
                      </button>
                      {funds.length > 1 && (
                        <select
                          value={activeFundId}
                          onChange={(e) => setMfFundId(e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-[11px] text-zinc-300 max-w-[6rem]"
                        >
                          {funds.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={doSweep}
                    className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-1 text-[11px] font-semibold hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <PiggyBank className="w-3 h-3" />
                    {mfAmt > 0
                      ? `Sweep ${formatCurrency(goalsAmt)}→goals · ${formatCurrency(mfAmt)}→MF`
                      : `Sweep ${formatCurrency(dayLeftover)}`}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  scope === "month"
                    ? `Search ${monthLabel(currentMonth)}…`
                    : "Search all…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${field} w-full pl-8 pr-3 py-1.5`}
              />
            </div>
            <select
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value)}
              aria-label="Filter by envelope"
              className={`${field} px-2.5 py-1.5 cursor-pointer max-w-[7rem]`}
            >
              <option value="all">All</option>
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Rows — grouped by day, vertical scroll only */}
      <div className="mt-3 lg:flex-1 lg:min-h-0 lg:m-scroll lg:pr-1">
        {groups.length === 0 ? (
          <p className="py-10 text-center text-zinc-500 text-xs">
            {scope === "day" ? "Nothing on this day." : "Nothing here yet."}
          </p>
        ) : (
          groups.map((g) => {
            const spent = g.items
              .filter((e) => e.kind === "tx" && e.tx.type === "expense")
              .reduce((s, e) => s + (e.kind === "tx" ? e.tx.amount : 0), 0);
            const saved = g.items
              .filter((e) => e.kind === "tx" && e.tx.type === "savings_deposit")
              .reduce((s, e) => s + (e.kind === "tx" ? e.tx.amount : 0), 0);
            const mf = g.items
              .filter((e) => e.kind === "stage")
              .reduce((s, e) => s + (e.kind === "stage" ? e.amount : 0), 0);
            return (
              <div key={g.date}>
                <div className="lg:sticky lg:top-0 z-10 bg-zinc-900 flex items-center justify-between py-1.5 border-b border-zinc-800">
                  <span className="text-[11px] font-semibold text-zinc-300">
                    {dayLabel(g.date)}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400 flex gap-1.5">
                    {spent > 0 && <span>−{formatCurrency(spent)}</span>}
                    {saved > 0 && (
                      <span className="text-emerald-300">
                        +{formatCurrency(saved)}
                      </span>
                    )}
                    {mf > 0 && (
                      <span className="text-indigo-400">
                        {formatCurrency(mf)}→MF
                      </span>
                    )}
                  </span>
                </div>
                <ul className="divide-y divide-zinc-800/70">
                  {g.items.map((e) => {
                    if (e.kind !== "tx") {
                      const label =
                        e.kind === "stage"
                          ? "Set aside → "
                          : e.kind === "buy"
                            ? "Bought into "
                            : "Redeemed from ";
                      const amtTone =
                        e.kind === "redeem"
                          ? "text-emerald-300"
                          : "text-indigo-400";
                      const sign = e.kind === "redeem" ? "+" : "−";
                      return (
                        <li
                          key={e.entryId}
                          className="group flex items-center gap-3 py-2.5 hover:bg-zinc-800/30 -mx-1.5 px-1.5 rounded-lg transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-zinc-300 truncate block">
                              {label}
                              <span className="text-zinc-200">{e.fundName}</span>
                            </span>
                            <span className="text-[10px] text-indigo-400/80">
                              investments
                            </span>
                          </div>
                          <span
                            className={`font-mono text-xs font-semibold shrink-0 tabular-nums ${
                              e.kind === "buy" ? "text-zinc-400" : amtTone
                            }`}
                          >
                            {e.kind === "buy" ? "" : sign}
                            {formatCurrency(e.amount)}
                          </span>
                          <div className="shrink-0 flex items-center gap-0.5 opacity-70 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {e.kind === "stage" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onUnstageInvestment(e.fundId, e.entryId)
                                }
                                className="text-zinc-400 hover:text-rose-400 p-1 rounded cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={onOpenInvestments}
                                className="text-zinc-400 hover:text-emerald-300 p-1 rounded cursor-pointer"
                                title="Open investments"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    }
                    const tx = e.tx;
                    const bucket = byId.get(tx.bucketId);
                    const expense = tx.type === "expense";
                    return (
                      <li
                        key={tx.id}
                        className="group flex items-center gap-3 py-2.5 hover:bg-zinc-800/30 -mx-1.5 px-1.5 rounded-lg transition-colors"
                      >
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

                        <div className="shrink-0 flex items-center gap-0.5 opacity-70 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
