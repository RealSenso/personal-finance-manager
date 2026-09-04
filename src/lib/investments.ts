import type { Investment } from "../types";

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

export interface InvestmentSummary {
  invested: number; // original lump sum
  withdrawnPrincipal: number; // principal already taken out
  activePrincipal: number; // still invested
  daysHeld: number; // active principal, as of `asOf`
  currentValue: number; // projected value of active principal
  unrealizedGain: number; // currentValue − activePrincipal
  realizedGain: number; // profit locked in through withdrawals
  totalGain: number; // realized + unrealized
  gainPercent: number; // totalGain / invested
}

export function summarize(inv: Investment, asOf: string): InvestmentSummary {
  const ws = inv.withdrawals || [];
  const contribs = inv.contributions || [];

  // Every slice of principal, valued from its own start date.
  const parts = [
    { amount: inv.amount, date: inv.date },
    ...contribs.map((c) => ({ amount: c.amount, date: c.date })),
  ];
  const grossPrincipal = parts.reduce((s, p) => s + p.amount, 0);
  const withdrawnPrincipal = ws.reduce((s, w) => s + w.amount, 0);
  const activePrincipal = Math.max(0, grossPrincipal - withdrawnPrincipal);

  const grossValue = parts.reduce(
    (s, p) =>
      s +
      expectedValue(
        p.amount,
        inv.annualRatePercent,
        daysBetween(p.date, asOf),
      ),
    0,
  );
  // Withdrawals reduce principal pro-rata across the parts.
  const activeFrac = grossPrincipal > 0 ? activePrincipal / grossPrincipal : 0;
  const currentValue = grossValue * activeFrac;
  const unrealizedGain = currentValue - activePrincipal;

  const realizedGain = ws.reduce((s, w) => {
    const d = daysBetween(inv.date, w.date);
    return s + (expectedValue(w.amount, inv.annualRatePercent, d) - w.amount);
  }, 0);

  const daysHeld = daysBetween(inv.date, asOf);
  const totalGain = realizedGain + unrealizedGain;
  return {
    invested: grossPrincipal,
    withdrawnPrincipal,
    activePrincipal,
    daysHeld,
    currentValue,
    unrealizedGain,
    realizedGain,
    totalGain,
    gainPercent: grossPrincipal > 0 ? (totalGain / grossPrincipal) * 100 : 0,
  };
}

export interface PortfolioSummary {
  invested: number;
  activePrincipal: number;
  currentValue: number;
  unrealizedGain: number;
  realizedGain: number;
  totalGain: number;
  gainPercent: number;
  count: number;
}

export function portfolio(
  list: Investment[],
  asOf: string,
): PortfolioSummary {
  const acc: PortfolioSummary = {
    invested: 0,
    activePrincipal: 0,
    currentValue: 0,
    unrealizedGain: 0,
    realizedGain: 0,
    totalGain: 0,
    gainPercent: 0,
    count: list.length,
  };
  for (const inv of list) {
    const s = summarize(inv, asOf);
    acc.invested += s.invested;
    acc.activePrincipal += s.activePrincipal;
    acc.currentValue += s.currentValue;
    acc.unrealizedGain += s.unrealizedGain;
    acc.realizedGain += s.realizedGain;
    acc.totalGain += s.totalGain;
  }
  acc.gainPercent =
    acc.invested > 0 ? (acc.totalGain / acc.invested) * 100 : 0;
  return acc;
}

/** Profit if `amount` of a lot's principal is withdrawn on `onDate`. */
export function withdrawalPreview(
  inv: Investment,
  amount: number,
  onDate: string,
) {
  const d = daysBetween(inv.date, onDate);
  const value = expectedValue(amount, inv.annualRatePercent, d);
  return { days: d, value, profit: value - amount };
}
