import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Tag, 
  ArrowRight,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { Bucket, KeywordRule, ParsedCsvRow, Transaction } from '../types';
import { parseBankCsv, generateSampleBankCsv } from '../lib/csvParser';
import { formatCurrency } from '../lib/insights';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  rules: KeywordRule[];
  onImportTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
  onAddRule: (rule: Omit<KeywordRule, 'id'>) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  buckets,
  rules,
  onImportTransactions,
  onAddRule,
}) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [activeTab, setActiveTab] = useState<'uncategorized' | 'matched'>('uncategorized');
  const [quickRuleKeyword, setQuickRuleKeyword] = useState<string>('');
  const [quickRuleBucketId, setQuickRuleBucketId] = useState<string>(buckets[0]?.id || '');
  const [showRuleCreator, setShowRuleCreator] = useState<boolean>(false);
  const [importErrorMessage, setImportErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      processCsv(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    const sample = generateSampleBankCsv();
    setFileName('sample_hdfc_bank_statement.csv');
    setFileContent(sample);
    processCsv(sample);
  };

  const processCsv = (content: string) => {
    const rows = parseBankCsv(content, rules, buckets);
    setParsedRows(rows);
    // If there are uncategorized, default to uncategorized tab; otherwise matched
    const uncategorizedCount = rows.filter((r) => !r.suggestedBucketId).length;
    if (uncategorizedCount > 0) {
      setActiveTab('uncategorized');
    } else {
      setActiveTab('matched');
    }
  };

  const handleBucketChange = (rowId: string, bucketId: string) => {
    setParsedRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              selectedBucketId: bucketId,
              confidence: bucketId ? 'high' : 'manual',
            }
          : r
      )
    );
  };

  const handleToggleExclude = (rowId: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, excluded: !r.excluded } : r))
    );
  };

  const handleOpenRuleCreator = (rawDescription: string) => {
    // Extract first meaningful word
    const cleaned = rawDescription
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)[0] || rawDescription.slice(0, 10);
    setQuickRuleKeyword(cleaned.toLowerCase());
    setQuickRuleBucketId(buckets[0]?.id || '');
    setShowRuleCreator(true);
  };

  const handleSaveQuickRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRuleKeyword.trim() || !quickRuleBucketId) return;

    onAddRule({
      keyword: quickRuleKeyword.trim().toLowerCase(),
      bucketId: quickRuleBucketId,
      priority: 1,
    });

    // Re-evaluate parsed rows with this new rule applied
    const kw = quickRuleKeyword.trim().toLowerCase();
    setParsedRows((prev) =>
      prev.map((r) => {
        if (!r.selectedBucketId && r.description.toLowerCase().includes(kw)) {
          return {
            ...r,
            selectedBucketId: quickRuleBucketId,
            matchedKeyword: kw,
            confidence: 'high',
          };
        }
        return r;
      })
    );

    setShowRuleCreator(false);
  };

  const handleCommitImport = () => {
    const validRows = parsedRows.filter((r) => !r.excluded && r.selectedBucketId);
    if (validRows.length === 0) {
      setImportErrorMessage('No valid categorized transactions selected to import. Please assign at least one transaction to a bucket.');
      return;
    }
    setImportErrorMessage('');

    const txsToImport: Omit<Transaction, 'id'>[] = validRows.map((r) => {
      const bucket = buckets.find((b) => b.id === r.selectedBucketId);
      const isSavings = bucket?.type === 'savings_goal';

      return {
        bucketId: r.selectedBucketId!,
        amount: r.amount,
        type: isSavings ? 'savings_deposit' : 'expense',
        date: r.date,
        note: r.description,
        merchant: r.matchedKeyword || r.description.split(/[-–,]/)[0].trim(),
        source: 'csv_import',
      };
    });

    onImportTransactions(txsToImport);
    onClose();
  };

  const uncategorizedRows = parsedRows.filter(
    (r) => !r.excluded && (!r.selectedBucketId || r.confidence === 'manual')
  );
  const matchedRows = parsedRows.filter(
    (r) => !r.excluded && r.selectedBucketId && r.confidence === 'high'
  );
  const readyToImportCount = parsedRows.filter(
    (r) => !r.excluded && Boolean(r.selectedBucketId)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                Monthly Bank Statement CSV Import
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Auto-parses statement rows and categorizes via keyword rules
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Upload Zone */}
          {!fileContent ? (
            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center bg-zinc-900/30 hover:border-zinc-700 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileSpreadsheet className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-zinc-200">
                Upload your bank statement export (CSV)
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Works with any standard bank export (HDFC, SBI, ICICI, Axis, Paytm, etc.).
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
                >
                  Select File
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Load Sample Statement
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between bg-zinc-900/70 border border-zinc-800 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium text-zinc-200">{fileName}</span>
                  <span className="text-zinc-500 font-mono">
                    ({parsedRows.length} rows parsed)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileContent(null);
                    setParsedRows([]);
                  }}
                  className="text-xs text-zinc-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Upload Different File</span>
                </button>
              </div>

              {/* Review Queue Tab Bar */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('uncategorized')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'uncategorized'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Review Uncategorized ({uncategorizedRows.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('matched')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'matched'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Auto-Matched ({matchedRows.length})</span>
                  </button>
                </div>

                <span className="text-xs font-mono text-zinc-400">
                  {readyToImportCount} ready to save
                </span>
              </div>

              {/* Quick Rule Creator Bar */}
              {showRuleCreator && (
                <form
                  onSubmit={handleSaveQuickRule}
                  className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-3 flex flex-wrap items-center gap-2.5 text-xs animate-in fade-in"
                >
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Create Auto-Rule:
                  </span>
                  <span>If narration contains:</span>
                  <input
                    type="text"
                    value={quickRuleKeyword}
                    onChange={(e) => setQuickRuleKeyword(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 w-32"
                    placeholder="keyword"
                  />
                  <span>Map to:</span>
                  <select
                    value={quickRuleBucketId}
                    onChange={(e) => setQuickRuleBucketId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {buckets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded text-xs cursor-pointer"
                  >
                    Save & Auto-Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRuleCreator(false)}
                    className="text-zinc-400 hover:text-zinc-200 ml-1 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* Rows Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 font-mono text-[11px] sticky top-0 border-b border-zinc-800 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Narration / Description</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3">Target Bucket</th>
                      <th className="py-2.5 px-3 text-center">Rule Action</th>
                      <th className="py-2.5 px-3 text-right">Include</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {(activeTab === 'uncategorized'
                      ? uncategorizedRows
                      : matchedRows
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                          {activeTab === 'uncategorized'
                            ? '🎉 No uncategorized rows remaining! All rows are mapped to buckets.'
                            : 'No auto-matched rows. Use the rules manager to map common merchants.'}
                        </td>
                      </tr>
                    ) : (
                      (activeTab === 'uncategorized'
                        ? uncategorizedRows
                        : matchedRows
                      ).map((row) => (
                        <tr
                          key={row.id}
                          className={`hover:bg-zinc-900/60 transition-colors ${
                            row.excluded ? 'opacity-40 line-through' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-zinc-200 max-w-xs truncate">
                            {row.description}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap text-zinc-100">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <select
                              value={row.selectedBucketId || ''}
                              onChange={(e) =>
                                handleBucketChange(row.id, e.target.value)
                              }
                              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="">-- Choose Bucket --</option>
                              {buckets.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenRuleCreator(row.description)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                              title="Create rule to automatically map this merchant in the future"
                            >
                              <Tag className="w-3 h-3" />
                              <span>+ Rule</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleExclude(row.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                                row.excluded
                                  ? 'bg-zinc-800 text-zinc-500'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {row.excluded ? 'Excluded' : 'Included'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {importErrorMessage && (
          <div className="px-6 py-2.5 bg-rose-950/50 border-t border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span>{importErrorMessage}</span>
          </div>
        )}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="text-xs text-zinc-400">
            {parsedRows.length > 0 && (
              <span>
                {readyToImportCount} of {parsedRows.length} transactions ready for bulk save
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={readyToImportCount === 0}
              onClick={handleCommitImport}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Import {readyToImportCount} Transactions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
