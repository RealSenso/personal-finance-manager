import { Bucket, Transaction, UserIncomeProfile, RuleInsight, WeeklyDigestData } from '../types';
import { calculateDailyAllowance } from './dailyAllowance';
import { optimizeSavingsDistribution } from './smartSavings';

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Calculate total spent for a bucket in a given month (YYYY-MM)
export function getBucketSpendForMonth(
  bucketId: string,
  transactions: Transaction[],
  monthStr: string
): number {
  return transactions
    .filter(
      (tx) =>
        tx.bucketId === bucketId &&
        tx.type === 'expense' &&
        tx.date.startsWith(monthStr)
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
}

// Calculate deposits for a savings goal bucket in a given month
export function getSavingsDepositsForMonth(
  bucketId: string,
  transactions: Transaction[],
  monthStr: string
): number {
  return transactions
    .filter(
      (tx) =>
        tx.bucketId === bucketId &&
        tx.type === 'savings_deposit' &&
        tx.date.startsWith(monthStr)
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
}

// Calculate historical average monthly deposit rate for a savings goal
export function calculateAverageMonthlyDepositRate(
  bucket: Bucket,
  transactions: Transaction[]
): number {
  const goalTxs = transactions.filter(
    (tx) => tx.bucketId === bucket.id && tx.type === 'savings_deposit'
  );

  if (goalTxs.length === 0) {
    return bucket.plannedMonthly || 1;
  }

  // Group deposits by month (YYYY-MM)
  const monthMap = new Map<string, number>();
  goalTxs.forEach((tx) => {
    const m = tx.date.slice(0, 7);
    monthMap.set(m, (monthMap.get(m) || 0) + tx.amount);
  });

  const monthsCount = Math.max(1, monthMap.size);
  const totalDeposited = Array.from(monthMap.values()).reduce((a, b) => a + b, 0);
  const avgActual = totalDeposited / monthsCount;

  // Blend with planned monthly rate if available
  if (bucket.plannedMonthly > 0) {
    return Math.round((avgActual + bucket.plannedMonthly) / 2);
  }
  return Math.round(avgActual);
}

// Calculate ETA for a savings goal
export function calculateSavingsETA(
  bucket: Bucket,
  transactions: Transaction[]
): {
  monthsRemaining: number;
  estimatedDateStr: string;
  monthlyDepositRate: number;
  percentageComplete: number;
} {
  const target = bucket.targetAmount || 0;
  const current = bucket.currentBalance || 0;

  if (target <= 0) {
    return {
      monthsRemaining: 0,
      estimatedDateStr: 'Target not set',
      monthlyDepositRate: bucket.plannedMonthly,
      percentageComplete: 100,
    };
  }

  const percentageComplete = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);

  if (remaining === 0) {
    return {
      monthsRemaining: 0,
      estimatedDateStr: 'Goal Achieved! 🎉',
      monthlyDepositRate: bucket.plannedMonthly,
      percentageComplete: 100,
    };
  }

  const monthlyRate = calculateAverageMonthlyDepositRate(bucket, transactions);

  if (monthlyRate <= 0) {
    return {
      monthsRemaining: 999,
      estimatedDateStr: 'Indefinite (₹0/mo deposit)',
      monthlyDepositRate: 0,
      percentageComplete,
    };
  }

  const monthsRemaining = Number((remaining / monthlyRate).toFixed(1));
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setMonth(today.getMonth() + Math.ceil(monthsRemaining));

  const monthName = futureDate.toLocaleString('en-US', { month: 'short' });
  const year = futureDate.getFullYear();

  return {
    monthsRemaining,
    estimatedDateStr: `${monthName} ${year} (~${monthsRemaining} mos)`,
    monthlyDepositRate: monthlyRate,
    percentageComplete,
  };
}

// Generate all rule-based insights
export function evaluateFinancialInsights(
  buckets: Bucket[],
  transactions: Transaction[],
  incomeProfile: UserIncomeProfile,
  currentDate: Date = new Date()
): RuleInsight[] {
  const insights: RuleInsight[] = [];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const dayOfMonth = currentDate.getDate();
  const totalDaysInMonth = getDaysInMonth(year, month);
  const monthProgressRatio = dayOfMonth / totalDaysInMonth;
  const monthProgressPercent = Math.round(monthProgressRatio * 100);

  // Total Income
  const totalIncome =
    incomeProfile.stipend +
    incomeProfile.extra +
    (incomeProfile.otherStreams || []).reduce((s, st) => s + st.amount, 0);

  // Total Planned Allocations across both recurring and savings goals
  const totalPlannedAllocations = buckets
    .filter((b) => !b.isArchived)
    .reduce((sum, b) => sum + b.plannedMonthly, 0);

  // 1. RULE: Total Allocation vs Total Income (Zero-Sum check)
  const unallocated = totalIncome - totalPlannedAllocations;
  if (unallocated > 0) {
    insights.push({
      id: 'ins-unallocated-positive',
      type: 'warning',
      title: 'Unallocated Monthly Income',
      message: `You have ${formatCurrency(unallocated)} of unallocated income this month (${formatCurrency(totalIncome)} income vs ${formatCurrency(totalPlannedAllocations)} budgeted). Give every rupee a job by allocating to your savings goals or buffer.`,
      metric: `${formatCurrency(unallocated)} free`,
      actionText: 'Allocate Funds',
      actionType: 'adjust_budget',
    });
  } else if (unallocated < 0) {
    insights.push({
      id: 'ins-unallocated-negative',
      type: 'alert',
      title: 'Over-Allocated Budget',
      message: `Your total planned allocations (${formatCurrency(totalPlannedAllocations)}) exceed your total monthly income (${formatCurrency(totalIncome)}) by ${formatCurrency(Math.abs(unallocated))}. You are operating at a deficit.`,
      metric: `-${formatCurrency(Math.abs(unallocated))}`,
      actionText: 'Rebalance Envelopes',
      actionType: 'adjust_budget',
    });
  } else {
    insights.push({
      id: 'ins-unallocated-zero',
      type: 'success',
      title: 'Zero-Sum Budget Balanced',
      message: `Perfect zero-sum allocation. 100% of your ${formatCurrency(totalIncome)} monthly income has an intentional destination. Unallocated balance is exactly ₹0.`,
      metric: '₹0 Unallocated',
    });
  }

  // 2. RULE: Mid-Month Pacing for Recurring Buckets
  const recurringBuckets = buckets.filter((b) => b.type === 'recurring' && !b.isArchived);
  for (const bucket of recurringBuckets) {
    const spent = getBucketSpendForMonth(bucket.id, transactions, monthStr);
    const planned = bucket.plannedMonthly;

    if (planned <= 0) continue;

    const spendRatio = spent / planned;
    const spendPercent = Math.round(spendRatio * 100);

    if (spent > planned) {
      const overBy = spent - planned;
      insights.push({
        id: `ins-over-${bucket.id}`,
        type: 'alert',
        bucketId: bucket.id,
        title: `${bucket.name} Budget Exceeded`,
        message: `You've spent ${formatCurrency(spent)} of your planned ${formatCurrency(planned)} (${spendPercent}%), exceeding the limit by ${formatCurrency(overBy)} with ${totalDaysInMonth - dayOfMonth} days remaining.`,
        metric: `${spendPercent}% used`,
        actionText: 'View Transactions',
        actionType: 'view_bucket',
      });
    } else if (spent > 0 && spendRatio > monthProgressRatio + 0.15) {
      // Pacing warning
      const projectedSpend = Math.round((spent / dayOfMonth) * totalDaysInMonth);
      insights.push({
        id: `ins-pace-${bucket.id}`,
        type: 'warning',
        bucketId: bucket.id,
        title: `${bucket.name} Running Hot`,
        message: `You've used ${spendPercent}% of this bucket (${formatCurrency(spent)} / ${formatCurrency(planned)}), but only ${monthProgressPercent}% of the month has passed (Day ${dayOfMonth}/${totalDaysInMonth}). At this burn rate, projected month-end spend is ${formatCurrency(projectedSpend)}.`,
        metric: `Burn: ${spendPercent}% vs ${monthProgressPercent}% day`,
        actionText: 'Review Bucket',
        actionType: 'view_bucket',
      });
    }
  }

  // 3. RULE: Savings Goal ETA & Milestone Updates
  const savingsGoals = buckets.filter((b) => b.type === 'savings_goal' && !b.isArchived);
  for (const goal of savingsGoals) {
    const eta = calculateSavingsETA(goal, transactions);
    const target = goal.targetAmount || 0;
    const current = goal.currentBalance || 0;
    const remaining = Math.max(0, target - current);

    if (current >= target && target > 0) {
      insights.push({
        id: `ins-goal-reached-${goal.id}`,
        type: 'success',
        bucketId: goal.id,
        title: `${goal.name} Target Reached!`,
        message: `Congratulations! You've fully funded ${goal.name} with ${formatCurrency(current)} of ${formatCurrency(target)}. You are ready to execute on this goal.`,
        metric: '100% Funded',
        actionText: 'View Goal',
        actionType: 'view_bucket',
      });
    } else if (eta.monthsRemaining > 0 && eta.monthsRemaining <= 6) {
      insights.push({
        id: `ins-goal-eta-${goal.id}`,
        type: 'info',
        bucketId: goal.id,
        title: `${goal.name} Milestone in Reach`,
        message: `${goal.name} is ${eta.percentageComplete}% funded (${formatCurrency(current)} / ${formatCurrency(target)}). At your average savings rate of ${formatCurrency(eta.monthlyDepositRate)}/mo, you will reach this goal by ${eta.estimatedDateStr}.`,
        metric: `ETA: ${eta.estimatedDateStr}`,
        actionText: 'Deposit Extra',
        actionType: 'deposit',
        targetBucketId: goal.id,
      });
    }
  }

  // 4. RULE: Idle Balance Detection (2+ months unused recurring funds)
  // Check if a recurring bucket had 0 or negligible spend for past 2 consecutive months
  const prevMonth1 = new Date(year, month - 1, 1);
  const prevMonth2 = new Date(year, month - 2, 1);
  const m1Str = `${prevMonth1.getFullYear()}-${String(prevMonth1.getMonth() + 1).padStart(2, '0')}`;
  const m2Str = `${prevMonth2.getFullYear()}-${String(prevMonth2.getMonth() + 2).padStart(2, '0')}`;

  for (const bucket of recurringBuckets) {
    if (bucket.plannedMonthly >= 1000) {
      const spendM1 = getBucketSpendForMonth(bucket.id, transactions, m1Str);
      const spendM2 = getBucketSpendForMonth(bucket.id, transactions, m2Str);
      const totalIdleSpend = spendM1 + spendM2;

      // If less than 10% of planned was spent in past 2 months
      if (totalIdleSpend < bucket.plannedMonthly * 0.2) {
        const potentialIdleAmount = bucket.plannedMonthly * 2 - totalIdleSpend;
        const targetSavingsGoal = savingsGoals[0]; // e.g. Hostel Fund or Gadget Fund
        const targetName = targetSavingsGoal ? targetSavingsGoal.name : 'your savings goals';

        insights.push({
          id: `ins-idle-${bucket.id}`,
          type: 'recommendation',
          bucketId: bucket.id,
          title: `Idle Balance Detected in ${bucket.name}`,
          message: `'${bucket.name}' has had virtually zero activity over the past 2 months (${formatCurrency(totalIdleSpend)} spent across ${prevMonth2.toLocaleString('en-US', { month: 'short' })} and ${prevMonth1.toLocaleString('en-US', { month: 'short' })}). You have ~${formatCurrency(potentialIdleAmount)} sitting idle. Consider reallocating part of this to ${targetName}.`,
          metric: `${formatCurrency(potentialIdleAmount)} idle`,
          actionText: `Reallocate to ${targetName}`,
          actionType: 'reallocate',
          targetBucketId: targetSavingsGoal?.id,
        });
      }
    }
  }

  // 5. RULE: Smart Daily Expense Allowance Assessment
  const dailyAllowanceData = calculateDailyAllowance(buckets, transactions, monthStr, currentDate);
  if (dailyAllowanceData.todayStatus === 'exceeded') {
    insights.push({
      id: 'ins-daily-allowance-exceeded',
      type: 'alert',
      title: 'Daily Expense Allowance Exceeded Today',
      message: `You've spent ${formatCurrency(dailyAllowanceData.todaySpent)} today against your safe daily target of ${formatCurrency(dailyAllowanceData.safeDailyAllowance)}/day. Your daily allowance for the remaining ${dailyAllowanceData.remainingDays - 1} days will adjust to ensure you stay within your monthly budget.`,
      metric: `${formatCurrency(dailyAllowanceData.todaySpent)} spent today`,
      actionText: 'Adjust Envelopes',
      actionType: 'adjust_budget',
    });
  } else if (dailyAllowanceData.safeDailyAllowance > 0 && dailyAllowanceData.remainingDays > 5) {
    insights.push({
      id: 'ins-daily-allowance-on-track',
      type: 'info',
      title: 'Daily Spending Allowance Active',
      message: `Your safe spending allowance is ${formatCurrency(dailyAllowanceData.safeDailyAllowance)}/day across remaining recurring envelopes (${formatCurrency(dailyAllowanceData.remainingBudget)} remaining over ${dailyAllowanceData.remainingDays} days). You have ${formatCurrency(Math.max(0, dailyAllowanceData.todayRemaining))} left for today.`,
      metric: `${formatCurrency(dailyAllowanceData.safeDailyAllowance)}/day safe`,
    });
  }

  // 6. RULE: Smart Savings Goal Acceleration & Multi-Goal Distribution
  if (savingsGoals.length > 1) {
    const smartSavingsResult = optimizeSavingsDistribution(buckets, incomeProfile, 'balanced_accelerator', currentDate);
    if (smartSavingsResult.cascadeTimelineSummary && smartSavingsResult.activeGoalsCount > 1) {
      const topGoal = smartSavingsResult.allocations.find((a) => !a.isAchieved);
      if (topGoal && topGoal.monthsSavedVsEqualSplit > 0) {
        insights.push({
          id: 'ins-smart-savings-accelerate',
          type: 'recommendation',
          title: `Smart Goal Acceleration: Buy ${topGoal.bucketName} Earlier`,
          message: `With balanced acceleration, you can buy ${topGoal.bucketName} ~${topGoal.monthsSavedVsEqualSplit} months earlier (${topGoal.completionDateStr}) while still depositing ${formatCurrency(smartSavingsResult.allocations.find(a => a.bucketId !== topGoal.bucketId)?.recommendedMonthly || 0)}/mo into your other goals!`,
          metric: `~${topGoal.monthsSavedVsEqualSplit} mos faster`,
          actionText: 'Optimize Savings Goals',
          actionType: 'open_smart_savings',
        });
      }
    }
  }

  return insights;
}

// Generate Structured Weekly Digest Briefing (100% pure template logic)
export function generateWeeklyDigest(
  buckets: Bucket[],
  transactions: Transaction[],
  incomeProfile: UserIncomeProfile,
  currentDate: Date = new Date()
): WeeklyDigestData {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dayOfMonth = currentDate.getDate();
  const totalDaysInMonth = getDaysInMonth(year, month);
  const weekNumber = Math.min(5, Math.ceil(dayOfMonth / 7));
  const monthProgressPercent = Math.round((dayOfMonth / totalDaysInMonth) * 100);

  const totalIncome =
    incomeProfile.stipend +
    incomeProfile.extra +
    (incomeProfile.otherStreams || []).reduce((s, st) => s + st.amount, 0);

  const recurringBuckets = buckets.filter((b) => b.type === 'recurring' && !b.isArchived);
  const savingsGoals = buckets.filter((b) => b.type === 'savings_goal' && !b.isArchived);

  // Month-to-date spending
  const totalSpent = transactions
    .filter((tx) => tx.type === 'expense' && tx.date.startsWith(monthStr))
    .reduce((s, tx) => s + tx.amount, 0);

  const totalRecurringBudget = recurringBuckets.reduce((s, b) => s + b.plannedMonthly, 0);
  const spentPercent = totalRecurringBudget > 0 ? Math.round((totalSpent / totalRecurringBudget) * 100) : 0;

  const hotBuckets: WeeklyDigestData['hotBuckets'] = [];
  const safeBuckets: WeeklyDigestData['safeBuckets'] = [];

  for (const bucket of recurringBuckets) {
    const spent = getBucketSpendForMonth(bucket.id, transactions, monthStr);
    const planned = bucket.plannedMonthly;
    const percent = planned > 0 ? Math.round((spent / planned) * 100) : 0;
    const paceRatio = monthProgressPercent > 0 ? percent / monthProgressPercent : 1;

    if (percent > monthProgressPercent + 15 || percent >= 90) {
      hotBuckets.push({
        name: bucket.name,
        spent,
        planned,
        percent,
        paceRatio: Number(paceRatio.toFixed(2)),
      });
    } else {
      safeBuckets.push({
        name: bucket.name,
        spent,
        planned,
        percent,
      });
    }
  }

  // Savings highlights
  const savingsHighlights: WeeklyDigestData['savingsHighlights'] = savingsGoals.map((g) => {
    const eta = calculateSavingsETA(g, transactions);
    return {
      name: g.name,
      current: g.currentBalance,
      target: g.targetAmount || 0,
      percent: eta.percentageComplete,
      etaMonths: eta.monthsRemaining,
    };
  });

  // Determine overall status
  let status: WeeklyDigestData['status'] = 'Healthy';
  if (hotBuckets.some((b) => b.percent > 100)) {
    status = 'Attention Needed';
  } else if (hotBuckets.length > 0 || spentPercent > monthProgressPercent + 20) {
    status = 'Caution';
  }

  // Build summary sentences via deterministic template logic
  const summarySentences: string[] = [];
  summarySentences.push(
    `We are at Day ${dayOfMonth} of ${totalDaysInMonth} in ${monthName} (${monthProgressPercent}% of the month elapsed).`
  );

  summarySentences.push(
    `You have spent ${formatCurrency(totalSpent)} out of your ${formatCurrency(totalRecurringBudget)} monthly recurring budget (${spentPercent}% used).`
  );

  if (hotBuckets.length === 0) {
    summarySentences.push(
      `All expense envelopes are currently tracking at or below the expected calendar pace. Your spending velocity is disciplined.`
    );
  } else {
    const hotNames = hotBuckets.map((b) => `'${b.name}' (${b.percent}%)`).join(', ');
    summarySentences.push(
      `Warning: ${hotBuckets.length} envelope${hotBuckets.length > 1 ? 's are' : ' is'} outpacing the calendar: ${hotNames}.`
    );
  }

  const recommendations: string[] = [];
  if (hotBuckets.length > 0) {
    const daysLeft = totalDaysInMonth - dayOfMonth;
    hotBuckets.forEach((b) => {
      const remainingAllowance = Math.max(0, b.planned - b.spent);
      const dailyCap = daysLeft > 0 ? Math.floor(remainingAllowance / daysLeft) : 0;
      recommendations.push(
        `Cap spending in '${b.name}' to ${formatCurrency(dailyCap)}/day for the remaining ${daysLeft} days to avoid a budget deficit.`
      );
    });
  }

  const plannedTotal = buckets.filter((b) => !b.isArchived).reduce((s, b) => s + b.plannedMonthly, 0);
  if (totalIncome > plannedTotal) {
    recommendations.push(
      `You have ${formatCurrency(totalIncome - plannedTotal)} unallocated income. Transfer this surplus into Hostel Fund or Gadget Fund.`
    );
  }

  savingsGoals.forEach((g) => {
    const eta = calculateSavingsETA(g, transactions);
    if (eta.percentageComplete >= 80 && eta.percentageComplete < 100) {
      recommendations.push(
        `'${g.name}' is within striking distance (${eta.percentageComplete}%). An extra one-time deposit of ${formatCurrency((g.targetAmount || 0) - g.currentBalance)} completes this goal today!`
      );
    }
  });

  return {
    generatedDate: currentDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    monthName,
    weekNumber,
    daysElapsedInMonth: dayOfMonth,
    totalDaysInMonth,
    monthProgressPercent,
    totalIncome,
    totalSpent,
    spentPercent,
    status,
    summarySentences,
    hotBuckets,
    safeBuckets,
    savingsHighlights,
    recommendations,
  };
}
