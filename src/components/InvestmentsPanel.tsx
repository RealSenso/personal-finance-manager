import React from "react";
import { TrendingUp, ArrowRight } from "lucide-react";
import type { Investment } from "../types";
import { formatCurrency } from "../lib/insights";
import { portfolio, todayIso } from "../lib/investments";

interface Props {
  investments: Investment[];
  onOpen: () => void;
}

export const InvestmentsPanel: React.FC<Props> = ({ investments, onOpen }) => {
  const p = portfolio(investments, todayIso());
  const gainTone = p.totalGain >= 0 ? "text-emerald-300" : "text-rose-400";

  return (
    <div className="m-panel p-3 shrink-0">
      <div className="flex items-center justify-between">
        <span className="m-label text-emerald-300 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          Investments
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="text-[11px] font-medium text-emerald-300 hover:text-emerald-400 inline-flex items-center gap-1 cursor-pointer"
        >
          Manage
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {investments.length === 0 ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-2 w-full text-left text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Track a lump-sum investment and its projected profit →
        </button>
      ) : (
        <div className="mt-2.5 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-400">Invested (active)</span>
            <span className="text-zinc-200">
              {formatCurrency(Math.round(p.activePrincipal))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Est. value now</span>
            <span className="text-zinc-200">
              {formatCurrency(Math.round(p.currentValue))}
            </span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-zinc-800/80">
            <span className="text-zinc-400">
              Gain{p.realizedGain !== 0 ? " (incl. realised)" : ""}
            </span>
            <span className={`font-semibold ${gainTone}`}>
              {p.totalGain >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(Math.round(p.totalGain)))} (
              {p.gainPercent >= 0 ? "+" : ""}
              {p.gainPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
