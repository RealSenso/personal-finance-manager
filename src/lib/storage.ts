import { Bucket, Transaction, KeywordRule, UserIncomeProfile } from '../types';

const STORAGE_KEYS = {
  BUCKETS: 'pfm_buckets_v1',
  TRANSACTIONS: 'pfm_transactions_v1',
  KEYWORD_RULES: 'pfm_keyword_rules_v1',
  INCOME: 'pfm_income_v1',
  INITIALIZED: 'pfm_initialized_v1',
  LAST_SAVED: 'pfm_last_saved_v1',
};

export const DEFAULT_INCOME: UserIncomeProfile = {
  stipend: 12400,
  extra: 10000,
  otherStreams: [],
  savingsRatePercent: 25,
};

export const DEFAULT_BUCKETS: Bucket[] = [
  {
    id: 'b-claude',
    name: 'Claude Subscription',
    type: 'recurring',
    plannedMonthly: 2000,
    currentBalance: 0,
    color: '#6366f1', // Indigo
    icon: 'bot',
    category: 'Subscriptions',
    notes: 'Claude Pro AI subscription fixed expense',
    isFixed: true,
  },
  {
    id: 'b-mobile',
    name: 'Mobile Recharge',
    type: 'recurring',
    plannedMonthly: 1000,
    currentBalance: 0,
    color: '#06b6d4', // Cyan
    icon: 'smartphone',
    category: 'Utilities',
    notes: 'Monthly data & calling plan',
    isFixed: true,
  },
  {
    id: 'b-fun',
    name: 'Fun Fund',
    type: 'recurring',
    plannedMonthly: 5000,
    currentBalance: 0,
    color: '#f59e0b', // Amber
    icon: 'coffee',
    category: 'Discretionary',
    notes: 'Food delivery (Swiggy/Zomato), dining, casual outings',
  },
  {
    id: 'b-buffer',
    name: 'Buffer / Misc',
    type: 'recurring',
    plannedMonthly: 2000,
    currentBalance: 0,
    color: '#8b5cf6', // Purple
    icon: 'shield',
    category: 'Emergency / Flexibility',
    notes: 'Monthly uncommitted safety margin for sudden expenses',
  },
  {
    id: 'b-hostel',
    name: 'Hostel Fund',
    type: 'savings_goal',
    plannedMonthly: 7400,
    targetAmount: 40000,
    currentBalance: 18000,
    color: '#10b981', // Emerald
    icon: 'home',
    category: 'Living',
    notes: 'Hostel rent, security deposit & move-in fund',
  },
  {
    id: 'b-gadget',
    name: 'Gadget Fund',
    type: 'savings_goal',
    plannedMonthly: 5000,
    targetAmount: 50000,
    currentBalance: 14500,
    color: '#3b82f6', // Blue
    icon: 'laptop',
    category: 'Technology',
    notes: 'Laptop / tech upgrade goal',
  },
];

export const DEFAULT_KEYWORD_RULES: KeywordRule[] = [
  { id: 'kr-1', keyword: 'swiggy', bucketId: 'b-fun', priority: 1 },
  { id: 'kr-2', keyword: 'zomato', bucketId: 'b-fun', priority: 1 },
  { id: 'kr-3', keyword: 'blinkit', bucketId: 'b-fun', priority: 1 },
  { id: 'kr-4', keyword: 'zepto', bucketId: 'b-fun', priority: 1 },
  { id: 'kr-5', keyword: 'starbucks', bucketId: 'b-fun', priority: 1 },
  { id: 'kr-6', keyword: 'claude', bucketId: 'b-claude', priority: 2 },
  { id: 'kr-7', keyword: 'anthropic', bucketId: 'b-claude', priority: 2 },
  { id: 'kr-8', keyword: 'jio', bucketId: 'b-mobile', priority: 1 },
  { id: 'kr-9', keyword: 'airtel', bucketId: 'b-mobile', priority: 1 },
  { id: 'kr-10', keyword: 'vi recharge', bucketId: 'b-mobile', priority: 1 },
  { id: 'kr-11', keyword: 'hostel', bucketId: 'b-hostel', priority: 1 },
  { id: 'kr-12', keyword: 'croma', bucketId: 'b-gadget', priority: 1 },
  { id: 'kr-13', keyword: 'apple', bucketId: 'b-gadget', priority: 1 },
  { id: 'kr-14', keyword: 'amazon', bucketId: 'b-fun', priority: 0 },
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  // Current month (Sept 2026)
  {
    id: 'tx-01',
    bucketId: 'b-claude',
    amount: 1999,
    type: 'expense',
    date: '2026-09-01',
    note: 'Anthropic Claude Pro Monthly Renewal',
    merchant: 'Anthropic PBC',
    source: 'manual',
  },
  {
    id: 'tx-02',
    bucketId: 'b-mobile',
    amount: 899,
    type: 'expense',
    date: '2026-09-02',
    note: 'Jio 84-Day 2GB/Day Data Pack',
    merchant: 'Reliance Jio',
    source: 'csv_import',
  },
  {
    id: 'tx-03',
    bucketId: 'b-fun',
    amount: 1450,
    type: 'expense',
    date: '2026-09-02',
    note: 'Dinner & Snacks with friends',
    merchant: 'Zomato Dining',
    source: 'csv_import',
  },
  {
    id: 'tx-04',
    bucketId: 'b-fun',
    amount: 680,
    type: 'expense',
    date: '2026-09-03',
    note: 'Groceries & Cold Brew',
    merchant: 'Swiggy Instamart',
    source: 'csv_import',
  },
  {
    id: 'tx-05',
    bucketId: 'b-hostel',
    amount: 4000,
    type: 'savings_deposit',
    date: '2026-09-01',
    note: 'Monthly allocation transfer to Hostel Fund',
    merchant: 'Savings Transfer',
    source: 'manual',
  },
  {
    id: 'tx-06',
    bucketId: 'b-gadget',
    amount: 2500,
    type: 'savings_deposit',
    date: '2026-09-02',
    note: 'Transfer to Gadget Fund',
    merchant: 'Savings Transfer',
    source: 'manual',
  },

  // Previous month (August 2026)
  {
    id: 'tx-07',
    bucketId: 'b-claude',
    amount: 1999,
    type: 'expense',
    date: '2026-08-01',
    note: 'Claude subscription Aug',
    merchant: 'Anthropic',
    source: 'manual',
  },
  {
    id: 'tx-08',
    bucketId: 'b-mobile',
    amount: 999,
    type: 'expense',
    date: '2026-08-04',
    note: 'Mobile postpaid/add-on',
    merchant: 'Airtel',
    source: 'manual',
  },
  {
    id: 'tx-09',
    bucketId: 'b-fun',
    amount: 4850,
    type: 'expense',
    date: '2026-08-15',
    note: 'August Dining & Outings',
    merchant: 'Various Food & Dining',
    source: 'csv_import',
  },
  {
    id: 'tx-10',
    bucketId: 'b-hostel',
    amount: 7400,
    type: 'savings_deposit',
    date: '2026-08-05',
    note: 'Full Aug hostel deposit',
    merchant: 'Bank Transfer',
    source: 'manual',
  },
  {
    id: 'tx-11',
    bucketId: 'b-gadget',
    amount: 5000,
    type: 'savings_deposit',
    date: '2026-08-05',
    note: 'Aug gadget deposit',
    merchant: 'Bank Transfer',
    source: 'manual',
  },

  // 2 months ago (July 2026)
  {
    id: 'tx-12',
    bucketId: 'b-claude',
    amount: 1999,
    type: 'expense',
    date: '2026-07-01',
    note: 'Claude subscription Jul',
    merchant: 'Anthropic',
    source: 'manual',
  },
  {
    id: 'tx-13',
    bucketId: 'b-mobile',
    amount: 999,
    type: 'expense',
    date: '2026-07-03',
    note: 'Mobile recharge Jul',
    merchant: 'Jio',
    source: 'manual',
  },
  {
    id: 'tx-14',
    bucketId: 'b-fun',
    amount: 4200,
    type: 'expense',
    date: '2026-07-20',
    note: 'July Dining & Hangouts',
    merchant: 'Food & Dining',
    source: 'csv_import',
  },
  {
    id: 'tx-15',
    bucketId: 'b-hostel',
    amount: 6600,
    type: 'savings_deposit',
    date: '2026-07-05',
    note: 'July savings deposit',
    merchant: 'Bank Transfer',
    source: 'manual',
  },
  {
    id: 'tx-16',
    bucketId: 'b-gadget',
    amount: 5000,
    type: 'savings_deposit',
    date: '2026-07-05',
    note: 'July gadget deposit',
    merchant: 'Bank Transfer',
    source: 'manual',
  },
];

function recordSaveTimestamp(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());
  } catch (e) {
    // Ignore storage quota errors
  }
}

// Storage accessors
export function loadIncomeProfile(): UserIncomeProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INCOME);
    if (raw) {
      const parsed = JSON.parse(raw) as UserIncomeProfile;
      // Migrate older profiles that predate the savings-rate field.
      if (typeof parsed.savingsRatePercent !== 'number') {
        parsed.savingsRatePercent = DEFAULT_INCOME.savingsRatePercent;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load income from storage', e);
  }
  return DEFAULT_INCOME;
}

export function saveIncomeProfile(profile: UserIncomeProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INCOME, JSON.stringify(profile));
    recordSaveTimestamp();
  } catch (e) {
    console.error('Failed to save income to storage', e);
  }
}

export function loadBuckets(): Bucket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUCKETS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load buckets from storage', e);
  }
  return DEFAULT_BUCKETS;
}

export function saveBuckets(buckets: Bucket[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(buckets));
    recordSaveTimestamp();
  } catch (e) {
    console.error('Failed to save buckets to storage', e);
  }
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load transactions from storage', e);
  }
  return DEFAULT_TRANSACTIONS;
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    recordSaveTimestamp();
  } catch (e) {
    console.error('Failed to save transactions to storage', e);
  }
}

export function loadKeywordRules(): KeywordRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KEYWORD_RULES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load keyword rules from storage', e);
  }
  return DEFAULT_KEYWORD_RULES;
}

export function saveKeywordRules(rules: KeywordRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.KEYWORD_RULES, JSON.stringify(rules));
    recordSaveTimestamp();
  } catch (e) {
    console.error('Failed to save keyword rules to storage', e);
  }
}

export function getLastSavedTimestamp(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
  } catch (e) {
    return null;
  }
}

export interface StorageStats {
  bucketCount: number;
  transactionCount: number;
  ruleCount: number;
  totalBytes: number;
  approximateKb: string;
  lastSaved: string;
}

export function getStorageStats(): StorageStats {
  try {
    const bRaw = localStorage.getItem(STORAGE_KEYS.BUCKETS) || '';
    const tRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '';
    const rRaw = localStorage.getItem(STORAGE_KEYS.KEYWORD_RULES) || '';
    const iRaw = localStorage.getItem(STORAGE_KEYS.INCOME) || '';

    const totalBytes = (bRaw.length + tRaw.length + rRaw.length + iRaw.length) * 2;
    const approximateKb = (totalBytes / 1024).toFixed(1) + ' KB';

    const buckets = bRaw ? JSON.parse(bRaw) : [];
    const txs = tRaw ? JSON.parse(tRaw) : [];
    const rules = rRaw ? JSON.parse(rRaw) : [];

    const lastSaved = localStorage.getItem(STORAGE_KEYS.LAST_SAVED) || new Date().toISOString();

    return {
      bucketCount: buckets.length,
      transactionCount: txs.length,
      ruleCount: rules.length,
      totalBytes,
      approximateKb,
      lastSaved,
    };
  } catch (e) {
    return {
      bucketCount: 0,
      transactionCount: 0,
      ruleCount: 0,
      totalBytes: 0,
      approximateKb: '0 KB',
      lastSaved: new Date().toISOString(),
    };
  }
}

export function resetToDefaults(): void {
  saveIncomeProfile(DEFAULT_INCOME);
  saveBuckets(DEFAULT_BUCKETS);
  saveTransactions(DEFAULT_TRANSACTIONS);
  saveKeywordRules(DEFAULT_KEYWORD_RULES);
}

// Ensure default state exists on first load
export function initStorageIfEmpty(): void {
  try {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      resetToDefaults();
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  } catch (e) {
    console.error('Failed to initialize local storage', e);
  }
}
