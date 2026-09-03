import { Bucket, Transaction, UserIncomeProfile } from '../types';
import { getDaysInMonth } from './insights';

export interface DailyExpenseAllowance {
  currentDay: number;
  totalDaysInMonth: number;
  daysElapsed: number;
  remainingDays: number; // includes today

  // Monthly cash model — income minus, in order:
  //   1. savingsReserve   (savings rate % of income — general savings)
  //   2. goalCommitments  (scheduled deposits into savings goals this month)
  //   3. fixedCommitments (fixed bills: subscriptions, rent, recharge)
  //   = monthlySpendable  (everything left is day-to-day spending)
  totalIncome: number;
  savingsRatePercent: number;
  savingsReserve: number;
  goalCommitments: number;
  fixedCommitments: number;
  totalReserved: number;       // savingsReserve + goalCommitments + fixedCommitments
  monthlySpendable: number;
  baselineDaily: number;       // steady-state target = monthlySpendable / days in month

  // Discretionary spend so far
  flexSpent: number;           // month-to-date expenses in non-fixed buckets
  remainingSpendable: number;  // monthlySpendable - flexSpent
  safeDailyAllowance: number;  // remainingSpendable / remainingDays (adapts to your pace)

  todayDateStr: string;
  todaySpent: number;
  todayRemaining: number;
  todayStatus: 'under_budget' | 'at_limit' | 'exceeded';

  // The "human" bit: money you saved by underspending, ready to move to goals
  underspendPool: number;
  paceStatus: 'ahead' | 'on_track' | 'behind';

  // Per non-fixed envelope
  bucketAllowances: {
    bucketId: string;
    bucketName: string;
    color: string;
    planned: number;
    spent: number;
    remaining: number;
    dailyAllowance: number;
  }[];
}

export function calculateDailyAllowance(
  buckets: Bucket[],
  transactions: Transaction[],
  incomeProfile: UserIncomeProfile,
  currentMonth: string, // YYYY-MM
  now: Date = new Date()
): DailyExpenseAllowance {
  const [year, month] = currentMonth.split('-').map(Number);
  const totalDaysInMonth = getDaysInMonth(year, month - 1);

  const isSelectedMonth = now.getFullYear() === year && now.getMonth() === month - 1;
  const isPastMonth =
    year < now.getFullYear() ||
    (year === now.getFullYear() && month - 1 < now.getMonth());

  const currentDay = isSelectedMonth
    ? Math.min(now.getDate(), totalDaysInMonth)
    : isPastMonth
      ? totalDaysInMonth
      : 1; // future month not started yet

  const daysElapsed = Math.max(1, currentDay);
  const remainingDays = Math.max(1, totalDaysInMonth - currentDay + 1);

  const todayDateStr = isSelectedMonth
    ? `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
    : `${year}-${String(month).padStart(2, '0')}-01`;

  // --- Income & the amount reserved for goals ---
  const totalIncome =
    incomeProfile.stipend +
    incomeProfile.extra +
    (incomeProfile.otherStreams || []).reduce((s, st) => s + st.amount, 0);

  const savingsRatePercent = Math.min(90, Math.max(0, incomeProfile.savingsRatePercent ?? 25));
  const savingsReserve = Math.round((totalIncome * savingsRatePercent) / 100);

  // --- Scheduled goal deposits (planned, or more if already deposited this month) ---
  const savingsGoals = buckets.filter((b) => b.type === 'savings_goal' && !b.isArchived);
  const goalDepositsPlanned = savingsGoals.reduce((s, b) => s + b.plannedMonthly, 0);
  const goalDepositsActual = transactions
    .filter((tx) => tx.type === 'savings_deposit' && tx.date.startsWith(currentMonth))
    .reduce((s, tx) => s + tx.amount, 0);
  const goalCommitments = Math.max(goalDepositsPlanned, goalDepositsActual);

  // --- Fixed bills vs flexible envelopes ---
  const recurring = buckets.filter((b) => b.type === 'recurring' && !b.isArchived);
  const fixedIds = new Set(recurring.filter((b) => b.isFixed).map((b) => b.id));
  const flexBuckets = recurring.filter((b) => !b.isFixed);

  const monthExpenses = transactions.filter(
    (tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth)
  );

  const fixedPlanned = recurring
    .filter((b) => b.isFixed)
    .reduce((s, b) => s + b.plannedMonthly, 0);
  const fixedSpent = monthExpenses
    .filter((tx) => fixedIds.has(tx.bucketId))
    .reduce((s, tx) => s + tx.amount, 0);
  const fixedCommitments = Math.max(fixedPlanned, fixedSpent);

  // Every expense that isn't a fixed bill counts as day-to-day / discretionary.
  const flexExpenses = monthExpenses.filter((tx) => !fixedIds.has(tx.bucketId));
  const flexSpent = flexExpenses.reduce((s, tx) => s + tx.amount, 0);

  // --- The budget: income, minus savings, minus goal deposits, minus fixed bills ---
  const totalReserved = savingsReserve + goalCommitments + fixedCommitments;
  const monthlySpendable = Math.max(0, totalIncome - totalReserved);
  const baselineDaily = Math.round(monthlySpendable / totalDaysInMonth);
  const remainingSpendable = Math.max(0, monthlySpendable - flexSpent);
  const safeDailyAllowance = Math.round(remainingSpendable / remainingDays);

  const todaySpent = flexExpenses
    .filter((tx) => tx.date === todayDateStr)
    .reduce((s, tx) => s + tx.amount, 0);
  const todayRemaining = safeDailyAllowance - todaySpent;

  let todayStatus: DailyExpenseAllowance['todayStatus'] = 'under_budget';
  if (todaySpent > safeDailyAllowance) todayStatus = 'exceeded';
  else if (todayRemaining <= 50) todayStatus = 'at_limit';

  // --- Underspend pool: how far ahead of the steady pace you are right now ---
  const expectedByNow = baselineDaily * daysElapsed;
  const underspendPool = Math.max(0, Math.round(expectedByNow - flexSpent));
  let paceStatus: DailyExpenseAllowance['paceStatus'] = 'on_track';
  if (flexSpent > expectedByNow * 1.1) paceStatus = 'behind';
  else if (flexSpent < expectedByNow * 0.9) paceStatus = 'ahead';

  const bucketAllowances = flexBuckets.map((bucket) => {
    const spent = flexExpenses
      .filter((tx) => tx.bucketId === bucket.id)
      .reduce((s, tx) => s + tx.amount, 0);
    const remaining = Math.max(0, bucket.plannedMonthly - spent);
    return {
      bucketId: bucket.id,
      bucketName: bucket.name,
      color: bucket.color,
      planned: bucket.plannedMonthly,
      spent,
      remaining,
      dailyAllowance: Math.round(remaining / remainingDays),
    };
  });

  return {
    currentDay,
    totalDaysInMonth,
    daysElapsed,
    remainingDays,
    totalIncome,
    savingsRatePercent,
    savingsReserve,
    goalCommitments,
    fixedCommitments,
    totalReserved,
    monthlySpendable,
    baselineDaily,
    flexSpent,
    remainingSpendable,
    safeDailyAllowance,
    todayDateStr,
    todaySpent,
    todayRemaining,
    todayStatus,
    underspendPool,
    paceStatus,
    bucketAllowances,
  };
}

// What-if: if I spend X more today, what does tomorrow's safe allowance become?
export function simulateTomorrowAllowance(
  remainingSpendable: number,
  remainingDaysIncludingToday: number,
  hypotheticalSpendToday: number
): { newAllowanceTomorrow: number; difference: number } {
  const currentDaily = Math.round(
    remainingSpendable / Math.max(1, remainingDaysIncludingToday)
  );
  const daysTomorrow = Math.max(1, remainingDaysIncludingToday - 1);
  const remainingAfterSpend = Math.max(0, remainingSpendable - hypotheticalSpendToday);
  const newAllowanceTomorrow = Math.round(remainingAfterSpend / daysTomorrow);
  return { newAllowanceTomorrow, difference: newAllowanceTomorrow - currentDaily };
}
