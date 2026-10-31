// GosentePay payout service fees (seen on GosentePay receipts, Oct 2026).
// Above UGX 60,000 the fee is 2,200; at or below it, 1,600 (seen on a 30,000 payout).
export function gosenteWithdrawFee(amount: number): number {
  return Number(amount) > 60000 ? 2200 : 1600;
}
