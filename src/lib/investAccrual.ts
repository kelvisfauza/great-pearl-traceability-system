export interface InvestRow { amount: number; interest_rate: number; start_date: string; maturity_date: string; status: string; earned_interest: number }

/** Interest accumulated so far. Active: pro-rata by days elapsed toward the full rate at maturity. Closed: the saved earned interest. */
export function accruedInterest(inv: InvestRow, today = new Date()): number {
  if (inv.status !== "active") return Number(inv.earned_interest) || 0;
  const start = new Date(inv.start_date + "T00:00:00").getTime();
  const end = new Date(inv.maturity_date + "T00:00:00").getTime();
  const total = Math.max(1, end - start);
  const frac = Math.min(1, Math.max(0, (today.getTime() - start) / total));
  return Number(inv.amount) * (Number(inv.interest_rate) / 100) * frac;
}
