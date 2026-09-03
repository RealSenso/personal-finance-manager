export type BucketType = 'recurring' | 'savings_goal';

export interface Bucket {
  id: string;
  name: string;
  type: BucketType;
  plannedMonthly: number; // For recurring: monthly allowance. For savings: planned monthly deposit.
  targetAmount?: number; // Only for savings_goal
  currentBalance: number; // For savings_goal: accumulated total. For recurring: rollover/current balance if applicable.
  color: string;
  icon: string;
  category: string;
  notes?: string;
  isArchived?: boolean;
}

export type TransactionType = 'expense' | 'savings_deposit' | 'income';

export interface Transaction {
  id: string;
  bucketId: string;
  amount: number;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  note: string;
  merchant?: string;
  source: 'manual' | 'csv_import';
  createdAt?: string;
  // Debt tracking (only meaningful for type === 'expense'):
  // 'me'    -> I paid with my own money (default)
  // 'other' -> someone else paid, so I owe `counterparty` this amount until `settled`
  paidBy?: 'me' | 'other';
  counterparty?: string; // name of the person who paid on my behalf
  settled?: boolean;     // true once I've paid this person back
}

export interface KeywordRule {
  id: string;
  keyword: string;
  bucketId: string;
  priority: number;
}

export interface IncomeStream {
  id: string;
  name: string;
  amount: number;
  isRecurring: boolean;
}

export interface UserIncomeProfile {
  stipend: number; // ₹12,400
  extra: number;   // ₹10,000
  otherStreams?: IncomeStream[];
}

export interface ParsedCsvRow {
  id: string;
  rawDate: string;
  date: string; // Normalized YYYY-MM-DD
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  suggestedBucketId: string | null;
  matchedKeyword?: string;
  confidence: 'high' | 'manual';
  selectedBucketId: string | null;
  excluded: boolean;
}

export interface RuleInsight {
  id: string;
  type: 'alert' | 'warning' | 'recommendation' | 'success' | 'info';
  bucketId?: string;
  title: string;
  message: string;
  metric?: string;
  actionText?: string;
  actionType?: 'view_bucket' | 'adjust_budget' | 'reallocate' | 'deposit' | 'open_smart_savings';
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
  status: 'Healthy' | 'Caution' | 'Attention Needed';
  summarySentences: string[];
  hotBuckets: { name: string; spent: number; planned: number; percent: number; paceRatio: number }[];
  safeBuckets: { name: string; spent: number; planned: number; percent: number }[];
  savingsHighlights: { name: string; current: number; target: number; percent: number; etaMonths: number }[];
  recommendations: string[];
}

export interface MonthSnapshot {
  month: string; // YYYY-MM
  totalIncome: number;
  totalPlanned: number;
  totalSpent: number;
  totalSaved: number;
  unallocated: number;
  bucketBreakdown: {
    bucketId: string;
    bucketName: string;
    type: BucketType;
    planned: number;
    actual: number;
  }[];
}
