import { useState, useEffect, useMemo, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, X, Undo2 } from "lucide-react";
import {
  Bucket,
  Transaction,
  UserIncomeProfile,
  RuleInsight,
  TransactionType,
} from "./types";
import {
  loadBuckets,
  saveBuckets,
  loadTransactions,
  saveTransactions,
  loadIncomeProfile,
  saveIncomeProfile,
  initStorageIfEmpty,
} from "./lib/storage";
import { evaluateFinancialInsights, formatCurrency } from "./lib/insights";
import { calculateDailyAllowance } from "./lib/dailyAllowance";
import { useCloudSync } from "./lib/useCloudSync";
import type { AppSnapshot } from "./types";
import { SyncButton } from "./components/SyncButton";
import { Header } from "./components/Header";
import { DashboardStats } from "./components/DashboardStats";
import { SpendingBreakdown } from "./components/SpendingBreakdown";
import { DailyAllowanceWidget } from "./components/DailyAllowanceWidget";
import { InsightsBanner } from "./components/InsightsBanner";
import { BucketList } from "./components/BucketList";
import { TransactionList } from "./components/TransactionList";
import { DebtsSummary } from "./components/DebtsSummary";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { MonthlyHistoryModal } from "./components/MonthlyHistoryModal";
import { WeeklyDigestModal } from "./components/WeeklyDigestModal";
import { BucketFormModal } from "./components/BucketFormModal";
import {
  ConfirmDeleteModal,
  ConfirmDeleteState,
} from "./components/ConfirmDeleteModal";
import { SmartSavingsModal } from "./components/SmartSavingsModal";

interface ToastNotice {
  id: string;
  type: "success" | "info" | "error";
  message: string;
  action?: { label: string; run: () => void };
}

export default function App() {
  useEffect(() => {
    initStorageIfEmpty();
  }, []);

  const [incomeProfile, setIncomeProfile] = useState<UserIncomeProfile>(() =>
    loadIncomeProfile(),
  );
  const [buckets, setBuckets] = useState<Bucket[]>(() => loadBuckets());
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadTransactions(),
  );

  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const showToast = (
    message: string,
    type: ToastNotice["type"] = "success",
    action?: ToastNotice["action"],
  ) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts((p) => [...p, { id, message, type, action }]);
    setTimeout(
      () => setToasts((p) => p.filter((t) => t.id !== id)),
      action ? 6000 : 3200,
    );
  };
  const dismissToast = (id: string) =>
    setToasts((p) => p.filter((t) => t.id !== id));

  const thisMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [currentMonth, setCurrentMonth] = useState<string>(thisMonth);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([thisMonth, currentMonth]);
    for (const tx of transactions) set.add(tx.date.slice(0, 7));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions, thisMonth, currentMonth]);

  // Modal state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseInitialBucketId, setExpenseInitialBucketId] = useState<
    string | undefined
  >();
  const [expenseInitialType, setExpenseInitialType] =
    useState<TransactionType>("expense");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isWeeklyDigestOpen, setIsWeeklyDigestOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSmartSavingsOpen, setIsSmartSavingsOpen] = useState(false);
  const [isBucketFormOpen, setIsBucketFormOpen] = useState(false);
  const [bucketToEdit, setBucketToEdit] = useState<Bucket | null>(null);
  const [confirmDeleteState, setConfirmDeleteState] =
    useState<ConfirmDeleteState>({
      isOpen: false,
      type: "bucket",
      title: "",
      description: "",
      itemId: "",
    });

  const anyModalOpen =
    isAddExpenseOpen ||
    isWeeklyDigestOpen ||
    isHistoryOpen ||
    isSmartSavingsOpen ||
    isBucketFormOpen ||
    confirmDeleteState.isOpen;
  const anyModalOpenRef = useRef(anyModalOpen);
  anyModalOpenRef.current = anyModalOpen;

  const openAddExpense = () => {
    setEditingTx(null);
    setExpenseInitialBucketId(undefined);
    setExpenseInitialType("expense");
    setIsAddExpenseOpen(true);
  };

  // Keyboard: N opens the Log dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey)
        return;
      const el = document.activeElement as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (anyModalOpenRef.current) return;
      e.preventDefault();
      openAddExpense();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleUpdateIncome = (p: UserIncomeProfile) => {
    setIncomeProfile(p);
    saveIncomeProfile(p);
    showToast("Income updated");
  };

  const handleSaveBucket = (data: Omit<Bucket, "id">, bucketId?: string) => {
    const updated = bucketId
      ? buckets.map((b) => (b.id === bucketId ? { ...b, ...data } : b))
      : [...buckets, { ...data, id: `b-${Date.now()}` }];
    setBuckets(updated);
    saveBuckets(updated);
    showToast(bucketId ? `Updated "${data.name}"` : `Created "${data.name}"`);
  };

  const handleRequestDeleteBucket = (bucketId: string) => {
    const bucket = buckets.find((b) => b.id === bucketId);
    if (!bucket) return;
    setConfirmDeleteState({
      isOpen: true,
      type: "bucket",
      title: `Delete: ${bucket.name}`,
      description: `Delete "${bucket.name}"? Its past transactions stay in the ledger but become unassigned.`,
      itemId: bucketId,
      itemName: bucket.name,
    });
  };

  const handleExecuteConfirmedDelete = () => {
    if (confirmDeleteState.type !== "bucket") return;
    const bucket = buckets.find((b) => b.id === confirmDeleteState.itemId);
    const updated = buckets.filter((b) => b.id !== confirmDeleteState.itemId);
    setBuckets(updated);
    saveBuckets(updated);
    showToast(`Deleted "${bucket?.name || "envelope"}"`);
  };

  const commitTxs = (txs: Transaction[]) => {
    setTransactions(txs);
    saveTransactions(txs);
  };
  const commitBuckets = (bs: Bucket[]) => {
    setBuckets(bs);
    saveBuckets(bs);
  };

  const handleAddTransaction = (
    data: Omit<Transaction, "id" | "createdAt">,
  ) => {
    const tx: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    commitTxs([tx, ...transactions]);
    if (tx.type === "savings_deposit") {
      commitBuckets(
        buckets.map((b) =>
          b.id === tx.bucketId && b.type === "savings_goal"
            ? { ...b, currentBalance: b.currentBalance + tx.amount }
            : b,
        ),
      );
      showToast(`Deposited ${formatCurrency(tx.amount)}`);
    } else {
      showToast(`Logged ${formatCurrency(tx.amount)}`);
    }
    const m = tx.date.slice(0, 7);
    if (m !== currentMonth) setCurrentMonth(m);
  };

  // Move `amount` into savings goals (weighted by how much each still needs),
  // dated `date` (defaults to today) — used by the widget/insight for the whole
  // month's surplus and by the ledger's Day view for a single day's leftover.
  const handleSweepToGoals = (amount: number, date?: string) => {
    const sweep = Math.floor(amount);
    if (sweep < 1) return;
    const goals = buckets.filter(
      (b) =>
        b.type === "savings_goal" &&
        !b.isArchived &&
        b.currentBalance < (b.targetAmount || 0),
    );
    if (goals.length === 0) {
      showToast("No open savings goals to sweep into", "info");
      return;
    }
    const needs = goals.map((g) =>
      Math.max(1, (g.targetAmount || 0) - g.currentBalance),
    );
    const totalNeed = needs.reduce((s, n) => s + n, 0);
    const now = new Date();
    const when =
      date ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const stamp = Date.now();
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
        id: `sweep-${stamp}-${i}`,
        bucketId: g.id,
        amount: share,
        type: "savings_deposit",
        date: when,
        note: "Swept from daily-spend surplus",
        merchant: "Auto Sweep",
        source: "manual",
        createdAt: new Date().toISOString(),
      });
    });
    if (deposits.length === 0) return;
    const byId = new Map(deposits.map((d) => [d.bucketId, d.amount]));
    commitTxs(
      [...deposits, ...transactions].sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    );
    commitBuckets(
      buckets.map((b) =>
        byId.has(b.id)
          ? { ...b, currentBalance: b.currentBalance + (byId.get(b.id) || 0) }
          : b,
      ),
    );
    showToast(
      `Swept ${formatCurrency(allocated)} into ${deposits.length} goal${deposits.length > 1 ? "s" : ""}`,
    );
    const m = when.slice(0, 7);
    if (m !== currentMonth) setCurrentMonth(m);
  };

  const handleSettleDebt = (counterparty: string) => {
    const key = counterparty.trim().toLowerCase();
    let n = 0;
    const updated = transactions.map((t) => {
      if (
        t.type === "expense" &&
        t.paidBy === "other" &&
        !t.settled &&
        (t.counterparty || "").trim().toLowerCase() === key
      ) {
        n += 1;
        return { ...t, settled: true };
      }
      return t;
    });
    if (n === 0) return;
    commitTxs(updated);
    showToast(
      `Settled up with ${counterparty.trim()} (${n} ${n === 1 ? "item" : "items"})`,
    );
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    const nextTxs = transactions.filter((t) => t.id !== id);
    commitTxs(nextTxs);
    if (tx.type === "savings_deposit") {
      commitBuckets(
        buckets.map((b) =>
          b.id === tx.bucketId && b.type === "savings_goal"
            ? {
                ...b,
                currentBalance: Math.max(0, b.currentBalance - tx.amount),
              }
            : b,
        ),
      );
    }
    showToast(`Deleted ${formatCurrency(tx.amount)}`, "info", {
      label: "Undo",
      run: () => {
        setTransactions((cur) => {
          const restored = [tx, ...cur].sort((a, b) =>
            b.date.localeCompare(a.date),
          );
          saveTransactions(restored);
          return restored;
        });
        if (tx.type === "savings_deposit") {
          setBuckets((cur) => {
            const bs = cur.map((b) =>
              b.id === tx.bucketId && b.type === "savings_goal"
                ? { ...b, currentBalance: b.currentBalance + tx.amount }
                : b,
            );
            saveBuckets(bs);
            return bs;
          });
        }
      },
    });
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setIsAddExpenseOpen(true);
  };

  // Apply an edit: reverse the old transaction's effect on savings-goal
  // balances, apply the new one, then replace it in the ledger.
  const goalDelta = (tx: Transaction, sign: 1 | -1) =>
    tx.type === "savings_deposit" ? sign * tx.amount : 0;

  const handleUpdateTransaction = (updated: Transaction) => {
    const old = transactions.find((t) => t.id === updated.id);
    if (!old) return;

    const nextTxs = transactions
      .map((t) => (t.id === updated.id ? updated : t))
      .sort((a, b) => b.date.localeCompare(a.date));
    commitTxs(nextTxs);

    // Net balance change per savings-goal bucket
    const net = new Map<string, number>();
    const add = (bid: string, v: number) =>
      net.set(bid, (net.get(bid) || 0) + v);
    add(old.bucketId, goalDelta(old, -1));
    add(updated.bucketId, goalDelta(updated, 1));

    if ([...net.values()].some((v) => v !== 0)) {
      commitBuckets(
        buckets.map((b) => {
          const d = net.get(b.id);
          if (!d || b.type !== "savings_goal") return b;
          return { ...b, currentBalance: Math.max(0, b.currentBalance + d) };
        }),
      );
    }

    setEditingTx(null);
    showToast(`Updated ${formatCurrency(updated.amount)}`);
    const m = updated.date.slice(0, 7);
    if (m !== currentMonth) setCurrentMonth(m);
  };

  const handleQuickAction = (
    bucket: Bucket,
    type: "expense" | "savings_deposit",
  ) => {
    setEditingTx(null);
    setExpenseInitialBucketId(bucket.id);
    setExpenseInitialType(type);
    setIsAddExpenseOpen(true);
  };

  const handleInsightAction = (insight: RuleInsight) => {
    if (
      insight.actionType === "reallocate" &&
      insight.bucketId &&
      insight.targetBucketId
    ) {
      const source = buckets.find((b) => b.id === insight.bucketId);
      const target = buckets.find((b) => b.id === insight.targetBucketId);
      if (!source || !target) return;
      const amt = 2000;
      commitBuckets(
        buckets.map((b) => {
          if (b.id === source.id)
            return {
              ...b,
              plannedMonthly: Math.max(0, b.plannedMonthly - amt),
            };
          if (b.id === target.id)
            return { ...b, plannedMonthly: b.plannedMonthly + amt };
          return b;
        }),
      );
      showToast(`Reallocated ${formatCurrency(amt)} to "${target.name}"`);
    } else if (insight.actionType === "deposit" && insight.targetBucketId) {
      const target = buckets.find((b) => b.id === insight.targetBucketId);
      if (target) handleQuickAction(target, "savings_deposit");
    } else if (insight.actionType === "adjust_budget") {
      setBucketToEdit(null);
      setIsBucketFormOpen(true);
    } else if (insight.actionType === "open_smart_savings") {
      setIsSmartSavingsOpen(true);
    } else if (insight.actionType === "sweep_to_goals") {
      const pool = Number((insight.metric || "").replace(/[^\d]/g, "")) || 0;
      if (pool > 0) handleSweepToGoals(pool);
      else setIsSmartSavingsOpen(true);
    }
  };

  const insights = useMemo(
    () =>
      evaluateFinancialInsights(
        buckets,
        transactions,
        incomeProfile,
        new Date(),
      ),
    [buckets, transactions, incomeProfile],
  );
  const dailyAllowance = useMemo(
    () =>
      calculateDailyAllowance(
        buckets,
        transactions,
        incomeProfile,
        currentMonth,
        new Date(),
      ),
    [buckets, transactions, incomeProfile, currentMonth],
  );

  // --- Optional multi-device sync (Firebase) ---
  const applyRemote = (snap: AppSnapshot) => {
    setIncomeProfile(snap.income);
    saveIncomeProfile(snap.income);
    setBuckets(snap.buckets);
    saveBuckets(snap.buckets);
    setTransactions(snap.transactions);
    saveTransactions(snap.transactions);
  };
  const cloud = useCloudSync({
    snapshot: { income: incomeProfile, buckets, transactions },
    onRemote: applyRemote,
  });

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden relative z-10 text-zinc-100 font-sans">
      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="anim-rise pointer-events-auto m-panel px-3.5 py-2.5 flex items-center gap-3 text-xs text-zinc-100"
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.run();
                  dismissToast(toast.id);
                }}
                className="shrink-0 inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-emerald-400 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
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
        onOpenAddExpense={openAddExpense}
        onOpenWeeklyDigest={() => setIsWeeklyDigestOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        syncButton={
          <SyncButton
            enabled={cloud.enabled}
            status={cloud.status}
            email={cloud.user?.email ?? null}
            lastError={cloud.lastError}
            errorHint={cloud.errorHint}
            onSignIn={cloud.signIn}
            onSignOut={cloud.signOut}
            onRetry={cloud.retry}
          />
        }
      />

      {cloud.status === "error" && cloud.errorHint && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-rose-500/10 border-b border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{cloud.errorHint}</span>
          <button
            type="button"
            onClick={cloud.retry}
            className="shrink-0 font-semibold hover:text-zinc-100 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* On desktop nothing scrolls but the marked regions; on narrow screens the main area scrolls. */}
      <main className="flex-1 min-h-0 grid gap-3 p-3 grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
        <section
          className="lg:col-span-3 flex flex-col gap-3 lg:min-h-0 anim-rise"
          style={{ animationDelay: "40ms" }}
        >
          <DashboardStats
            incomeProfile={incomeProfile}
            allowance={dailyAllowance}
            buckets={buckets}
            transactions={transactions}
            currentMonth={currentMonth}
            onUpdateIncome={handleUpdateIncome}
          />
          <SpendingBreakdown
            buckets={buckets}
            transactions={transactions}
            currentMonth={currentMonth}
          />
        </section>

        <section
          className="lg:col-span-5 lg:min-h-0 flex flex-col gap-3 anim-rise"
          style={{ animationDelay: "110ms" }}
        >
          <div className="lg:flex-1 lg:min-h-0 flex flex-col">
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
          </div>
          <InsightsBanner
            insights={insights}
            onActionClick={handleInsightAction}
          />
        </section>

        <section
          className="lg:col-span-4 flex flex-col gap-3 lg:min-h-0 anim-rise"
          style={{ animationDelay: "180ms" }}
        >
          <DailyAllowanceWidget
            allowance={dailyAllowance}
            onSweepToGoals={handleSweepToGoals}
          />
          <DebtsSummary
            transactions={transactions}
            onSettlePerson={handleSettleDebt}
          />
          <TransactionList
            transactions={transactions}
            buckets={buckets}
            incomeProfile={incomeProfile}
            currentMonth={currentMonth}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onSweepToGoals={handleSweepToGoals}
          />
        </section>
      </main>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingTx(null);
        }}
        buckets={buckets}
        onAddTransaction={handleAddTransaction}
        editTx={editingTx}
        onUpdateTransaction={handleUpdateTransaction}
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
        onApplyAllocations={(bs) => {
          commitBuckets(bs);
          showToast("Smart allocations applied");
        }}
      />
      <ConfirmDeleteModal
        state={confirmDeleteState}
        onClose={() =>
          setConfirmDeleteState((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={handleExecuteConfirmedDelete}
      />
    </div>
  );
}
