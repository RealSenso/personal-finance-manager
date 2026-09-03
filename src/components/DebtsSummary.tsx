import React from 'react';
import { HandCoins, Check } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency } from '../lib/insights';

interface DebtsSummaryProps {
  transactions: Transaction[];
  onSettlePerson: (counterparty: string) => void;
}

interface PersonDebt {
  name: string;
  total: number;
  count: number;
}

export const DebtsSummary: React.FC<DebtsSummaryProps> = ({
  transactions,
  onSettlePerson,
}) => {
  const outstanding = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.paidBy === 'other' &&
      !t.settled &&
      !!t.counterparty
  );

  if (outstanding.length === 0) return null;

  const byPerson = new Map<string, PersonDebt>();
  for (const t of outstanding) {
    const name = (t.counterparty as string).trim();
    const key = name.toLowerCase();
    const existing = byPerson.get(key) || { name, total: 0, count: 0 };
    existing.total += t.amount;
    existing.count += 1;
    byPerson.set(key, existing);
  }

  const people = Array.from(byPerson.values()).sort((a, b) => b.total - a.total);
  const grandTotal = people.reduce((s, p) => s + p.total, 0);

  return (
    <div className="bl-panel bl-cut bg-zinc-900/60 border border-amber-500/30 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-amber-400" />
          <span className="bl-label text-amber-400">Debts — Money You Owe</span>
        </div>
        <span className="text-sm font-mono font-bold text-amber-400">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      <ul className="divide-y divide-zinc-800/60">
        {people.map((p) => (
          <li
            key={p.name.toLowerCase()}
            className="flex items-center justify-between py-2 gap-3"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-200 truncate">
                {p.name}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                {p.count} unsettled {p.count === 1 ? 'expense' : 'expenses'}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono font-semibold text-amber-400">
                {formatCurrency(p.total)}
              </span>
              <button
                type="button"
                onClick={() => onSettlePerson(p.name)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
                title={`Mark everything you owe ${p.name} as settled`}
              >
                <Check className="w-3 h-3" />
                Settle
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
