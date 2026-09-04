import React, { useState } from "react";
import { Pencil, Wallet, Target, Flame, PiggyBank } from "lucide-react";
import { Bucket, Transaction, UserIncomeProfile } from "../types";
import { formatCurrency } from "../lib/insights";
import type { DailyExpenseAllowance } from "../lib/dailyAllowance";

interface DashboardStatsProps {
  incomeProfile: UserIncomeProfile;
  allowance: DailyExpenseAllowance;
  buckets: Bucket[];
  transactions: Transaction[];
  currentMonth: string;
  onUpdateIncome: (p: UserIncomeProfile) => void;
}

const Plate: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: string;
  sub?: string;
  foot?: React.ReactNode;
  tone?: "blue" | "rose" | "cyan";
}> = ({ label, icon, value, sub, foot, tone = "blue" }) => {
  const bar =
    tone === "rose"
      ? "from-rose-500"
      : tone === "cyan"
        ? "from-cyan-400"
        : "from-emerald-500";
  return (
    <div className="m-panel relative overflow-hidden bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 hover:border-emerald-500/40 transition-colors">
      <div
        className={`absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b ${bar} to-transparent`}
      />
      <div className="flex items-center justify-between">
        <span className="m-label flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </div>
      <div className="mt-1.5 font-display text-2xl font-bold text-zinc-100 tracking-tight tabular-nums">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{sub}</div>
      )}
      {foot && (
        <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
          {foot}
        </div>
      )}
    </div>
  );
};

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  incomeProfile,
  allowance: da,
  buckets,
  transactions,
  currentMonth,
  onUpdateIncome,
}) => {
  const [editing, setEditing] = useState(false);
  const [stipendInput, setStipendInput] = useState(
    incomeProfile.stipend.toString(),
  );
  const [extraInput, setExtraInput] = useState(incomeProfile.extra.toString());
  const [rateInput, setRateInput] = useState(
    (incomeProfile.savingsRatePercent ?? 25).toString(),
  );

  const totalIncome =
    incomeProfile.stipend +
    incomeProfile.extra +
    (incomeProfile.otherStreams || []).reduce((s, st) => s + st.amount, 0);

  const totalSpent = transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(currentMonth))
    .reduce((s, t) => s + t.amount, 0);

  const goals = buckets.filter(
    (b) => b.type === "savings_goal" && !b.isArchived,
  );
  const saved = goals.reduce((s, b) => s + b.currentBalance, 0);
  const target = goals.reduce((s, b) => s + (b.targetAmount || 0), 0);
  const savedPct = target > 0 ? Math.round((saved / target) * 100) : 0;
  const depositedThisMonth = transactions
    .filter(
      (t) => t.type === "savings_deposit" && t.date.startsWith(currentMonth),
    )
    .reduce((s, t) => s + t.amount, 0);

  const saveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateIncome({
      ...incomeProfile,
      stipend: parseFloat(stipendInput) || 0,
      extra: parseFloat(extraInput) || 0,
      savingsRatePercent: Math.min(90, Math.max(0, parseFloat(rateInput) || 0)),
    });
    setEditing(false);
  };

  return (
    <div className="m-panel p-3 flex flex-col lg:min-h-0 lg:flex-1">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="m-label text-emerald-300">Overview</span>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-zinc-500 hover:text-emerald-400 p-1 rounded transition-colors cursor-pointer"
          title="Edit income & savings rate"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="lg:m-scroll lg:pr-1 flex flex-col gap-3">
        <div className="relative">
          <Plate
            label="Monthly Income"
            icon={<Wallet className="w-3 h-3" />}
            value={formatCurrency(totalIncome)}
            sub={`₹${incomeProfile.stipend.toLocaleString("en-IN")} + ₹${incomeProfile.extra.toLocaleString("en-IN")}`}
            foot={
              <>
                <span>Savings rate</span>
                <span className="font-mono text-emerald-300">
                  {da.savingsRatePercent}%
                </span>
              </>
            }
          />
          {editing && (
            <div className="absolute top-2 left-2 right-2 z-30 bg-zinc-950 border border-emerald-500/40 rounded-xl p-3.5 shadow-2xl">
              <form onSubmit={saveIncome} className="space-y-2.5">
                <div className="m-label text-emerald-400">Adjust</div>
                {[
                  ["Stipend (₹)", stipendInput, setStipendInput],
                  ["Extra / Freelance (₹)", extraInput, setExtraInput],
                  ["Savings rate (%)", rateInput, setRateInput],
                ].map(([lbl, val, set]) => (
                  <div key={lbl as string}>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      {lbl as string}
                    </label>
                    <input
                      type="number"
                      value={val as string}
                      onChange={(e) =>
                        (set as (v: string) => void)(e.target.value)
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded text-xs"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <Plate
          label="Spendable / Month"
          icon={<Target className="w-3 h-3" />}
          value={formatCurrency(da.monthlySpendable)}
          sub={`${formatCurrency(da.remainingSpendable)} left · ${formatCurrency(da.flexSpent)} spent`}
          foot={
            <>
              <span
                title={`${formatCurrency(da.savingsReserve)} savings + ${formatCurrency(da.goalCommitments)} goals + ${formatCurrency(da.fixedCommitments)} bills`}
              >
                Reserved
              </span>
              <span className="font-mono text-indigo-400">
                {formatCurrency(da.totalReserved)}
              </span>
            </>
          }
        />

        <Plate
          label="Total Spent"
          icon={<Flame className="w-3 h-3" />}
          tone="rose"
          value={formatCurrency(totalSpent)}
          sub={`${formatCurrency(da.fixedCommitments)} fixed committed`}
          foot={
            <>
              <span>Safe / day</span>
              <span className="font-mono text-emerald-300">
                {formatCurrency(da.safeDailyAllowance)}
              </span>
            </>
          }
        />

        <Plate
          label="Saved / Goals"
          icon={<PiggyBank className="w-3 h-3" />}
          tone="cyan"
          value={formatCurrency(saved)}
          sub={`${savedPct}% of ${formatCurrency(target)}`}
          foot={
            <>
              <span>This month</span>
              <span className="font-mono text-cyan-400">
                +{formatCurrency(depositedThisMonth)}
              </span>
            </>
          }
        />

      </div>
    </div>
  );
};
