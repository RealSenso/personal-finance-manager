import { Bucket, UserIncomeProfile } from "../types";

export type SavingsStrategy =
  "balanced_accelerator" | "high_velocity" | "proportional";

export interface GoalAllocationDetail {
  bucketId: string;
  bucketName: string;
  color: string;
  currentBalance: number;
  targetAmount: number;
  remainingAmount: number;
  isAchieved: boolean;

  // Suggested Monthly Plan
  recommendedMonthly: number;
  baselineShare: number;
  acceleratorShare: number;
  percentageOfPool: number;

  // Timeline projection with cascade
  monthsToComplete: number;
  completionDateStr: string; // e.g. "Nov 2026"
  completionMonthIndex: number;

  // Comparison vs naive equal distribution
  monthsSavedVsEqualSplit: number;
}

export interface SmartSavingsOptimizationResult {
  totalMonthlyIncome: number;
  totalRecurringExpenses: number;
  availableSavingsPool: number;
  currentAllocatedToSavings: number;
  poolDifference: number; // availableSavingsPool - currentAllocatedToSavings
  strategy: SavingsStrategy;
  activeGoalsCount: number;
  totalAchievedGoalsCount: number;
  allocations: GoalAllocationDetail[];
  cascadeTimelineSummary: {
    firstGoalReadyInMonths: number;
    firstGoalName: string;
    allGoalsReadyInMonths: number;
  } | null;
}

export function optimizeSavingsDistribution(
  buckets: Bucket[],
  incomeProfile: UserIncomeProfile,
  strategy: SavingsStrategy = "balanced_accelerator",
  currentDate: Date = new Date(),
): SmartSavingsOptimizationResult {
  const totalMonthlyIncome =
    incomeProfile.stipend +
    incomeProfile.extra +
    (incomeProfile.otherStreams || []).reduce((sum, s) => sum + s.amount, 0);

  const recurringBuckets = buckets.filter(
    (b) => b.type === "recurring" && !b.isArchived,
  );
  const totalRecurringExpenses = recurringBuckets.reduce(
    (sum, b) => sum + b.plannedMonthly,
    0,
  );

  const availableSavingsPool = Math.max(
    0,
    totalMonthlyIncome - totalRecurringExpenses,
  );

  const allSavingsGoals = buckets.filter(
    (b) => b.type === "savings_goal" && !b.isArchived,
  );
  const currentAllocatedToSavings = allSavingsGoals.reduce(
    (sum, b) => sum + b.plannedMonthly,
    0,
  );
  const poolDifference = availableSavingsPool - currentAllocatedToSavings;

  const incompleteGoals = allSavingsGoals.filter((g) => {
    const target = g.targetAmount || 0;
    return target > 0 && g.currentBalance < target;
  });

  const achievedGoals = allSavingsGoals.filter((g) => {
    const target = g.targetAmount || 0;
    return target > 0 && g.currentBalance >= target;
  });

  // If no savings pool or no incomplete goals
  if (availableSavingsPool <= 0 || incompleteGoals.length === 0) {
    const defaultAllocations: GoalAllocationDetail[] = allSavingsGoals.map(
      (g) => {
        const target = g.targetAmount || 0;
        const remaining = Math.max(0, target - g.currentBalance);
        return {
          bucketId: g.id,
          bucketName: g.name,
          color: g.color,
          currentBalance: g.currentBalance,
          targetAmount: target,
          remainingAmount: remaining,
          isAchieved: remaining === 0,
          recommendedMonthly: g.plannedMonthly,
          baselineShare: 0,
          acceleratorShare: 0,
          percentageOfPool: 0,
          monthsToComplete: remaining === 0 ? 0 : 999,
          completionDateStr:
            remaining === 0 ? "Goal Achieved! 🎉" : "Needs funding",
          completionMonthIndex: 0,
          monthsSavedVsEqualSplit: 0,
        };
      },
    );

    return {
      totalMonthlyIncome,
      totalRecurringExpenses,
      availableSavingsPool,
      currentAllocatedToSavings,
      poolDifference,
      strategy,
      activeGoalsCount: incompleteGoals.length,
      totalAchievedGoalsCount: achievedGoals.length,
      allocations: defaultAllocations,
      cascadeTimelineSummary: null,
    };
  }

  // Sort incomplete goals by remaining amount ascending (closest to completion first)
  const sortedIncomplete = [...incompleteGoals].sort((a, b) => {
    const remA = Math.max(0, (a.targetAmount || 0) - a.currentBalance);
    const remB = Math.max(0, (b.targetAmount || 0) - b.currentBalance);
    return remA - remB;
  });

  // Calculate raw shares
  const n = sortedIncomplete.length;
  let rawAllocations: {
    bucketId: string;
    baseline: number;
    accelerator: number;
    total: number;
  }[] = [];

  if (n === 1) {
    rawAllocations = [
      {
        bucketId: sortedIncomplete[0].id,
        baseline: availableSavingsPool,
        accelerator: 0,
        total: availableSavingsPool,
      },
    ];
  } else {
    // Strategy baseline & accelerator pool split
    let baselinePct = 0.3; // 30% baseline distributed across all goals
    let acceleratorPct = 0.7;

    if (strategy === "high_velocity") {
      baselinePct = 0.15;
      acceleratorPct = 0.85;
    } else if (strategy === "proportional") {
      baselinePct = 0.5;
      acceleratorPct = 0.5;
    }

    const baselinePool = availableSavingsPool * baselinePct;
    const acceleratorPool = availableSavingsPool * acceleratorPct;

    // Baseline: distributed equally so every goal gets a healthy, regular deposit
    const basePerGoal = baselinePool / n;

    // Accelerator: weighted towards earlier purchase
    // We weight inversely proportional to remaining amount: weight_i = 1 / sqrt(remaining_i)
    const weights = sortedIncomplete.map((g) => {
      const remaining = Math.max(100, (g.targetAmount || 0) - g.currentBalance);
      return 1 / Math.sqrt(remaining);
    });
    const sumWeights = weights.reduce((a, b) => a + b, 0);

    let tempAllocations = sortedIncomplete.map((g, idx) => {
      const accelShare = acceleratorPool * (weights[idx] / sumWeights);
      const total = basePerGoal + accelShare;
      return {
        bucketId: g.id,
        baseline: Math.round(basePerGoal),
        accelerator: Math.round(accelShare),
        total: Math.round(total / 50) * 50, // Round to clean multiple of ₹50
      };
    });

    // Ensure sum matches availableSavingsPool exactly by adjusting the nearest goal
    const currentSum = tempAllocations.reduce((sum, a) => sum + a.total, 0);
    const diff = availableSavingsPool - currentSum;
    tempAllocations[0].total += diff;
    tempAllocations[0].accelerator += diff;

    rawAllocations = tempAllocations;
  }

  // Equal split benchmark for comparison
  const equalMonthlyPerGoal = availableSavingsPool / n;

  // Run month-by-month cascade simulation to calculate exact completion dates
  // When a goal completes, its monthly amount cascades into the remaining goals!
  const cascadeResults = simulateCascade(
    sortedIncomplete,
    rawAllocations.map((a) => a.total),
    currentDate,
  );

  const equalSplitResults = simulateCascade(
    sortedIncomplete,
    sortedIncomplete.map(() => equalMonthlyPerGoal),
    currentDate,
  );

  const allocMap = new Map<string, (typeof rawAllocations)[0]>();
  rawAllocations.forEach((a) => allocMap.set(a.bucketId, a));

  const finalAllocations: GoalAllocationDetail[] = allSavingsGoals.map((g) => {
    const target = g.targetAmount || 0;
    const remaining = Math.max(0, target - g.currentBalance);

    if (remaining === 0) {
      return {
        bucketId: g.id,
        bucketName: g.name,
        color: g.color,
        currentBalance: g.currentBalance,
        targetAmount: target,
        remainingAmount: 0,
        isAchieved: true,
        recommendedMonthly: 0,
        baselineShare: 0,
        acceleratorShare: 0,
        percentageOfPool: 0,
        monthsToComplete: 0,
        completionDateStr: "Goal Achieved! 🎉",
        completionMonthIndex: 0,
        monthsSavedVsEqualSplit: 0,
      };
    }

    const alloc = allocMap.get(g.id);
    const monthly = alloc ? alloc.total : g.plannedMonthly;
    const baseline = alloc ? alloc.baseline : 0;
    const accelerator = alloc ? alloc.accelerator : 0;
    const pct =
      availableSavingsPool > 0
        ? Math.round((monthly / availableSavingsPool) * 100)
        : 0;

    const sim = cascadeResults.get(g.id) || {
      months: 99,
      dateStr: "Indefinite",
    };
    const equalSim = equalSplitResults.get(g.id) || {
      months: 99,
      dateStr: "Indefinite",
    };
    const monthsSaved = Math.max(
      0,
      Number((equalSim.months - sim.months).toFixed(1)),
    );

    return {
      bucketId: g.id,
      bucketName: g.name,
      color: g.color,
      currentBalance: g.currentBalance,
      targetAmount: target,
      remainingAmount: remaining,
      isAchieved: false,
      recommendedMonthly: monthly,
      baselineShare: baseline,
      acceleratorShare: accelerator,
      percentageOfPool: pct,
      monthsToComplete: sim.months,
      completionDateStr: sim.dateStr,
      completionMonthIndex: sim.months,
      monthsSavedVsEqualSplit: monthsSaved,
    };
  });

  // Summary
  const firstIncomplete = sortedIncomplete[0];
  const firstSim = firstIncomplete
    ? cascadeResults.get(firstIncomplete.id)
    : null;
  const lastIncomplete = sortedIncomplete[sortedIncomplete.length - 1];
  const lastSim = lastIncomplete ? cascadeResults.get(lastIncomplete.id) : null;

  const cascadeTimelineSummary =
    firstIncomplete && firstSim && lastSim
      ? {
          firstGoalReadyInMonths: firstSim.months,
          firstGoalName: firstIncomplete.name,
          allGoalsReadyInMonths: lastSim.months,
        }
      : null;

  return {
    totalMonthlyIncome,
    totalRecurringExpenses,
    availableSavingsPool,
    currentAllocatedToSavings,
    poolDifference,
    strategy,
    activeGoalsCount: incompleteGoals.length,
    totalAchievedGoalsCount: achievedGoals.length,
    allocations: finalAllocations,
    cascadeTimelineSummary,
  };
}

// Cascading multi-month simulation
function simulateCascade(
  goals: Bucket[],
  initialMonthlyDeposits: number[],
  startDate: Date,
): Map<string, { months: number; dateStr: string }> {
  const results = new Map<string, { months: number; dateStr: string }>();

  const balances = goals.map((g) => g.currentBalance);
  const targets = goals.map((g) => g.targetAmount || 0);
  let monthlyRates = [...initialMonthlyDeposits];
  const completed = new Set<number>();

  const maxMonths = 120; // 10 years max cap

  for (let m = 1; m <= maxMonths; m++) {
    let freedUpFromCompletedThisMonth = 0;

    // Apply deposits
    for (let i = 0; i < goals.length; i++) {
      if (completed.has(i)) continue;

      balances[i] += monthlyRates[i];
      if (balances[i] >= targets[i]) {
        completed.add(i);
        freedUpFromCompletedThisMonth += monthlyRates[i];

        // Calculate date string
        const futureDate = new Date(startDate);
        futureDate.setMonth(startDate.getMonth() + m);
        const dateStr = `${futureDate.toLocaleString("en-US", { month: "short" })} ${futureDate.getFullYear()} (~${m} mos)`;
        results.set(goals[i].id, { months: m, dateStr });
      }
    }

    // Cascade freed up funds into the remaining active goals
    if (freedUpFromCompletedThisMonth > 0) {
      const remainingIndices = goals
        .map((_, idx) => idx)
        .filter((idx) => !completed.has(idx));

      if (remainingIndices.length > 0) {
        // Distribute freed up amount to next nearest goal
        const nextTargetIdx = remainingIndices[0];
        monthlyRates[nextTargetIdx] += freedUpFromCompletedThisMonth;
      }
    }

    if (completed.size === goals.length) {
      break;
    }
  }

  // For any unfinished
  for (let i = 0; i < goals.length; i++) {
    if (!results.has(goals[i].id)) {
      results.set(goals[i].id, { months: 999, dateStr: ">10 years" });
    }
  }

  return results;
}
