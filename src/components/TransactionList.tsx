import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Trash2, 
  FileSpreadsheet, 
  User, 
  ArrowDownLeft, 
  ArrowUpRight,
  Filter,
  Calendar,
  HandCoins
} from 'lucide-react';
import { Bucket, Transaction } from '../types';
import { formatCurrency } from '../lib/insights';

interface TransactionListProps {
  transactions: Transaction[];
  buckets: Bucket[];
  currentMonth: string;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  buckets,
  currentMonth,
  onDeleteTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [showCurrentMonthOnly, setShowCurrentMonthOnly] = useState<boolean>(true);

  const bucketMap = new Map<string, Bucket>(buckets.map((b) => [b.id, b]));

  const filtered = transactions.filter((t) => {
    if (showCurrentMonthOnly && !t.date.startsWith(currentMonth)) {
      return false;
    }
    if (selectedBucketFilter !== 'all' && t.bucketId !== selectedBucketFilter) {
      return false;
    }
    if (selectedTypeFilter !== 'all' && t.type !== selectedTypeFilter) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNote = (t.note || '').toLowerCase().includes(q);
      const matchMerchant = (t.merchant || '').toLowerCase().includes(q);
      const bucketName = bucketMap.get(t.bucketId)?.name.toLowerCase() || '';
      if (!matchNote && !matchMerchant && !bucketName.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Sort descending by date
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3.5">
      {/* Table Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight">
            Transaction Activity
          </h2>
          <span className="text-xs font-mono text-zinc-400">
            ({sorted.length} recorded)
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-48 font-sans"
            />
          </div>

          {/* Bucket Filter */}
          <select
            value={selectedBucketFilter}
            onChange={(e) => setSelectedBucketFilter(e.target.value)}
            aria-label="Filter by Bucket"
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Buckets</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Month Scope Toggle */}
          <button
            onClick={() => setShowCurrentMonthOnly(!showCurrentMonthOnly)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showCurrentMonthOnly
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {showCurrentMonthOnly ? 'Current Month' : 'All Time'}
          </button>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Description / Merchant</th>
              <th className="py-2.5 px-3">Bucket Envelope</th>
              <th className="py-2.5 px-3">Source</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                  No transactions found matching the selected filters.
                </td>
              </tr>
            ) : (
              sorted.map((tx) => {
                const bucket = bucketMap.get(tx.bucketId);
                const isExpense = tx.type === 'expense';
                return (
                  <tr key={tx.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-200">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{tx.note || tx.merchant || 'Untitled Transaction'}</span>
                        {tx.paidBy === 'other' && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              tx.settled
                                ? 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            }`}
                            title={
                              tx.settled
                                ? `Repaid to ${tx.counterparty || 'someone'}`
                                : `You owe ${tx.counterparty || 'someone'}`
                            }
                          >
                            <HandCoins className="w-2.5 h-2.5" />
                            {tx.settled ? 'Repaid' : `Owe ${tx.counterparty || ''}`.trim()}
                          </span>
                        )}
                      </div>
                      {tx.merchant && tx.note && tx.merchant !== tx.note && (
                        <div className="text-[11px] text-zinc-500 font-normal">
                          {tx.merchant}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {bucket ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
                          style={{
                            backgroundColor: `${bucket.color}18`,
                            color: bucket.color,
                            border: `1px solid ${bucket.color}35`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: bucket.color }}
                          />
                          {bucket.name}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Uncategorized</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {tx.source === 'csv_import' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700/60">
                          <FileSpreadsheet className="w-2.5 h-2.5" />
                          CSV
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                          <User className="w-2.5 h-2.5" />
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap">
                      {isExpense ? (
                        <span className="text-zinc-100">
                          -{formatCurrency(tx.amount)}
                        </span>
                      ) : (
                        <span className="text-emerald-400">
                          +{formatCurrency(tx.amount)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTransaction(tx.id);
                        }}
                        className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
