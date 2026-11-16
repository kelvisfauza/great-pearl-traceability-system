type Transaction = { amount: number | string; created_at: string; source_category: string | null; reference?: string | null };

export function employmentEvidence(joinDate: string | null, now: Date) {
  const joined = joinDate ? new Date(joinDate) : null;
  if (!joined || !Number.isFinite(joined.getTime()) || joined > now) {
    return { join_date: null, tenure_months: 0, eligible: false };
  }
  let months = (now.getUTCFullYear() - joined.getUTCFullYear()) * 12 + now.getUTCMonth() - joined.getUTCMonth();
  const anniversary = new Date(joined);
  anniversary.setUTCDate(1);
  anniversary.setUTCMonth(joined.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(anniversary.getUTCFullYear(), anniversary.getUTCMonth() + 1, 0)).getUTCDate();
  anniversary.setUTCDate(Math.min(joined.getUTCDate(), lastDay));
  if (anniversary > now) months--;
  return { join_date: joined.toISOString(), tenure_months: Math.max(0, months), eligible: months >= 6 };
}

export function accountEvidence(rows: Transaction[], walletBalance: number, joinDate: string | null, now: Date) {
  const employment = employmentEvidence(joinDate, now);
  const categories: Record<string, { count: number; credits: number; debits: number }> = {};
  const activeMonths = new Set<string>();
  let credits = 0, debits = 0, salaryCredits = 0, borrowedCredits = 0;
  for (const row of rows) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || !Number.isFinite(new Date(row.created_at).getTime())) {
      throw new Error("Account transaction evidence is invalid; review the saved transactions before evaluating.");
    }
    const category = row.source_category || "UNCLASSIFIED";
    const group = categories[category] || { count: 0, credits: 0, debits: 0 };
    group.count++;
    group.credits += Math.max(0, amount);
    group.debits += Math.max(0, -amount);
    categories[category] = group;
    credits += Math.max(0, amount);
    debits += Math.max(0, -amount);
    if (category === "SALARY") salaryCredits += Math.max(0, amount);
    if (category === "LOAN_DISBURSEMENT") borrowedCredits += Math.max(0, amount);
    if (amount !== 0) activeMonths.add(row.created_at.slice(0, 7));
  }
  const reasons: string[] = [];
  if (!employment.join_date) reasons.push("Joining date is missing, invalid or in the future — HR must confirm it first");
  else if (!employment.eligible) reasons.push(`Employment is ${employment.tenure_months} completed month(s) — business loans require at least 6 months`);
  if (rows.length === 0) reasons.push("No saved wallet transactions in the last 6 months — account activity cannot be verified");
  if (walletBalance < 0) reasons.push(`Wallet is negative by UGX ${Math.round(-walletBalance).toLocaleString()} — clear the account shortfall first`);
  return {
    ...employment, checked_at: now.toISOString(), transaction_count: rows.length,
    active_months: activeMonths.size, credits, debits, net_movement: credits - debits,
    salary_credits: salaryCredits, loan_disbursement_credits: borrowedCredits,
    categories, blocking_reasons: reasons,
  };
}

export function enforceBusinessVerdict(decision: string, amount: number, ceiling: number, reasons: string[]) {
  const limit = Math.max(0, Number.isFinite(ceiling) ? ceiling : 0);
  if (reasons.length || decision === "deny" || limit === 0) return { decision: "deny", amount: 0, limit: 0 };
  return { decision, amount: Math.max(0, Math.min(Number.isFinite(amount) ? amount : 0, limit)), limit };
}