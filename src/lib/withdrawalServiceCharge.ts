export function withdrawalServiceCharge(amount: number): number {
  if (!Number.isFinite(amount) || amount < 500) return 0;
  if (amount <= 60_000) return 1_100;
  if (amount <= 500_000) return 1_700;
  if (amount <= 1_000_000) return 2_500;
  return 2_900;
}