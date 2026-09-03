import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X 
} from 'lucide-react';
import { 
  Bucket, 
  Transaction, 
  KeywordRule, 
  UserIncomeProfile, 
  RuleInsight,
  TransactionType
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
  DEFAULT_BUCKETS,
  DEFAULT_INCOME,
  DEFAULT_TRANSACTIONS,
  DEFAULT_KEYWORD_RULES
} from './lib/storage';
import { evaluateFinancialInsights, formatCurrency } from './lib/insights';
import { exportFullJsonBackup } from './lib/csvParser';
import { useCloudSync } from './lib/useCloudSync';
import { SyncButton } from './components/SyncButton';
import type { AppSnapshot } from './types';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { InsightsBanner } from './components/InsightsBanner';
import { BucketList } from './components/BucketList';
import { TransactionList } from './components/TransactionList';
import { AddExpenseModal } from './components/AddExpenseModal';
import { CsvImportModal } from './components/CsvImportModal';
import { KeywordRulesModal } from './components/KeywordRulesModal';
import { MonthlyHistoryModal } from './components/MonthlyHistoryModal';
import { WeeklyDigestModal } from './components/WeeklyDigestModal';
import { ExportModal } from './components/ExportModal';
import { StorageManagerModal } from './components/StorageManagerModal';
import { BucketFormModal } from './components/BucketFormModal';
import { ConfirmDeleteModal, ConfirmDeleteState } from './components/ConfirmDeleteModal';
import { SmartSavingsModal } from './components/SmartSavingsModal';
import { DebtsSummary } from './components/DebtsSummary';

interface ToastNotice {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

export default function App() {
  // Initialize storage seeds if first visit
  useEffect(() => {
    initStorageIfEmpty();
  }, []);

  const [incomeProfile, setIncomeProfile] = useState<UserIncomeProfile>(() => loadIncomeProfile());
  const [buckets, setBuckets] = useState<Bucket[]>(() => loadBuckets());
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>(() => loadKeywordRules());

  // Toast feedback
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Current real calendar month, e.g. '2026-09'
  const thisMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [currentMonth, setCurrentMonth] = useState<string>(thisMonth);

  // Months that actually have data, plus the current month, newest first.
  const availableMonths = useMemo(() => {
    const set = new Set<string>([thisMonth, currentMonth]);
    for (const tx of transactions) set.add(tx.date.slice(0, 7));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions, thisMonth, currentMonth]);

  // Modal states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseInitialBucketId, setExpenseInitialBucketId] = useState<string | undefined>();
  const [expenseInitialType, setExpenseInitialType] = useState<TransactionType>('expense');

  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isWeeklyDigestOpen, setIsWeeklyDigestOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isStorageManagerOpen, setIsStorageManagerOpen] = useState(false);
  const [isSmartSavingsOpen, setIsSmartSavingsOpen] = useState(false);

  const [isBucketFormOpen, setIsBucketFormOpen] = useState(false);
  const [bucketToEdit, setBucketToEdit] = useState<Bucket | null>(null);

  // In-app confirmation dialog for deletions and resets (bypasses broken iframe window.confirm)
  const [confirmDeleteState, setConfirmDeleteState] = useState<ConfirmDeleteState>({
    isOpen: false,
    type: 'bucket',
    title: '',
    description: '',
    itemId: '',
  });

  // Sync state to local storage
  const handleUpdateIncome = (newProfile: UserIncomeProfile) => {
    setIncomeProfile(newProfile);
    saveIncomeProfile(newProfile);
    showToast('Income profile updated & auto-saved');
  };

  const handleSaveBucket = (bucketData: Omit<Bucket, 'id'>, bucketId?: string) => {
    let updated: Bucket[];
    if (bucketId) {
      updated = buckets.map((b) => (b.id === bucketId ? { ...b, ...bucketData } : b));
      showToast(`Updated envelope "${bucketData.name}"`);
    } else {
      const newBucket: Bucket = {
        ...bucketData,
        id: `b-${Date.now()}`,
      };
      updated = [...buckets, newBucket];
      showToast(`Created new envelope "${bucketData.name}"`);
    }
    setBuckets(updated);
    saveBuckets(updated);
  };

  // Trigger modal for bucket deletion
  const handleRequestDeleteBucket = (bucketId: string) => {
    const bucket = buckets.find((b) => b.id === bucketId);
    if (!bucket) return;

    setConfirmDeleteState({
      isOpen: true,
      type: 'bucket',
      title: `Delete Envelope: ${bucket.name}`,
      description: `Are you sure you want to delete "${bucket.name}"? Existing transactions assigned to this bucket will remain in your ledger as unassigned, and this envelope will be removed from your active budget.`,
      itemId: bucketId,
      itemName: bucket.name,
    });
  };

  // Trigger modal for full reset
  const handleRequestReset = () => {
    setConfirmDeleteState({
      isOpen: true,
      type: 'reset',
      title: 'Reset Ledger to Default ₹22,400 Setup',
      description: 'Are you sure you want to reset your finance manager? This will reload the default ₹22,400 zero-sum configuration (stipend + extra, Claude, Mobile, Fun Fund, Buffer, Hostel and Gadget funds).',
      itemId: 'reset-all',
      itemName: 'Entire Finance Ledger & Buckets',
    });
  };

  // Confirmed action from ConfirmDeleteModal
  const handleExecuteConfirmedDelete = () => {
    if (confirmDeleteState.type === 'bucket') {
      const bucketId = confirmDeleteState.itemId;
      const bucket = buckets.find((b) => b.id === bucketId);
      const updated = buckets.filter((b) => b.id !== bucketId);
      setBuckets(updated);
      saveBuckets(updated);
      showToast(`Envelope "${bucket?.name || 'Item'}" successfully deleted`);
    } else if (confirmDeleteState.type === 'reset') {
      handleResetToDefaults();
      showToast('Finance ledger reset to default setup');
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

    // If savings deposit, update bucket's current balance
    if (newTx.type === 'savings_deposit') {
      const updatedBuckets = buckets.map((b) => {
        if (b.id === newTx.bucketId && b.type === 'savings_goal') {
          return { ...b, currentBalance: b.currentBalance + newTx.amount };
        }
        return b;
      });
      setBuckets(updatedBuckets);
      saveBuckets(updatedBuckets);
      showToast(`Deposited ${formatCurrency(newTx.amount)} to savings`);
    } else {
      showToast(`Expense of ${formatCurrency(newTx.amount)} logged`);
    }

    // Jump the dashboard to the month the transaction belongs to so its
    // effect on the budget is immediately visible.
    const txMonth = newTx.date.slice(0, 7);
    if (txMonth !== currentMonth) setCurrentMonth(txMonth);
  };

  // Distribute an underspend surplus across incomplete savings goals (weighted by
  // how much each goal still needs), logging a deposit per goal.
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
        i === goals.length - 1
          ? sweep - allocated
          : Math.round((sweep * needs[i]) / totalNeed);
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
    const updatedTxs = [...deposits, ...transactions];
    const updatedBuckets = buckets.map((b) =>
      depById.has(b.id) ? { ...b, currentBalance: b.currentBalance + (depById.get(b.id) || 0) } : b
    );
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);
    setBuckets(updatedBuckets);
    saveBuckets(updatedBuckets);
    showToast(`Swept ${formatCurrency(allocated)} into ${deposits.length} goal${deposits.length > 1 ? 's' : ''}`);
  };

  const handleBulkImportTransactions = (newTxsData: Omit<Transaction, 'id'>[]) => {
    const newTxs: Transaction[] = newTxsData.map((data, idx) => ({
      ...data,
      id: `csv-tx-${Date.now()}-${idx}`,
      createdAt: new Date().toISOString(),
    }));

    const updatedTxs = [...newTxs, ...transactions];
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);

    // Update savings balances for any savings deposits in the import
    const depositAmountsByBucket = new Map<string, number>();
    newTxs.forEach((tx) => {
      if (tx.type === 'savings_deposit') {
        depositAmountsByBucket.set(
          tx.bucketId,
          (depositAmountsByBucket.get(tx.bucketId) || 0) + tx.amount
        );
      }
    });

    if (depositAmountsByBucket.size > 0) {
      const updatedBuckets = buckets.map((b) => {
        const added = depositAmountsByBucket.get(b.id);
        if (added && b.type === 'savings_goal') {
          return { ...b, currentBalance: b.currentBalance + added };
        }
        return b;
      });
      setBuckets(updatedBuckets);
      saveBuckets(updatedBuckets);
    }

    showToast(`Successfully imported ${newTxs.length} transactions`);
  };

  // Mark every unsettled "someone else paid" expense for this person as paid back
  const handleSettleDebt = (counterparty: string) => {
    const key = counterparty.trim().toLowerCase();
    let settledCount = 0;
    const updatedTxs = transactions.map((t) => {
      if (
        t.type === 'expense' &&
        t.paidBy === 'other' &&
        !t.settled &&
        (t.counterparty || '').trim().toLowerCase() === key
      ) {
        settledCount += 1;
        return { ...t, settled: true };
      }
      return t;
    });
    if (settledCount === 0) return;
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);
    showToast(`Settled up with ${counterparty.trim()} (${settledCount} ${settledCount === 1 ? 'expense' : 'expenses'})`);
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    const updatedTxs = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTxs);
    saveTransactions(updatedTxs);

    // Revert savings balance if it was a deposit
    if (tx.type === 'savings_deposit') {
      const updatedBuckets = buckets.map((b) => {
        if (b.id === tx.bucketId && b.type === 'savings_goal') {
          return { ...b, currentBalance: Math.max(0, b.currentBalance - tx.amount) };
        }
        return b;
      });
      setBuckets(updatedBuckets);
      saveBuckets(updatedBuckets);
    }

    showToast(`Transaction of ${formatCurrency(tx.amount)} deleted`);
  };

  const handleAddRule = (ruleData: Omit<KeywordRule, 'id'>) => {
    const newRule: KeywordRule = {
      ...ruleData,
      id: `kr-${Date.now()}`,
    };
    const updated = [...keywordRules, newRule];
    setKeywordRules(updated);
    saveKeywordRules(updated);
    showToast(`Added keyword rule for "${ruleData.keyword}"`);
  };

  const handleUpdateRule = (updatedRule: KeywordRule) => {
    const updated = keywordRules.map((r) => (r.id === updatedRule.id ? updatedRule : r));
    setKeywordRules(updated);
    saveKeywordRules(updated);
    showToast(`Updated rule for "${updatedRule.keyword}"`);
  };

  const handleDeleteRule = (ruleId: string) => {
    const rule = keywordRules.find((r) => r.id === ruleId);
    const updated = keywordRules.filter((r) => r.id !== ruleId);
    setKeywordRules(updated);
    saveKeywordRules(updated);
    showToast(`Deleted rule for "${rule?.keyword || 'keyword'}"`);
  };

  const handleQuickAction = (bucket: Bucket, type: 'expense' | 'savings_deposit') => {
    setExpenseInitialBucketId(bucket.id);
    setExpenseInitialType(type);
    setIsAddExpenseOpen(true);
  };

  // Reallocate idle funds handler (from insight)
  const handleInsightAction = (insight: RuleInsight) => {
    if (insight.actionType === 'reallocate' && insight.bucketId && insight.targetBucketId) {
      const sourceBucket = buckets.find((b) => b.id === insight.bucketId);
      const targetBucket = buckets.find((b) => b.id === insight.targetBucketId);
      if (!sourceBucket || !targetBucket) return;

      const reallocateAmount = 2000;
      const updated = buckets.map((b) => {
        if (b.id === sourceBucket.id) {
          return { ...b, plannedMonthly: Math.max(0, b.plannedMonthly - reallocateAmount) };
        }
        if (b.id === targetBucket.id) {
          return { ...b, plannedMonthly: b.plannedMonthly + reallocateAmount };
        }
        return b;
      });
      setBuckets(updated);
      saveBuckets(updated);
      showToast(`Reallocated ₹${reallocateAmount.toLocaleString('en-IN')} from "${sourceBucket.name}" to "${targetBucket.name}"`);
    } else if (insight.actionType === 'deposit' && insight.targetBucketId) {
      const target = buckets.find((b) => b.id === insight.targetBucketId);
      if (target) {
        handleQuickAction(target, 'savings_deposit');
      }
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

  // Restore backup
  const handleRestoreData = (data: any) => {
    if (data.income) {
      setIncomeProfile(data.income);
      saveIncomeProfile(data.income);
    }
    if (data.buckets) {
      setBuckets(data.buckets);
      saveBuckets(data.buckets);
    }
    if (data.transactions) {
      setTransactions(data.transactions);
      saveTransactions(data.transactions);
    }
    if (data.rules) {
      setKeywordRules(data.rules);
      saveKeywordRules(data.rules);
    }
    showToast('Backup restored successfully');
  };

  const handleResetToDefaults = () => {
    setIncomeProfile(DEFAULT_INCOME);
    saveIncomeProfile(DEFAULT_INCOME);
    setBuckets(DEFAULT_BUCKETS);
    saveBuckets(DEFAULT_BUCKETS);
    setTransactions(DEFAULT_TRANSACTIONS);
    saveTransactions(DEFAULT_TRANSACTIONS);
    setKeywordRules(DEFAULT_KEYWORD_RULES);
    saveKeywordRules(DEFAULT_KEYWORD_RULES);
  };

  // Live rule-based insights, recomputed whenever any underlying data changes.
  const insights = useMemo(
    () => evaluateFinancialInsights(buckets, transactions, incomeProfile, new Date()),
    [buckets, transactions, incomeProfile]
  );

  // --- Active multi-device sync (Firebase, optional) ---
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative">
      {/* Toast Notification Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-zinc-900 border border-zinc-700/80 shadow-2xl rounded-xl p-3 flex items-center gap-3 text-xs text-zinc-100 animate-in slide-in-from-bottom-3 duration-200"
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

      {/* App Header */}
      <Header
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        availableMonths={availableMonths}
        onOpenAddExpense={() => {
          setExpenseInitialBucketId(undefined);
          setExpenseInitialType('expense');
          setIsAddExpenseOpen(true);
        }}
        onOpenCsvImport={() => setIsCsvImportOpen(true)}
        onOpenWeeklyDigest={() => setIsWeeklyDigestOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenStorageManager={() => setIsStorageManagerOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        syncButton={
          <SyncButton
            enabled={cloud.enabled}
            status={cloud.status}
            email={cloud.user?.email ?? null}
            onSignIn={cloud.signIn}
            onSignOut={cloud.signOut}
          />
        }
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* KPI Row & Month Pacing Anchor */}
        <DashboardStats
          incomeProfile={incomeProfile}
          buckets={buckets}
          transactions={transactions}
          currentMonth={currentMonth}
          onUpdateIncome={handleUpdateIncome}
          onSweepToGoals={handleSweepToGoals}
        />

        {/* Rule-Based Insights & Alert Feed */}
        <InsightsBanner
          insights={insights}
          onActionClick={handleInsightAction}
        />

        {/* Outstanding IOUs — expenses someone else paid for you */}
        <DebtsSummary
          transactions={transactions}
          onSettlePerson={handleSettleDebt}
        />

        {/* Desktop Multi-Column Section: Left (Buckets Grid) & Right (Recent Transactions) */}
        <div className="space-y-6">
          {/* Envelopes & Savings Goals Section */}
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

          {/* Ledger Activity Table */}
          <TransactionList
            transactions={transactions}
            buckets={buckets}
            currentMonth={currentMonth}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </div>
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

      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        buckets={buckets}
        rules={keywordRules}
        onImportTransactions={handleBulkImportTransactions}
        onAddRule={handleAddRule}
      />

      <KeywordRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        rules={keywordRules}
        buckets={buckets}
        onAddRule={handleAddRule}
        onUpdateRule={handleUpdateRule}
        onDeleteRule={handleDeleteRule}
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

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        buckets={buckets}
        transactions={transactions}
        incomeProfile={incomeProfile}
        rules={keywordRules}
        currentMonth={currentMonth}
        onRestoreData={handleRestoreData}
        onRequestResetConfirm={handleRequestReset}
      />

      <StorageManagerModal
        isOpen={isStorageManagerOpen}
        onClose={() => setIsStorageManagerOpen(false)}
        onExportBackup={() => {
          exportFullJsonBackup({
            income: incomeProfile,
            buckets,
            transactions,
            rules: keywordRules,
          });
          showToast('Backup JSON downloaded');
        }}
        onOpenExportModal={() => setIsExportOpen(true)}
        onRequestReset={handleRequestReset}
        totalTransactions={transactions.length}
        totalBuckets={buckets.length}
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

      {/* Smart Savings Goal Optimizer Modal */}
      <SmartSavingsModal
        isOpen={isSmartSavingsOpen}
        onClose={() => setIsSmartSavingsOpen(false)}
        buckets={buckets}
        incomeProfile={incomeProfile}
        onApplyAllocations={(updatedBuckets) => {
          setBuckets(updatedBuckets);
          saveBuckets(updatedBuckets);
          showToast('Smart savings goal allocations applied successfully!');
        }}
      />

      {/* Accessible In-App Confirm Delete Modal */}
      <ConfirmDeleteModal
        state={confirmDeleteState}
        onClose={() => setConfirmDeleteState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteConfirmedDelete}
      />
    </div>
  );
}
