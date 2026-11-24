export function ownedDepositMatches(
  row: { user_id: string; amount: unknown; phone: string; status: string; transaction_type: string } | null,
  userId: string,
  amount: number,
  phone: string,
): boolean {
  return !!row && row.user_id === userId && Number(row.amount) === amount && row.phone === phone &&
    Number.isFinite(amount) && amount >= 500 && row.status === 'pending' &&
    ['deposit', 'loan_repayment'].includes(row.transaction_type);
}