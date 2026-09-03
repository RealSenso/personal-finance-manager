import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import {
  Bucket,
  Transaction,
  KeywordRule,
  UserIncomeProfile,
  RuleInsight,
  TransactionType,
} from './types';
import {
  loadBuckets,
  saveBuckets,
  loadTransactions,
  saveTransactions,
  loadIncomeProfile,
  saveIncomeProfile,
  loadKeywordRules,
  saveKeywordRules,
  initStorageIfEmpty,
} from './lib/storage';
import { evaluateFinancialInsights, formatCurrency } from './lib/insights';
import { calculateDailyAllowance } from './lib/dailyAllowance';
import { useCloudSync } from './lib/useCloudSync';
import type { AppSnapshot } from './types';
import { SyncButton } from './components/SyncButton';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { DailyAllowanceWidget } from './components/DailyAllowanceWidget';
import { InsightsBanner } from './components/InsightsBanner';
import { BucketList } from './components/BucketList';
import { TransactionList } from './components/TransactionList';
import { DebtsSummary } from './components/DebtsSummary';
import { AddExpenseModal } from './components/AddExpenseModal';
import { MonthlyHistoryModal } from './components/MonthlyHistoryModal';
import { WeeklyDigestModal } from './components/WeeklyDigestModal';
import { BucketFormModal } from './components/BucketFormModal';
import { ConfirmDeleteModal, ConfirmDeleteState } from './components/ConfirmDeleteModal';
import { SmartSavingsModal } from './components/SmartSavingsModal';

interface ToastNotice {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

export default function App() {
  useEffect(() => {
    initStorageIfEmpty();
  }, []);

  const [incomeProfile, setIncomeProfile] = useState<UserIncomeProfile>(() => loadIncomeProfile());
  const [buckets, setBuckets] = useState<Bucket[]>(() => loadBuckets());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>(() => loadKeywordRules());

  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const thisMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [currentMonth, setCurrentMonth] = useState<string>(thisMonth);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([thisMonth, currentMonth]);
    for (const tx of transactions) set.add(tx.date.slice(0, 7));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions, thisMonth, currentMonth]);

  // Modal state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseInitialBucketId, setExpenseInitialBucketId] = useState<string | undefined>();
  const [expenseInitialType, setExpenseInitialType] = useState<TransactionType>('expense');
  const [isWeeklyDigestOpen, setIsWeeklyDigestOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSmartSavingsOpen, setIsSmartSavingsOpen] = useState(false);
  const [isBucketFormOpen, setIsBucketFormOpen] = useState(false);
  const [bucketToEdit, setBucketToEdit] = useState<Bucket | null>(null);
  const [confirmDeleteState, setConfirmDeleteState] = useState<ConfirmDeleteState>({
    isOpen: false,
    type: 'bucket',
    title: '',
    description: '',
    itemId: '',
  });

  const handleUpdateIncome = (newProfile: UserIncomeProfile) => {
    setIncomeProfile(newProfile);
    saveIncomeProfile(newProfile);
    showToast('Income updated');
  };

  const handleSaveBucket = (bucketData: Omit<Bucket, 'id'>, bucketId?: string) => {
    let updated: Bucket[];
    if (bucketId) {
      updated = buckets.map((b) => (b.id === bucketId ? { ...b, ...bucketData } : b));
      showToast(`Updated "${bucketData.name}"`);
    } else {
      updated = [...buckets, { ...bucketData, id: `b-${Date.now()}` }];
      showToast(`Created "${bucketData.name}"`);
    }
    setBuckets(updated);
    saveBuckets(updated);
  };

  const handleRequestDeleteBucket = (bucketId: string) => {
    const bucket = buckets.find((b) => b.id === bucketId);
    if (!bucket) return;
    setConfirmDeleteState({
      isOpen: true,
      type: 'bucket',
      title: `Delete: ${bucket.name}`,
      description: `Delete "${bucket.name}"? Its past transactions stay in the ledger but become unassigned.`,
      itemId: bucketId,
      itemName: bucket.name,
    });
  };

  const handleExecuteConfirmedDelete = () => {
    if (confirmDeleteState.type === 'bucket') {
      const bucket = buckets.find((b) => b.id === confirmDeleteState.itemId);
      const updated = buckets.filter((b) => b.id !== confirmDeleteState.itemId);
      setBuckets(updated);
      saveBuckets(updated);
      showToast(`Deleted "${bucket?.name || 'envelope'}"`);
    }
  };

  const handleAddTransaction = (newTxData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...newTxData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);

    if (newTx.type === 'savings_deposit') {
      const updatedBuckets = buckets.map((b) =>
        b.id === newTx.bucketId && b.type === 'savings_goal'
          ? { ...b, currentBalance: b.currentBalance + newTx.amount }
          : b
      );
      setBuckets(updatedBuckets);
      saveBuckets(updatedBuckets);
      showToast(`Deposited ${formatCurrency(newTx.amount)}`);
    } else {
      showToast(`Logged ${formatCurrency(newTx.amount)}`);
    }

    const txMonth = newTx.date.slice(0, 7);
    if (txMonth !== currentMonth) setCurrentMonth(txMonth);
  };

  const handleSweepToGoals = (amount: number) => {
    const sweep = Math.floor(amount);
    if (sweep < 1) return;
    const goals = buckets.filter(
      (b) => b.type === 'savings_goal' && !b.isArchived && b.currentBalance < (b.targetAmount || 0)
    );
    if (goals.length === 0) {
      showToast('No open savings goals to sweep into', 'info');
      return;
    }
    const needs = goals.map((g) => Math.max(1, (g.targetAmount || 0) - g.currentBalance));
    const totalNeed = needs.reduce((s, n) => s + n, 0);
    const today = new Date().toISOString().slice(0, 10);
    const deposits: Transaction[] = [];
    let allocated = 0;
    goals.forEach((g, i) => {
      const share =
        i === goals.length - 1 ? sweep - allocated : Math.round((sweep * needs[i]) / totalNeed);
      if (share <= 0) return;
      allocated += share;
      deposits.push({
        id: `sweep-${Date.now()}-${i}`,
        bucketId: g.id,
        amount: share,
        type: 'savings_deposit',
        date: today,
        note: 'Swept from daily-spend surplus',
        merchant: 'Auto Sweep',
        source: 'manual',
        createdAt: new Date().toISOString(),
      });
    });
    if (deposits.length === 0) return;
    const depById = new Map(deposits.map((d) => [d.bucketId, d.amount]));
    setTransactions([...deposits, ...transactions]);
    saveTransactions([...deposits, ...transactions]);
    const updatedBuckets = buckets.map((b) =>
      depById.has(b.id) ? { ...b, currentBalance: b.currentBalance + (depById.get(b.id) || 0) } : b
    );
    setBuckets(updatedBuckets);
    saveBuckets(updatedBuckets);
    showToast(`Swept ${formatCurrency(allocated)} into ${deposits.length} goal${deposits.length > 1 ? 's' : ''}`);
  };

  const handleSettleDebt = (counterparty: string) => {
    const key = counterparty.trim().toLowerCase();
    let n = 0;
    const updatedTxs = transactions.map((t) => {
      if (
        t.type === 'expense' &&
        t.paidBy === 'other' &&
        !t.settled &&
        (t.counterparty || '').trim().toLowerCase() === key
      ) {
        n += 1;
        return { ...t, settled: true };
      }
      return t;
    });
    if (n === 0) return;
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);
    showToast(`Settled up with ${counterparty.trim()} (${n} ${n === 1 ? 'expense' : 'expenses'})`);
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    const updatedTxs = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);
    if (tx.type === 'savings_deposit') {
      const updatedBuckets = buckets.map((b) =>
        b.id === tx.bucketId && b.type === 'savings_goal'
          ? { ...b, currentBalance: Math.max(0, b.currentBalance - tx.amount) }
          : b
      );
      setBuckets(updatedBuckets);
      saveBuckets(updatedBuckets);
    }
    showToast(`Deleted ${formatCurrency(tx.amount)}`);
  };

  const handleQuickAction = (bucket: Bucket, type: 'expense' | 'savings_deposit') => {
    setExpenseInitialBucketId(bucket.id);
    setExpenseInitialType(type);
    setIsAddExpenseOpen(true);
  };

  const handleInsightAction = (insight: RuleInsight) => {
    if (insight.actionType === 'reallocate' && insight.bucketId && insight.targetBucketId) {
      const source = buckets.find((b) => b.id === insight.bucketId);
      const target = buckets.find((b) => b.id === insight.targetBucketId);
      if (!source || !target) return;
      const amt = 2000;
      const updated = buckets.map((b) => {
        if (b.id === source.id) return { ...b, plannedMonthly: Math.max(0, b.plannedMonthly - amt) };
        if (b.id === target.id) return { ...b, plannedMonthly: b.plannedMonthly + amt };
        return b;
      });
      setBuckets(updated);
      saveBuckets(updated);
      showToast(`Reallocated ${formatCurrency(amt)} to "${target.name}"`);
    } else if (insight.actionType === 'deposit' && insight.targetBucketId) {
      const target = buckets.find((b) => b.id === insight.targetBucketId);
      if (target) handleQuickAction(target, 'savings_deposit');
    } else if (insight.actionType === 'adjust_budget') {
      setBucketToEdit(null);
      setIsBucketFormOpen(true);
    } else if (insight.actionType === 'open_smart_savings') {
      setIsSmartSavingsOpen(true);
    } else if (insight.actionType === 'sweep_to_goals') {
      const pool = Number((insight.metric || '').replace(/[^\d]/g, '')) || 0;
      if (pool > 0) handleSweepToGoals(pool);
      else setIsSmartSavingsOpen(true);
    }
  };

  const insights = useMemo(
    () => evaluateFinancialInsights(buckets, transactions, incomeProfile, new Date()),
    [buckets, transactions, incomeProfile]
  );

  const dailyAllowance = useMemo(
    () => calculateDailyAllowance(buckets, transactions, incomeProfile, currentMonth, new Date()),
    [buckets, transactions, incomeProfile, currentMonth]
  );

  // --- Optional multi-device sync (Firebase) ---
  const applyRemote = (snap: AppSnapshot) => {
    setIncomeProfile(snap.income);
    saveIncomeProfile(snap.income);
    setBuckets(snap.buckets);
    saveBuckets(snap.buckets);
    setTransactions(snap.transactions);
    saveTransactions(snap.transactions);
    setKeywordRules(snap.rules);
    saveKeywordRules(snap.rules);
  };
  const cloud = useCloudSync({
    snapshot: { income: incomeProfile, buckets, transactions, rules: keywordRules },
    onRemote: applyRemote,
  });

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden relative z-10 text-zinc-100 font-sans">
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="anim-rise pointer-events-auto bg-zinc-900/95 border border-zinc-700/80 shadow-2xl rounded-xl p-3 flex items-center gap-3 text-xs text-zinc-100 backdrop-blur"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span className="flex-1 font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Header
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        availableMonths={availableMonths}
        onOpenAddExpense={() => {
          setExpenseInitialBucketId(undefined);
          setExpenseInitialType('expense');
          setIsAddExpenseOpen(true);
        }}
        onOpenWeeklyDigest={() => setIsWeeklyDigestOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        syncButton={
          <SyncButton
            enabled={cloud.enabled}
            status={cloud.status}
            email={cloud.user?.email ?? null}
            lastError={cloud.lastError}
            onSignIn={cloud.signIn}
            onSignOut={cloud.signOut}
          />
        }
      />

      {/* Cockpit — nothing here scrolls except the marked regions */}
      <main className="flex-1 min-h-0 grid gap-3 p-3 grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
        {/* Left rail: stats */}
        <section className="lg:col-span-3 flex flex-col min-h-0 anim-rise" style={{ animationDelay: '40ms' }}>
          <DashboardStats
            incomeProfile={incomeProfile}
            allowance={dailyAllowance}
            buckets={buckets}
            transactions={transactions}
            currentMonth={currentMonth}
            onUpdateIncome={handleUpdateIncome}
          />
        </section>

        {/* Centre: envelopes & goals */}
        <section
          className="lg:col-span-5 min-h-0 flex flex-col anim-rise"
          style={{ animationDelay: '110ms' }}
        >
          <BucketList
            buckets={buckets}
            transactions={transactions}
            currentMonth={currentMonth}
            onEditBucket={(b) => {
              setBucketToEdit(b);
              setIsBucketFormOpen(true);
            }}
            onDeleteBucket={handleRequestDeleteBucket}
            onQuickAction={handleQuickAction}
            onAddNewBucket={() => {
              setBucketToEdit(null);
              setIsBucketFormOpen(true);
            }}
            onOpenSmartSavings={() => setIsSmartSavingsOpen(true)}
          />
        </section>

        {/* Right rail: daily spend + feed */}
        <section
          className="lg:col-span-4 flex flex-col gap-3 min-h-0 anim-rise"
          style={{ animationDelay: '180ms' }}
        >
          <DailyAllowanceWidget allowance={dailyAllowance} onSweepToGoals={handleSweepToGoals} />
          <div className="flex-1 min-h-0 bl-scroll pr-1 flex flex-col gap-3">
            <InsightsBanner insights={insights} onActionClick={handleInsightAction} />
            <DebtsSummary transactions={transactions} onSettlePerson={handleSettleDebt} />
            <TransactionList
              transactions={transactions}
              buckets={buckets}
              currentMonth={currentMonth}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        </section>
      </main>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        buckets={buckets}
        onAddTransaction={handleAddTransaction}
        initialBucketId={expenseInitialBucketId}
        initialType={expenseInitialType}
      />
      <MonthlyHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        buckets={buckets}
        transactions={transactions}
        incomeProfile={incomeProfile}
        months={availableMonths}
      />
      <WeeklyDigestModal
        isOpen={isWeeklyDigestOpen}
        onClose={() => setIsWeeklyDigestOpen(false)}
        buckets={buckets}
        transactions={transactions}
        incomeProfile={incomeProfile}
      />
      <BucketFormModal
        isOpen={isBucketFormOpen}
        onClose={() => {
          setIsBucketFormOpen(false);
          setBucketToEdit(null);
        }}
        onSave={handleSaveBucket}
        onDelete={handleRequestDeleteBucket}
        bucketToEdit={bucketToEdit}
        allBuckets={buckets}
        incomeProfile={incomeProfile}
      />
      <SmartSavingsModal
        isOpen={isSmartSavingsOpen}
        onClose={() => setIsSmartSavingsOpen(false)}
        buckets={buckets}
        incomeProfile={incomeProfile}
        onApplyAllocations={(updatedBuckets) => {
          setBuckets(updatedBuckets);
          saveBuckets(updatedBuckets);
          showToast('Smart allocations applied');
        }}
      />
      <ConfirmDeleteModal
        state={confirmDeleteState}
        onClose={() => setConfirmDeleteState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteConfirmedDelete}
      />
    </div>
  );
}
