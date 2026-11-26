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
