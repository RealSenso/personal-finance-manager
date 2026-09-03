import { Bucket, Transaction } from '../types';
import { getDaysInMonth } from './insights';

export interface DailyExpenseAllowance {
  currentDay: number;
  totalDaysInMonth: number;
  remainingDays: number; // Includes today
  
  // Total Recurring Envelopes
  totalRecurringBudget: number;
  totalSpentThisMonth: number;
  remainingBudget: number;
  safeDailyAllowance: number; // Safe spend per day for remaining days

  // Today's Activity
  todayDateStr: string;
  todaySpent: number;
  todayRemaining: number; // safeDailyAllowance - todaySpent
  todayStatus: 'under_budget' | 'at_limit' | 'exceeded';

  // Discretionary / Flexible (Fun Fund + Buffer + Daily miscellaneous)
  flexibleBudget: number;
  flexibleSpent: number;
  flexibleRemaining: number;
  flexibleDailyAllowance: number;

  // Breakdown by recurring bucket
  bucketAllowances: {
    bucketId: string;
    bucketName: string;
    color: string;
    planned: number;
    spent: number;
    remaining: number;
    dailyAllowance: number;
  }[];

  // Burn rate comparison
  avgDailySpentSoFar: number;
  burnPacing: 'thrifty' | 'on_track' | 'accelerated';
}

export function calculateDailyAllowance(
  buckets: Bucket[],
  transactions: Transaction[],
  currentMonth: string, // YYYY-MM
  simulatedDate: Date = new Date(2026, 8, 3) // Default to app date Sep 3, 2026
): DailyExpenseAllowance {
  const [year, month] = currentMonth.split('-').map(Number);
  const totalDaysInMonth = getDaysInMonth(year, month - 1);

  // Check if simulated date matches the selected month
  const isSelectedMonth =
    simulatedDate.getFullYear() === year && simulatedDate.getMonth() === month - 1;

  const currentDay = isSelectedMonth
    ? Math.min(simulatedDate.getDate(), totalDaysInMonth)
    : totalDaysInMonth; // If viewing past month, treat as end of month

  const remainingDays = Math.max(1, totalDaysInMonth - currentDay + 1);

  // Today date string YYYY-MM-DD
  const todayDateStr = isSelectedMonth
    ? `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
    : `${year}-${String(month).padStart(2, '0')}-01`;

  // Filter recurring buckets
  const recurringBuckets = buckets.filter((b) => b.type === 'recurring' && !b.isArchived);
  const totalRecurringBudget = recurringBuckets.reduce((sum, b) => sum + b.plannedMonthly, 0);

  // Month-to-date expenses
  const monthExpenses = transactions.filter(
    (tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth)
  );
  const totalSpentThisMonth = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const remainingBudget = Math.max(0, totalRecurringBudget - totalSpentThisMonth);

  // Safe daily allowance
  const safeDailyAllowance = Math.round(remainingBudget / remainingDays);

  // Today's specific expenses
  const todayExpenses = monthExpenses.filter((tx) => tx.date === todayDateStr);
  const todaySpent = todayExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const todayRemaining = safeDailyAllowance - todaySpent;

  let todayStatus: 'under_budget' | 'at_limit' | 'exceeded' = 'under_budget';
  if (todaySpent > safeDailyAllowance) {
    todayStatus = 'exceeded';
  } else if (todaySpent === safeDailyAllowance || todayRemaining <= 50) {
    todayStatus = 'at_limit';
  }

  // Flexible / Discretionary buckets (e.g. Fun Fund, Buffer, Food, Entertainment)
  const flexibleBuckets = recurringBuckets.filter((b) => {
    const lowerName = b.name.toLowerCase();
    const lowerCat = (b.category || '').toLowerCase();
    return (
      lowerName.includes('fun') ||
      lowerName.includes('buffer') ||
      lowerName.includes('misc') ||
      lowerCat.includes('leisure') ||
      lowerCat.includes('flexible') ||
      lowerCat.includes('general')
    );
  });

  const targetFlexibles = flexibleBuckets.length > 0 ? flexibleBuckets : recurringBuckets;
  const flexibleBudget = targetFlexibles.reduce((sum, b) => sum + b.plannedMonthly, 0);
  const flexibleSpent = targetFlexibles.reduce((sum, b) => {
    const bSpent = monthExpenses
      .filter((tx) => tx.bucketId === b.id)
      .reduce((s, tx) => s + tx.amount, 0);
    return sum + bSpent;
  }, 0);
  const flexibleRemaining = Math.max(0, flexibleBudget - flexibleSpent);
  const flexibleDailyAllowance = Math.round(flexibleRemaining / remainingDays);

  // Per-envelope daily allowance
  const bucketAllowances = recurringBuckets.map((bucket) => {
    const spent = monthExpenses
      .filter((tx) => tx.bucketId === bucket.id)
      .reduce((s, tx) => s + tx.amount, 0);
    const remaining = Math.max(0, bucket.plannedMonthly - spent);
    const dailyAllowance = Math.round(remaining / remainingDays);
    return {
      bucketId: bucket.id,
      bucketName: bucket.name,
      color: bucket.color,
      planned: bucket.plannedMonthly,
      spent,
      remaining,
      dailyAllowance,
    };
  });

  // Average daily spent so far
  const daysElapsed = Math.max(1, currentDay);
  const avgDailySpentSoFar = Math.round(totalSpentThisMonth / daysElapsed);

  let burnPacing: 'thrifty' | 'on_track' | 'accelerated' = 'on_track';
  if (avgDailySpentSoFar < safeDailyAllowance * 0.85) {
    burnPacing = 'thrifty';
  } else if (avgDailySpentSoFar > safeDailyAllowance * 1.15) {
    burnPacing = 'accelerated';
  }

  return {
    currentDay,
    totalDaysInMonth,
    remainingDays,
    totalRecurringBudget,
    totalSpentThisMonth,
    remainingBudget,
    safeDailyAllowance,
    todayDateStr,
    todaySpent,
    todayRemaining,
    todayStatus,
    flexibleBudget,
    flexibleSpent,
    flexibleRemaining,
    flexibleDailyAllowance,
    bucketAllowances,
    avgDailySpentSoFar,
    burnPacing,
  };
}

// What-if simulator: If I spend X today, what will tomorrow's daily allowance be?
export function simulateTomorrowAllowance(
  currentRemainingBudget: number,
  remainingDaysIncludingToday: number,
  hypotheticalSpendToday: number
): {
  newAllowanceTomorrow: number;
  difference: number;
} {
  const currentDaily = Math.round(currentRemainingBudget / Math.max(1, remainingDaysIncludingToday));
  const daysTomorrow = Math.max(1, remainingDaysIncludingToday - 1);
  const remainingAfterSpend = Math.max(0, currentRemainingBudget - hypotheticalSpendToday);
  const newAllowanceTomorrow = Math.round(remainingAfterSpend / daysTomorrow);
  
  return {
    newAllowanceTomorrow,
    difference: newAllowanceTomorrow - currentDaily,
  };
}
