import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Sparkles, 
  ArrowRight, 
  X,
  Flame,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { RuleInsight } from '../types';

interface InsightsBannerProps {
  insights: RuleInsight[];
  onActionClick?: (insight: RuleInsight) => void;
}

export const InsightsBanner: React.FC<InsightsBannerProps> = ({
  insights,
  onActionClick,
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeInsights = insights.filter((i) => !dismissedIds.has(i.id));

  if (activeInsights.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const getIcon = (type: RuleInsight['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'warning':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'recommendation':
        return <ArrowRightLeft className="w-4 h-4 text-purple-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'info':
      default:
        return <Clock className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getBorderColor = (type: RuleInsight['type']) => {
    switch (type) {
      case 'alert':
        return 'border-rose-500/30 bg-rose-950/20';
      case 'warning':
        return 'border-amber-500/30 bg-amber-950/20';
      case 'recommendation':
        return 'border-purple-500/30 bg-purple-950/20';
      case 'success':
        return 'border-emerald-500/30 bg-emerald-950/20';
      case 'info':
      default:
        return 'border-cyan-500/30 bg-cyan-950/20';
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Rule-Based Insights ({activeInsights.length})
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            Pure Math Engine • No Cloud/LLM
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {activeInsights.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className={`border rounded-xl p-3.5 flex items-start justify-between gap-3 transition-colors ${getBorderColor(
              item.type
            )}`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-zinc-100 tracking-tight">
                    {item.title}
                  </h4>
                  {item.metric && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-zinc-300">
                      {item.metric}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  {item.message}
                </p>

                {item.actionText && onActionClick && (
                  <button
                    onClick={() => onActionClick(item)}
                    className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{item.actionText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDismiss(item.id)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors cursor-pointer shrink-0"
              title="Dismiss insight"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
