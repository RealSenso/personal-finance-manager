import { Bucket, Transaction, UserIncomeProfile } from "../types";

const KEYS = {
  BUCKETS: "pfm_buckets_v1",
  TRANSACTIONS: "pfm_transactions_v1",
  INCOME: "pfm_income_v1",
  INITIALIZED: "pfm_initialized_v1",
};

export const DEFAULT_INCOME: UserIncomeProfile = {
  stipend: 12400,
  extra: 10000,
  otherStreams: [],
  savingsRatePercent: 25,
};

export const DEFAULT_BUCKETS: Bucket[] = [
  {
    id: "b-claude",
    name: "Claude Subscription",
    type: "recurring",
    plannedMonthly: 2000,
    currentBalance: 0,
    color: "#6f7fb0",
    icon: "bot",
    category: "Subscriptions",
    notes: "Claude Pro AI subscription",
    isFixed: true,
  },
  {
    id: "b-mobile",
    name: "Mobile Recharge",
    type: "recurring",
    plannedMonthly: 1000,
    currentBalance: 0,
    color: "#4b7e77",
    icon: "smartphone",
    category: "Utilities",
    notes: "Monthly data & calling plan",
    isFixed: true,
  },
  {
    id: "b-fun",
    name: "Fun Fund",
    type: "recurring",
    plannedMonthly: 5000,
    currentBalance: 0,
    color: "#a9803f",
    icon: "coffee",
    category: "Discretionary",
    notes: "Food delivery, dining, casual outings",
  },
  {
    id: "b-buffer",
    name: "Buffer / Misc",
    type: "recurring",
    plannedMonthly: 2000,
    currentBalance: 0,
    color: "#786a92",
    icon: "shield",
    category: "Flexibility",
    notes: "Safety margin for sudden expenses",
  },
  {
    id: "b-hostel",
    name: "Hostel Fund",
    type: "savings_goal",
    plannedMonthly: 7400,
    targetAmount: 40000,
    currentBalance: 18000,
    color: "#647f49",
    icon: "home",
    category: "Living",
    notes: "Hostel rent, deposit & move-in fund",
  },
  {
    id: "b-gadget",
    name: "Gadget Fund",
    type: "savings_goal",
    plannedMonthly: 5000,
    targetAmount: 50000,
    currentBalance: 14500,
    color: "#5f6b9c",
    icon: "laptop",
    category: "Technology",
    notes: "Laptop / tech upgrade goal",
  },
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-01",
    bucketId: "b-claude",
    amount: 1999,
    type: "expense",
    date: "2026-09-01",
    note: "Claude Pro renewal",
    merchant: "Anthropic",
    source: "manual",
  },
  {
    id: "tx-02",
    bucketId: "b-mobile",
    amount: 899,
    type: "expense",
    date: "2026-09-02",
    note: "Jio 84-day pack",
    merchant: "Reliance Jio",
    source: "manual",
  },
  {
    id: "tx-03",
    bucketId: "b-fun",
    amount: 1450,
    type: "expense",
    date: "2026-09-02",
    note: "Dinner with friends",
    merchant: "Zomato",
    source: "manual",
  },
  {
    id: "tx-04",
    bucketId: "b-fun",
    amount: 680,
    type: "expense",
    date: "2026-09-03",
    note: "Groceries & cold brew",
    merchant: "Swiggy Instamart",
    source: "manual",
  },
  {
    id: "tx-05",
    bucketId: "b-hostel",
    amount: 4000,
    type: "savings_deposit",
    date: "2026-09-01",
    note: "Monthly transfer",
    merchant: "Savings",
    source: "manual",
  },
  {
    id: "tx-06",
    bucketId: "b-gadget",
    amount: 2500,
    type: "savings_deposit",
    date: "2026-09-02",
    note: "Monthly transfer",
    merchant: "Savings",
    source: "manual",
  },

  {
    id: "tx-07",
    bucketId: "b-claude",
    amount: 1999,
    type: "expense",
    date: "2026-08-01",
    note: "Claude subscription",
    merchant: "Anthropic",
    source: "manual",
  },
  {
    id: "tx-08",
    bucketId: "b-mobile",
    amount: 999,
    type: "expense",
    date: "2026-08-04",
    note: "Mobile add-on",
    merchant: "Airtel",
    source: "manual",
  },
  {
    id: "tx-09",
    bucketId: "b-fun",
    amount: 4850,
    type: "expense",
    date: "2026-08-15",
    note: "August dining & outings",
    merchant: "Various",
    source: "manual",
  },
  {
    id: "tx-10",
    bucketId: "b-hostel",
    amount: 7400,
    type: "savings_deposit",
    date: "2026-08-05",
    note: "August deposit",
    merchant: "Bank",
    source: "manual",
  },
  {
    id: "tx-11",
    bucketId: "b-gadget",
    amount: 5000,
    type: "savings_deposit",
    date: "2026-08-05",
    note: "August deposit",
    merchant: "Bank",
    source: "manual",
  },

  {
    id: "tx-12",
    bucketId: "b-claude",
    amount: 1999,
    type: "expense",
    date: "2026-07-01",
    note: "Claude subscription",
    merchant: "Anthropic",
    source: "manual",
  },
  {
    id: "tx-13",
    bucketId: "b-mobile",
    amount: 999,
    type: "expense",
    date: "2026-07-03",
    note: "Mobile recharge",
    merchant: "Jio",
    source: "manual",
  },
  {
    id: "tx-14",
    bucketId: "b-fun",
    amount: 4200,
    type: "expense",
    date: "2026-07-20",
    note: "July dining & hangouts",
    merchant: "Various",
    source: "manual",
  },
  {
    id: "tx-15",
    bucketId: "b-hostel",
    amount: 6600,
    type: "savings_deposit",
    date: "2026-07-05",
    note: "July deposit",
    merchant: "Bank",
    source: "manual",
  },
  {
    id: "tx-16",
    bucketId: "b-gadget",
    amount: 5000,
    type: "savings_deposit",
    date: "2026-07-05",
    note: "July deposit",
    merchant: "Bank",
    source: "manual",
  },
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Failed to read ${key}`, e);
  }
  return fallback;
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write ${key}`, e);
  }
}

export function loadIncomeProfile(): UserIncomeProfile {
  const p = read<UserIncomeProfile>(KEYS.INCOME, DEFAULT_INCOME);
  if (typeof p.savingsRatePercent !== "number")
    p.savingsRatePercent = DEFAULT_INCOME.savingsRatePercent;
  return p;
}
export const saveIncomeProfile = (p: UserIncomeProfile) =>
  write(KEYS.INCOME, p);

export const loadBuckets = () => read<Bucket[]>(KEYS.BUCKETS, DEFAULT_BUCKETS);
export const saveBuckets = (b: Bucket[]) => write(KEYS.BUCKETS, b);

export const loadTransactions = () =>
  read<Transaction[]>(KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
export const saveTransactions = (t: Transaction[]) =>
  write(KEYS.TRANSACTIONS, t);

export function resetToDefaults(): void {
  saveIncomeProfile(DEFAULT_INCOME);
  saveBuckets(DEFAULT_BUCKETS);
  saveTransactions(DEFAULT_TRANSACTIONS);
}

export function initStorageIfEmpty(): void {
  try {
    if (!localStorage.getItem(KEYS.INITIALIZED)) {
      resetToDefaults();
      localStorage.setItem(KEYS.INITIALIZED, "true");
    }
  } catch (e) {
    console.error("Failed to initialise storage", e);
  }
}
