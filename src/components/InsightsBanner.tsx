import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  X,
  Flame,
  Clock,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { RuleInsight } from "../types";

interface InsightsBannerProps {
  insights: RuleInsight[];
  onActionClick?: (insight: RuleInsight) => void;
}

const icon = (t: RuleInsight["type"]) => {
  switch (t) {
    case "alert":
      return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    case "warning":
      return <Flame className="w-4 h-4 text-amber-400" />;
    case "recommendation":
      return <ArrowRightLeft className="w-4 h-4 text-purple-400" />;
    case "success":
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    default:
      return <Clock className="w-4 h-4 text-cyan-400" />;
  }
};

const tint = (t: RuleInsight["type"]) => {
  switch (t) {
    case "alert":
      return "border-rose-500/30 bg-rose-950/20";
    case "warning":
      return "border-amber-500/30 bg-amber-950/20";
    case "recommendation":
      return "border-purple-500/30 bg-purple-950/20";
    case "success":
      return "border-emerald-500/30 bg-emerald-950/20";
    default:
      return "border-cyan-500/30 bg-cyan-950/20";
  }
};

export const InsightsBanner: React.FC<InsightsBannerProps> = ({
  insights,
  onActionClick,
}) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [i, setI] = useState(0);

  const active = insights.filter((x) => !dismissed.has(x.id));

  // keep the pointer in range as the list changes
  useEffect(() => {
    if (i > active.length - 1) setI(Math.max(0, active.length - 1));
  }, [active.length, i]);

  if (active.length === 0) return null;

  const item = active[Math.min(i, active.length - 1)];
  const go = (d: number) =>
    setI((p) => (p + d + active.length) % active.length);
  const drop = (id: string) => setDismissed((p) => new Set([...p, id]));

  return (
    <div className="m-panel p-3 shrink-0">
      <div className="flex items-center justify-between">
        <span className="m-label text-emerald-300">Notes</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-zinc-400">
            {Math.min(i, active.length - 1) + 1} / {active.length}
          </span>
          <button
            onClick={() => go(-1)}
            disabled={active.length < 2}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(1)}
            disabled={active.length < 2}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => drop(item.id)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className={`mt-2.5 border rounded-xl p-3.5 ${tint(item.type)}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="shrink-0">{icon(item.type)}</span>
          <h4 className="text-xs font-bold text-zinc-100">{item.title}</h4>
          {item.metric && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/70 border border-zinc-800 text-zinc-300">
              {item.metric}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
          {item.message}
        </p>
        {item.actionText && onActionClick && (
          <button
            onClick={() => onActionClick(item)}
            className="mt-2 text-xs font-semibold text-emerald-300 hover:text-emerald-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            {item.actionText}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
