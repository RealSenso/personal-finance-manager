export type BucketType = "recurring" | "savings_goal";

export interface Bucket {
  id: string;
  name: string;
  type: BucketType;
  plannedMonthly: number; // For recurring: monthly allowance. For savings: planned monthly deposit.
  targetAmount?: number; // Only for savings_goal
  currentBalance: number; // For savings_goal: accumulated total.
  color: string;
  icon: string;
  category: string;
  notes?: string;
  isArchived?: boolean;
  // Recurring only: a fixed bill (subscription, rent, recharge) that is expected to be
  // paid in full every month. Fixed buckets are excluded from day-to-day spend budgeting
  // and never raise "running hot" pace warnings unless they exceed their planned amount.
  isFixed?: boolean;
}

export type TransactionType = "expense" | "savings_deposit" | "income";

export interface Transaction {
  id: string;
  bucketId: string;
  amount: number;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  note: string;
  merchant?: string;
  source: "manual" | "csv_import";
  createdAt?: string;
  // Debt tracking (only meaningful for type === 'expense'):
  // 'me'    -> I paid with my own money (default)
  // 'other' -> someone else paid, so I owe `counterparty` this amount until `settled`
  paidBy?: "me" | "other";
  counterparty?: string; // name of the person who paid on my behalf
  settled?: boolean; // true once I've paid this person back
}

export interface IncomeStream {
  id: string;
  name: string;
  amount: number;
}

// Lump-sum investment lot (e.g. a one-time buy into a liquid mutual fund).
// Value is projected with:  amount * (1 + annualRatePercent/100) ^ (daysHeld / 365)
export interface InvestmentEntry {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
}
export type InvestmentWithdrawal = InvestmentEntry;
export type InvestmentContribution = InvestmentEntry;

export interface Investment {
  id: string;
  name: string; // fund / label
  amount: number; // opening lump sum invested
  date: string; // YYYY-MM-DD invested on
  annualRatePercent: number; // expected annual return, %
  contributions?: InvestmentContribution[]; // later top-ups (e.g. a daily ₹100)
  withdrawals?: InvestmentWithdrawal[];
  createdAt?: string;
}

export interface UserIncomeProfile {
  stipend: number;
  extra: number;
  otherStreams?: IncomeStream[];
  // Share of total monthly income set aside for savings goals BEFORE the day-to-day
  // spending budget is computed. Default 25.
  savingsRatePercent: number;
}

export interface RuleInsight {
  id: string;
  type: "alert" | "warning" | "recommendation" | "success" | "info";
  bucketId?: string;
  title: string;
  message: string;
  metric?: string;
  actionText?: string;
  actionType?:
    | "view_bucket"
    | "adjust_budget"
    | "reallocate"
    | "deposit"
    | "open_smart_savings"
    | "sweep_to_goals";
  targetBucketId?: string;
}

export interface WeeklyDigestData {
  generatedDate: string;
  monthName: string;
  weekNumber: number;
  daysElapsedInMonth: number;
  totalDaysInMonth: number;
  monthProgressPercent: number;
  totalIncome: number;
  totalSpent: number;
  spentPercent: number;
  status: "Healthy" | "Caution" | "Attention Needed";
  summarySentences: string[];
  hotBuckets: {
    name: string;
    spent: number;
    planned: number;
    percent: number;
    paceRatio: number;
  }[];
  safeBuckets: {
    name: string;
    spent: number;
    planned: number;
    percent: number;
  }[];
  savingsHighlights: {
    name: string;
    current: number;
    target: number;
    percent: number;
    etaMonths: number;
  }[];
  recommendations: string[];
}

// Full app state, used for cloud sync (one Firestore document per user).
export interface AppSnapshot {
  income: UserIncomeProfile;
  buckets: Bucket[];
  transactions: Transaction[];
  investments: Investment[];
}
