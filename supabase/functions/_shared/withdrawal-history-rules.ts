export function canReadWithdrawalHistory(active: boolean, finance: boolean, admin: boolean): boolean {
  return active && (finance || admin);
}

export function historyPage(value: unknown): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 100000) : 0;
}

export const HISTORY_PAGE_SIZE = 50;