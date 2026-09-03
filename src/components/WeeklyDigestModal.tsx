import React from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  Flame, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Bucket, Transaction, UserIncomeProfile } from '../types';
import { generateWeeklyDigest, formatCurrency } from '../lib/insights';

interface WeeklyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  buckets: Bucket[];
  transactions: Transaction[];
  incomeProfile: UserIncomeProfile;
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({
  isOpen,
  onClose,
  buckets,
  transactions,
  incomeProfile,
}) => {
  if (!isOpen) return null;

  const digest = generateWeeklyDigest(buckets, transactions, incomeProfile);

  const getStatusBadge = (status: typeof digest.status) => {
    switch (status) {
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" />
            Healthy Velocity
          </span>
        );
      case 'Caution':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Caution (Burn Pace Elevated)
          </span>
        );
      case 'Attention Needed':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Flame className="w-3.5 h-3.5" />
            Attention Needed (Over Budget)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
                Weekly Financial Health Digest
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Deterministic rule-based Sunday finance briefing • Generated offline
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Briefing Card Header */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-zinc-300 font-medium">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>
                  Week {digest.weekNumber} • {digest.monthName} ({digest.generatedDate})
                </span>
              </div>
              {getStatusBadge(digest.status)}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-800 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Month Progress</span>
                <span className="text-zinc-200 font-bold text-sm">
                  {digest.monthProgressPercent}%
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Day {digest.daysElapsedInMonth}/{digest.totalDaysInMonth}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Budget Spent</span>
                <span className="text-zinc-200 font-bold text-sm">
                  {digest.spentPercent}%
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  {formatCurrency(digest.totalSpent)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Hot Envelopes</span>
                <span className={`font-bold text-sm ${digest.hotBuckets.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {digest.hotBuckets.length}
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  pacing warnings
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Savings Goals</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {digest.savingsHighlights.length}
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  accumulating
                </span>
              </div>
            </div>
          </div>

          {/* Synthesized Executive Summary Sentences */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-zinc-200 tracking-tight uppercase tracking-wider text-zinc-400">
              Executive Briefing Summary
            </h4>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 space-y-2 leading-relaxed text-zinc-300">
              {digest.summarySentences.map((sentence, idx) => (
                <p key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  <span>{sentence}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Hot Pacing Buckets Breakdown (if any) */}
          {digest.hotBuckets.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-amber-400 tracking-tight flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5" />
                <span>Envelopes Running Above Pace</span>
              </h4>
              <div className="space-y-2">
                {digest.hotBuckets.map((b, idx) => (
                  <div
                    key={idx}
                    className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-zinc-100">{b.name}</span>
                      <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                        Spent {formatCurrency(b.spent)} of {formatCurrency(b.planned)} allowance
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-amber-400 font-bold text-sm">
                        {b.percent}%
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        burn pace {b.paceRatio}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Savings Goals Milestones */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-zinc-200 tracking-tight flex items-center gap-1.5 uppercase tracking-wider text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Savings Goals Progress & ETAs</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {digest.savingsHighlights.map((g, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100">{g.name}</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                      {g.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, g.percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                    <span>
                      {formatCurrency(g.current)} / {formatCurrency(g.target)}
                    </span>
                    <span className="text-zinc-300">
                      ETA: ~{g.etaMonths} mos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-emerald-400 tracking-tight flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Actionable Directives for the Coming Week</span>
            </h4>
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
              {digest.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-zinc-300">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end bg-zinc-950">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm cursor-pointer"
          >
            Acknowledge Briefing
          </button>
        </div>
      </div>
    </div>
  );
};
