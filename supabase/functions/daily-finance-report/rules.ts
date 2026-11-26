export const FINANCE_CRON = '0 17 * * *';
export function openPartialPayments(rows: any[]) {
  return rows.filter(r => !['rejected','balance_rejected','cancelled','completed'].includes(String(r.status).toLowerCase()));
}
export function reportWindow(date: string, test: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date) throw new Error('Invalid report date');
  const start = new Date(`${date}T00:00:00+03:00`);
  const end = test ? new Date(start.getTime()+86400000) : new Date(`${date}T20:00:00+03:00`);
  return {start:start.toISOString(),end:end.toISOString()};
}
export function accountTotals(accounts: any[]) {
  return accounts.reduce((t,a)=>({opening:t.opening+Number(a.opening),closing:t.closing+Number(a.closing),credits:t.credits+Number(a.credits),debits:t.debits+Number(a.debits)}),{opening:0,closing:0,credits:0,debits:0});
}

// Only the account journal contributes cash totals; pool entries and receipts
// overlap it. A wallet transfer stays internal even on legacy external legs.
export function financeSummary(snapshot: any) {
  const rows = snapshot.account_entries ?? [];
  const internalSources = ['INTERNAL_TRANSFER','TRANSFER_INTERNAL','TRANSFER_IN','TRANSFER_OUT','ADMIN_ADJUSTMENT'];
  const correction = (e: any) => e.metadata?.correction === true || e.metadata?.reconciliation === true ||
    ['RECONCILIATION','ADJUSTMENT'].includes(e.metadata?.source) || /^(RECON-|FIX-)/.test(e.reference ?? '');
  const external = rows.filter((e: any) => e.counter_account === 'external' && !internalSources.includes(e.metadata?.source) && !correction(e));
  const debits = external.filter((e: any) => e.direction === 'debit');
  const refunds = external.filter((e: any) => e.direction === 'credit' && (
    e.metadata?.external_payout_reversal === true || e.metadata?.kind === 'provider_fee_refund' ||
    e.metadata?.source === 'REFUND' || String(e.metadata?.meta_type ?? '').includes('refund')
  ));
  const sum = (entries: any[]) => entries.reduce((n, e) => n + Number(e.amount ?? 0), 0);
  const withdrawal = (e: any) => ['WITHDRAWAL','INSTANT_WITHDRAWAL'].includes(e.metadata?.source);
  const fee = (e: any) => e.metadata?.kind === 'provider_fee' || e.report_category === 'provider_fee';
  const category = (e: any) => e.report_category ?? e.metadata?.request_type ?? (e.metadata?.service_provider_payment_id ? 'service_provider' : null);
  const metric = (entries: any[]) => ({ amount: sum(entries), count: new Set(entries.map(e => e.reference ?? e.id)).size });
  const payments = debits.filter((e: any) => !withdrawal(e) && !fee(e));
  const investment = (snapshot.accounts ?? []).find((a: any) => a.code === 'invest_earn');
  const profitAccounts = (snapshot.accounts ?? []).filter((a: any) => ['profits','fees_income'].includes(a.code));
  const p = snapshot.profit_loss;
  const hasProfit = Number(p?.line_count) > 0 && p?.balanced === true && Number(p?.unclassified_lines) === 0;
  return {
    withdrawals: metric(debits.filter(withdrawal)), payments: metric(payments),
    mealPlans: metric(payments.filter((e: any) => category(e) === 'meal_plan')),
    serviceProviders: metric(payments.filter((e: any) => category(e) === 'service_provider')),
    otherPayments: metric(payments.filter((e: any) => !['meal_plan','service_provider'].includes(category(e)))),
    providerCharges: sum(debits.filter(fee)), externalDebits: sum(debits), refunds: sum(refunds),
    netExternalOutflow: sum(debits) - sum(refunds),
    reconciliationNet: sum(rows.filter((e: any) => e.counter_account === 'external' && correction(e)).map((e: any) => ({amount: e.direction === 'credit' ? Number(e.amount) : -Number(e.amount)}))),
    investmentCredits: investment == null ? null : Number(investment.credits),
    investmentClosing: investment == null ? null : Number(investment.closing),
    profitAccountCredits: profitAccounts.length ? sum(profitAccounts.map((a: any) => ({ amount: a.credits }))) : null,
    revenue: hasProfit ? Number(p.revenue) : null,
    costOfSales: hasProfit ? Number(p.cost_of_sales) : null,
    grossProfit: hasProfit ? Number(p.revenue) - Number(p.cost_of_sales) : null,
    operatingExpenses: hasProfit ? Number(p.operating_expenses) : null,
    netProfit: hasProfit ? Number(p.revenue) - Number(p.cost_of_sales) - Number(p.operating_expenses) : null,
  };
}
