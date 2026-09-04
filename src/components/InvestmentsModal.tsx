import React, { useState } from "react";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Landmark,
  ArrowDownToLine,
  CheckCircle2,
} from "lucide-react";
import type { Investment } from "../types";
import { formatCurrency } from "../lib/insights";
import {
  portfolio,
  summarize,
  normalize,
  withdrawalPreview,
  todayIso,
} from "../lib/investments";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  investments: Investment[];
  onSave: (inv: Investment) => void;
  onDelete: (id: string) => void;
  onBuy: (id: string, amount: number, date: string) => void;
  onWithdraw: (id: string, amount: number, date: string) => void;
  onUnstage: (id: string, entryId: string) => void;
}

const field =
  "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500";
const gainStr = (v: number) =>
  `${v >= 0 ? "+" : "−"}${formatCurrency(Math.abs(Math.round(v)))}`;

export const InvestmentsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  investments,
  onSave,
  onDelete,
  onBuy,
  onWithdraw,
  onUnstage,
}) => {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", rate: "7", min: "100" });
  const [err, setErr] = useState("");

  const [buyFor, setBuyFor] = useState<string | null>(null);
  const [buyForm, setBuyForm] = useState({ amount: "", date: todayIso() });
  const [withdrawFor, setWithdrawFor] = useState<string | null>(null);
  const [wForm, setWForm] = useState({ amount: "", date: todayIso() });
  const [wErr, setWErr] = useState("");

  if (!isOpen) return null;

  const asOf = todayIso();
  const p = portfolio(investments, asOf);

  const openAdd = () => {
    setForm({ name: "", rate: "7", min: "100" });
    setEditId(null);
    setErr("");
    setAdding(true);
  };
  const openEdit = (inv: Investment) => {
    setForm({
      name: inv.name,
      rate: String(inv.annualRatePercent),
      min: String(inv.minInvestment ?? 100),
    });
    setEditId(inv.id);
    setErr("");
    setAdding(true);
  };
  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Name the fund");
    const rate = parseFloat(form.rate);
    const min = parseFloat(form.min);
    if (isNaN(rate)) return setErr("Enter an expected annual return %");
    if (isNaN(min) || min <= 0) return setErr("Enter a minimum investment");
    const existing = investments.find((i) => i.id === editId);
    const base = existing ? normalize(existing) : null;
    onSave({
      id: editId || `inv-${Date.now()}`,
      name: form.name.trim(),
      annualRatePercent: rate,
      minInvestment: min,
      staged: base?.staged || [],
      lots: base?.lots || [],
      withdrawals: base?.withdrawals || [],
      createdAt: base?.createdAt || new Date().toISOString(),
    });
    setAdding(false);
    setEditId(null);
  };

  const openBuy = (inv: Investment) => {
    const s = summarize(inv, asOf);
    setBuyForm({ amount: String(Math.round(s.stagedTotal)), date: todayIso() });
    setBuyFor(inv.id);
  };
  const openWithdraw = (inv: Investment) => {
    const s = summarize(inv, asOf);
    setWForm({ amount: String(Math.round(s.activePrincipal)), date: todayIso() });
    setWErr("");
    setWithdrawFor(inv.id);
  };
  const confirmWithdraw = (inv: Investment) => {
    const s = summarize(inv, asOf);
    const amount = parseFloat(wForm.amount);
    if (isNaN(amount) || amount <= 0) return setWErr("Enter an amount");
    if (amount > s.activePrincipal + 0.5)
      return setWErr(
        `Only ${formatCurrency(Math.round(s.activePrincipal))} is still invested`,
      );
    onWithdraw(inv.id, amount, wForm.date);
    setWithdrawFor(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="m-panel w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-300" />
            <h3 className="text-sm font-semibold text-zinc-100">Investments</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Portfolio summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              ["Invested", formatCurrency(Math.round(p.activePrincipal))],
              ["Staged", formatCurrency(Math.round(p.stagedTotal))],
              ["Est. value", formatCurrency(Math.round(p.currentValue))],
              [
                "Gain",
                `${gainStr(p.totalGain)} (${p.gainPercent >= 0 ? "+" : ""}${p.gainPercent.toFixed(1)}%)`,
              ],
            ].map(([label, value], idx) => (
              <div key={label} className="m-panel p-2.5 !shadow-none">
                <div className="m-label">{label}</div>
                <div
                  className={`font-mono text-sm font-semibold mt-1 ${
                    idx === 3
                      ? p.totalGain >= 0
                        ? "text-emerald-300"
                        : "text-rose-400"
                      : "text-zinc-100"
                  }`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 -mt-1">
            Value is projected with{" "}
            <span className="font-mono">amount × (1 + r)^(days ÷ 365)</span> —
            an estimate, not a real NAV. Staged money isn't invested yet.
          </p>

          {/* Add / edit form */}
          {adding ? (
            <form
              onSubmit={submitForm}
              className="m-panel p-3.5 space-y-3 border-emerald-500/30"
            >
              <div className="m-label text-emerald-300">
                {editId ? "Edit investment" : "New investment — details only"}
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Fund / label
                </label>
                <input
                  className={field}
                  placeholder="e.g. Aditya Birla Liquid Fund Direct-Growth"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Expected annual return (%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    className={`${field} font-mono`}
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Minimum investment (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className={`${field} font-mono`}
                    value={form.min}
                    onChange={(e) => setForm({ ...form, min: e.target.value })}
                  />
                </div>
              </div>
              {err && <div className="text-[11px] text-rose-400">{err}</div>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-500 transition-colors"
                >
                  {editId ? "Save" : "Add"}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              Add investment
            </button>
          )}

          {/* Funds */}
          {investments.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">
              No investments tracked yet. Add one, then set money aside for it
              from the ledger's Day view.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {investments.map((raw) => {
                const inv = normalize(raw);
                const s = summarize(inv, asOf);
                const staged = (inv.staged || [])
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date));
                const lots = (inv.lots || [])
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date));
                const ws = (inv.withdrawals || [])
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date));
                return (
                  <li key={inv.id} className="m-panel p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Landmark className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="text-sm font-semibold text-zinc-100 truncate">
                            {inv.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          {inv.annualRatePercent}% p.a. · min{" "}
                          {formatCurrency(inv.minInvestment)}
                          {s.investedPrincipal > 0 &&
                            ` · held ${s.daysHeld}d`}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(inv)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-300 rounded cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(inv.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 rounded cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Staged → ready to buy? */}
                    <div className="mt-2.5 rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
                      {buyFor === inv.id ? (
                        <div className="space-y-2">
                          <div className="m-label text-emerald-300">
                            Confirm purchase
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[11px] text-zinc-400 block mb-1">
                                Amount (₹)
                              </label>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className={`${field} font-mono`}
                                value={buyForm.amount}
                                onChange={(e) =>
                                  setBuyForm({
                                    ...buyForm,
                                    amount: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-zinc-400 block mb-1">
                                Bought on
                              </label>
                              <input
                                type="date"
                                max={todayIso()}
                                className={`${field} font-mono`}
                                value={buyForm.date}
                                onChange={(e) =>
                                  setBuyForm({
                                    ...buyForm,
                                    date: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            Moves this much from staged into the fund; anything
                            left stays staged.
                          </p>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setBuyFor(null)}
                              className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const a = Math.min(
                                  parseFloat(buyForm.amount) || 0,
                                  s.stagedTotal,
                                );
                                if (a > 0) onBuy(inv.id, a, buyForm.date);
                                setBuyFor(null);
                              }}
                              className="px-3 py-1 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-500 transition-colors"
                            >
                              Confirm buy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-zinc-400">
                            Staged{" "}
                            <span className="font-mono text-zinc-200">
                              {formatCurrency(Math.round(s.stagedTotal))}
                            </span>{" "}
                            / {formatCurrency(inv.minInvestment)}
                            {s.canBuy ? (
                              <span className="text-emerald-300">
                                {" "}
                                · enough to buy
                              </span>
                            ) : s.stagedTotal > 0 ? (
                              <span>
                                {" "}
                                · add {formatCurrency(Math.ceil(s.shortBy))} more
                              </span>
                            ) : null}
                          </span>
                          {s.canBuy && (
                            <button
                              type="button"
                              onClick={() => openBuy(inv)}
                              className="shrink-0 inline-flex items-center gap-1 rounded-md bg-emerald-500 text-zinc-950 px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-400 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Buy {formatCurrency(Math.round(s.stagedTotal))}
                            </button>
                          )}
                        </div>
                      )}
                      {staged.length > 0 && buyFor !== inv.id && (
                        <ul className="mt-2 space-y-0.5 border-t border-zinc-800/70 pt-1.5">
                          {staged.map((e) => (
                            <li
                              key={e.id}
                              className="flex items-center justify-between text-[11px] font-mono text-zinc-500"
                            >
                              <span>
                                +{formatCurrency(e.amount)} on {e.date}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUnstage(inv.id, e.id)}
                                className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                                title="Remove"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Invested metrics */}
                    {s.investedPrincipal > 0 && (
                      <>
                        <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-xs">
                          <div>
                            <div className="text-[10px] text-zinc-500">
                              Active
                            </div>
                            <div className="text-zinc-200">
                              {formatCurrency(Math.round(s.activePrincipal))}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-zinc-500">
                              Est. value
                            </div>
                            <div className="text-zinc-200">
                              {formatCurrency(Math.round(s.currentValue))}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-zinc-500">Gain</div>
                            <div
                              className={
                                s.totalGain >= 0
                                  ? "text-emerald-300"
                                  : "text-rose-400"
                              }
                            >
                              {gainStr(s.totalGain)}
                            </div>
                          </div>
                        </div>

                        {withdrawFor === inv.id ? (
                          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2.5">
                            <div className="m-label text-amber-400">
                              Take money out
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[11px] text-zinc-400 block mb-1">
                                  Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className={`${field} font-mono`}
                                  value={wForm.amount}
                                  onChange={(e) =>
                                    setWForm({
                                      ...wForm,
                                      amount: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-zinc-400 block mb-1">
                                  On date
                                </label>
                                <input
                                  type="date"
                                  max={todayIso()}
                                  className={`${field} font-mono`}
                                  value={wForm.date}
                                  onChange={(e) =>
                                    setWForm({ ...wForm, date: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                            {(() => {
                              const amt = parseFloat(wForm.amount);
                              if (isNaN(amt) || amt <= 0) return null;
                              const pv = withdrawalPreview(
                                inv,
                                amt,
                                wForm.date,
                              );
                              return (
                                <div className="text-[11px] text-zinc-300">
                                  Held {pv.days}d · expected ≈{" "}
                                  <span className="font-mono">
                                    {formatCurrency(Math.round(pv.value))}
                                  </span>{" "}
                                  · profit{" "}
                                  <span
                                    className={`font-mono font-semibold ${
                                      pv.profit >= 0
                                        ? "text-emerald-300"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    {gainStr(pv.profit)}
                                  </span>
                                </div>
                              );
                            })()}
                            {wErr && (
                              <div className="text-[11px] text-rose-400">
                                {wErr}
                              </div>
                            )}
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setWithdrawFor(null)}
                                className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmWithdraw(inv)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-500 transition-colors"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        ) : (
                          s.activePrincipal > 0 && (
                            <button
                              type="button"
                              onClick={() => openWithdraw(inv)}
                              className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              Take money out
                            </button>
                          )
                        )}

                        {(lots.length > 0 || ws.length > 0) && (
                          <ul className="mt-2.5 space-y-1 border-t border-zinc-800/70 pt-2 text-[11px] font-mono">
                            {lots.map((l) => (
                              <li
                                key={l.id}
                                className="flex justify-between text-zinc-400"
                              >
                                <span>Bought {formatCurrency(l.amount)}</span>
                                <span>{l.date}</span>
                              </li>
                            ))}
                            {ws.map((w) => {
                              const pv = withdrawalPreview(inv, w.amount, w.date);
                              return (
                                <li
                                  key={w.id}
                                  className="flex justify-between text-zinc-400"
                                >
                                  <span>
                                    Redeemed {formatCurrency(w.amount)} ·{" "}
                                    <span
                                      className={
                                        pv.profit >= 0
                                          ? "text-emerald-300"
                                          : "text-rose-400"
                                      }
                                    >
                                      {gainStr(pv.profit)}
                                    </span>
                                  </span>
                                  <span>{w.date}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
