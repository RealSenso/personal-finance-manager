import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Upload, 
  RotateCcw, 
  CheckCircle,
  Database,
  AlertCircle
} from 'lucide-react';
import { Bucket, KeywordRule, Transaction, UserIncomeProfile } from '../types';
import { 
  exportTransactionsToCsv, 
  exportFullJsonBackup 
} from '../lib/csvParser';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  transactions: Transaction[];
  incomeProfile: UserIncomeProfile;
  rules: KeywordRule[];
  currentMonth: string;
  onRestoreData: (data: any) => void;
  onRequestResetConfirm: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  buckets,
  transactions,
  incomeProfile,
  rules,
  currentMonth,
  onRestoreData,
  onRequestResetConfirm,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const currentMonthTransactions = transactions.filter((t) =>
    t.date.startsWith(currentMonth)
  );

  const handleExportCurrentMonthCsv = () => {
    exportTransactionsToCsv(
      currentMonthTransactions,
      buckets,
      `expenses_${currentMonth}.csv`
    );
    setStatusMessage({ type: 'success', text: `Exported ${currentMonth} transactions CSV successfully!` });
  };

  const handleExportFullCsv = () => {
    exportTransactionsToCsv(
      transactions,
      buckets,
      `all_transactions_history.csv`
    );
    setStatusMessage({ type: 'success', text: 'Exported all historical transactions CSV successfully!' });
  };

  const handleExportJson = () => {
    exportFullJsonBackup({
      income: incomeProfile,
      buckets,
      transactions,
      rules,
    });
    setStatusMessage({ type: 'success', text: 'Full JSON backup downloaded successfully!' });
  };

  const handleJsonRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.buckets && parsed.transactions) {
          onRestoreData(parsed);
          setStatusMessage({ type: 'success', text: 'Data backup successfully restored!' });
        } else {
          setStatusMessage({ type: 'error', text: 'Invalid backup file format. Must contain buckets and transactions.' });
        }
      } catch (err) {
        setStatusMessage({ type: 'error', text: 'Failed to parse backup JSON file.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                Export & Data Portability
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Download CSV statements or offline JSON ledger backups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* CSV Options */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] text-zinc-400">
              CSV Statement Exports
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleExportCurrentMonthCsv}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3.5 text-left flex flex-col justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Current Month CSV</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {currentMonthTransactions.length} records for {currentMonth}
                </p>
              </button>

              <button
                onClick={handleExportFullCsv}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3.5 text-left flex flex-col justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Full History CSV</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  All {transactions.length} all-time records
                </p>
              </button>
            </div>
          </div>

          {/* Full Local Backup */}
          <div className="space-y-2.5 pt-2">
            <h4 className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px] text-zinc-400">
              Offline JSON Ledger Backup & Restore
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleExportJson}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3.5 text-left flex flex-col justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
                  <FileJson className="w-4 h-4" />
                  <span>Export JSON Backup</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Complete snapshot of buckets, rules, income, and ledger
                </p>
              </button>

              <div>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJsonRestore}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="w-full h-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3.5 text-left flex flex-col justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-purple-400 font-semibold mb-1">
                    <Upload className="w-4 h-4" />
                    <span>Restore JSON Backup</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Import previously exported snapshot file
                  </p>
                </button>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Danger Zone: Reset */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              Troubleshooting / Testing
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestResetConfirm();
              }}
              className="text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default ₹22,400 Setup</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
