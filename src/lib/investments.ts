import type { Investment, InvestmentEntry } from "../types";

// Local-calendar helpers (timezone-safe).
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
export const todayIso = () => isoDate(new Date());
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const daysBetween = (fromIso: string, toIso: string) =>
  Math.max(
    0,
    Math.round((parse(toIso).getTime() - parse(fromIso).getTime()) / 86400000),
  );

/** amount × (1 + r)^(days / 365) */
export const expectedValue = (
  principal: number,
  annualRatePercent: number,
  days: number,
) => principal * Math.pow(1 + annualRatePercent / 100, days / 365);

const sum = (xs: InvestmentEntry[]) => xs.reduce((s, x) => s + x.amount, 0);

/** Migrate any legacy shape (amount/date/contributions) to staged/lots. */
export function normalize(inv: Investment): Investment {
  const lots: InvestmentEntry[] = [
    ...(inv.lots || []),
    ...(inv.amount && inv.date
      ? [{ id: `${inv.id}-open`, amount: inv.amount, date: inv.date }]
      : []),
    ...(inv.contributions || []),
  ];
  return {
    id: inv.id,
    name: inv.name,
    annualRatePercent: inv.annualRatePercent,
    minInvestment: inv.minInvestment ?? 100,
    staged: inv.staged || [],
    lots,
    withdrawals: inv.withdrawals || [],
    createdAt: inv.createdAt,
  };
}

export interface InvestmentSummary {
  investedPrincipal: number; // put into lots (before withdrawals)
  withdrawnPrincipal: number;
  activePrincipal: number; // still invested
  stagedTotal: number; // set aside, not yet bought
  outOfPocket: number; // activePrincipal + stagedTotal (money that left spending)
  daysHeld: number; // oldest active lot
  currentValue: number; // projected value of active lots
  unrealizedGain: number;
  realizedGain: number;
  totalGain: number;
  gainPercent: number;
  minInvestment: number;
  canBuy: boolean; // stagedTotal >= minInvestment
  shortBy: number; // how much more staging is needed to buy
}

export function summarize(inv: Investment, asOf: string): InvestmentSummary {
  const n = normalize(inv);
  const lots = n.lots || [];
  const ws = n.withdrawals || [];
  const staged = n.staged || [];

  const investedPrincipal = sum(lots);
  const withdrawnPrincipal = sum(ws);
  const activePrincipal = Math.max(0, investedPrincipal - withdrawnPrincipal);
  const stagedTotal = sum(staged);

  const grossValue = lots.reduce(
    (s, p) =>
      s + expectedValue(p.amount, inv.annualRatePercent, daysBetween(p.date, asOf)),
    0,
  );
  const activeFrac =
    investedPrincipal > 0 ? activePrincipal / investedPrincipal : 0;
  const currentValue = grossValue * activeFrac;
  const unrealizedGain = currentValue - activePrincipal;

  const oldest = lots.map((l) => l.date).sort()[0];
  const realizedGain = ws.reduce((s, w) => {
    const ref = oldest || w.date;
    return (
      s +
      (expectedValue(
        w.amount,
        inv.annualRatePercent,
        daysBetween(ref, w.date),
      ) -
        w.amount)
    );
  }, 0);

  const totalGain = realizedGain + unrealizedGain;
  return {
    investedPrincipal,
    withdrawnPrincipal,
    activePrincipal,
    stagedTotal,
    outOfPocket: activePrincipal + stagedTotal,
    daysHeld: oldest ? daysBetween(oldest, asOf) : 0,
    currentValue,
    unrealizedGain,
    realizedGain,
    totalGain,
    gainPercent:
      investedPrincipal > 0 ? (totalGain / investedPrincipal) * 100 : 0,
    minInvestment: n.minInvestment,
    canBuy: stagedTotal >= n.minInvestment && stagedTotal > 0,
    shortBy: Math.max(0, n.minInvestment - stagedTotal),
  };
}

export interface PortfolioSummary {
  investedPrincipal: number;
  activePrincipal: number;
  stagedTotal: number;
  currentValue: number;
  totalGain: number;
  realizedGain: number;
  gainPercent: number;
  count: number;
  readyToBuy: string[]; // fund names with staged ≥ min
}

export function portfolio(list: Investment[], asOf: string): PortfolioSummary {
  const acc: PortfolioSummary = {
    investedPrincipal: 0,
    activePrincipal: 0,
    stagedTotal: 0,
    currentValue: 0,
    totalGain: 0,
    realizedGain: 0,
    gainPercent: 0,
    count: list.length,
    readyToBuy: [],
  };
  for (const inv of list) {
    const s = summarize(inv, asOf);
    acc.investedPrincipal += s.investedPrincipal;
    acc.activePrincipal += s.activePrincipal;
    acc.stagedTotal += s.stagedTotal;
    acc.currentValue += s.currentValue;
    acc.totalGain += s.totalGain;
    acc.realizedGain += s.realizedGain;
    if (s.canBuy) acc.readyToBuy.push(inv.name);
  }
  acc.gainPercent =
    acc.investedPrincipal > 0
      ? (acc.totalGain / acc.investedPrincipal) * 100
      : 0;
  return acc;
}

/** Profit if `amount` of active principal is redeemed on `onDate`. */
export function withdrawalPreview(
  inv: Investment,
  amount: number,
  onDate: string,
) {
  const n = normalize(inv);
  const oldest = (n.lots || []).map((l) => l.date).sort()[0] || onDate;
  const d = daysBetween(oldest, onDate);
  const value = expectedValue(amount, inv.annualRatePercent, d);
  return { days: d, value, profit: value - amount };
}

/** Move `amount` of staged money into a purchased lot (FIFO across staged). */
export function executeBuy(
  inv: Investment,
  amount: number,
  onDate: string,
): Investment {
  const n = normalize(inv);
  let remaining = amount;
  const staged: InvestmentEntry[] = [];
  for (const s of n.staged || []) {
    if (remaining <= 0) {
      staged.push(s);
      continue;
    }
    if (s.amount <= remaining) {
      remaining -= s.amount;
    } else {
      staged.push({ ...s, amount: s.amount - remaining });
      remaining = 0;
    }
  }
  const bought = amount - Math.max(0, remaining);
  return {
    ...n,
    staged,
    lots: [
      ...(n.lots || []),
      { id: `lot-${Date.now()}`, amount: bought, date: onDate },
    ],
  };
}
