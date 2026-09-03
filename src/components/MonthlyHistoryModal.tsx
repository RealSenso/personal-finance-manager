import React, { useState } from 'react';
import { X, History, TrendingUp, BarChart3, Calendar, Layers } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { Bucket, Transaction, UserIncomeProfile } from '../types';
import { formatCurrency, getBucketSpendForMonth } from '../lib/insights';

interface MonthlyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  transactions: Transaction[];
  incomeProfile: UserIncomeProfile;
  months: string[]; // e.g. ['2026-07', '2026-08', '2026-09']
}

export const MonthlyHistoryModal: React.FC<MonthlyHistoryModalProps> = ({
  isOpen,
  onClose,
  buckets,
  transactions,
  incomeProfile,
  months,
}) => {
  const [selectedBucketId, setSelectedBucketId] = useState<string>('all');

  if (!isOpen) return null;

  // Format month string (YYYY-MM -> Jul 2026)
  const formatMonthName = (mStr: string) => {
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  };

  const recurringBuckets = buckets.filter((b) => b.type === 'recurring' && !b.isArchived);

  // Prepare data for the monthly spend trend chart
  const chartData = months.map((m) => {
    const dataPoint: Record<string, any> = {
      month: formatMonthName(m),
      rawMonth: m,
    };

    let monthTotal = 0;
    recurringBuckets.forEach((b) => {
      const spend = getBucketSpendForMonth(b.id, transactions, m);
      dataPoint[b.name] = spend;
      monthTotal += spend;
    });

    dataPoint['Total Spent'] = monthTotal;
    return dataPoint;
  });

  // Calculate side-by-side monthly totals
  const totalIncome =
    incomeProfile.stipend +
    incomeProfile.extra +
    (incomeProfile.otherStreams || []).reduce((s, st) => s + st.amount, 0);

  const monthlySummaries = months.map((m) => {
    const monthExpenses = transactions.filter(
      (tx) => tx.type === 'expense' && tx.date.startsWith(m)
    );
    const monthDeposits = transactions.filter(
      (tx) => tx.type === 'savings_deposit' && tx.date.startsWith(m)
    );

    const totalSpent = monthExpenses.reduce((s, tx) => s + tx.amount, 0);
    const totalDeposited = monthDeposits.reduce((s, tx) => s + tx.amount, 0);
    const totalPlanned = buckets
      .filter((b) => !b.isArchived)
      .reduce((s, b) => s + b.plannedMonthly, 0);

    return {
      month: m,
      name: formatMonthName(m),
      totalIncome,
      totalPlanned,
      totalSpent,
      totalDeposited,
      netRemaining: totalIncome - totalSpent - totalDeposited,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                Monthly History & Spend Trends
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Side-by-side multi-month comparative audit & envelope trend trajectory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Trend Chart Section */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-zinc-200 tracking-tight">
                  Recurring Envelope Spend Trend
                </h4>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                Past 3 Months
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#27272a',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f4f4f5',
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  {recurringBuckets.map((b) => (
                    <Bar
                      key={b.id}
                      dataKey={b.name}
                      fill={b.color}
                      stackId="spend"
                      radius={[2, 2, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side-by-Side Monthly Summary Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 tracking-tight flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Side-by-Side Monthly Performance</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {monthlySummaries.map((summary) => (
                <div
                  key={summary.month}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-white font-mono">
                      {summary.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      ₹{summary.totalIncome.toLocaleString('en-IN')} Income
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Spent:</span>
                      <span className="text-zinc-200 font-semibold">
                        {formatCurrency(summary.totalSpent)}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Savings Deposited:</span>
                      <span className="text-emerald-400 font-semibold">
                        +{formatCurrency(summary.totalDeposited)}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800/80">
                      <span>Surplus / Retained:</span>
                      <span
                        className={`font-bold ${
                          summary.netRemaining >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(summary.netRemaining)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Envelope Breakdown Table Across Months */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 tracking-tight flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Per-Bucket Historical Spending Comparison</span>
            </h4>

            <div className="border border-zinc-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Envelope / Goal</th>
                    <th className="py-2.5 px-4 text-right">Planned / Mo</th>
                    {months.map((m) => (
                      <th key={m} className="py-2.5 px-4 text-right">
                        {formatMonthName(m)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {buckets
                    .filter((b) => !b.isArchived)
                    .map((bucket) => {
                      const isRecurring = bucket.type === 'recurring';
                      return (
                        <tr key={bucket.id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-zinc-200 flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: bucket.color }}
                            />
                            <span>{bucket.name}</span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              ({isRecurring ? 'Recurring' : 'Goal'})
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-zinc-400">
                            {formatCurrency(bucket.plannedMonthly)}
                          </td>
                          {months.map((m) => {
                            const val = isRecurring
                              ? getBucketSpendForMonth(bucket.id, transactions, m)
                              : transactions
                                  .filter(
                                    (t) =>
                                      t.bucketId === bucket.id &&
                                      t.type === 'savings_deposit' &&
                                      t.date.startsWith(m)
                                  )
                                  .reduce((s, t) => s + t.amount, 0);

                            const isOver = isRecurring && val > bucket.plannedMonthly;

                            return (
                              <td
                                key={m}
                                className={`py-2.5 px-4 text-right font-mono font-semibold ${
                                  isOver ? 'text-rose-400' : 'text-zinc-200'
                                }`}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end bg-zinc-950">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
