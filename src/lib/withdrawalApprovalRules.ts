// Who must approve a withdrawal before Finance can release the money.
//
// Withdrawals above WITHDRAWAL_SECOND_APPROVER_THRESHOLD need a second, different
// administrator. Everything at or below it needs one administrator, then Finance
// releases the payment. Other request types keep the older 50,000 two-administrator
// rule, so this module must be asked with the withdrawal flag.

export const WITHDRAWAL_SECOND_APPROVER_THRESHOLD = 150000;

// Requests that are not withdrawals still need two admins above this amount.
export const GENERAL_SECOND_APPROVER_THRESHOLD = 50000;

/** True when the request is a wallet withdrawal, whatever screen created it. */
export const isWithdrawalRequest = (requestType?: string | null, details?: any): boolean => {
  const type = String(requestType || '').toLowerCase();
  if (type.includes('withdrawal')) return true;
  if (details?.is_withdrawal === true) return true;
  if (String(details?.request_type || '').toLowerCase() === 'withdrawal') return true;
  return false;
};

/** The amount above which a second administrator is required. */
export const secondApproverThresholdFor = (isWithdrawal: boolean): number =>
  isWithdrawal ? WITHDRAWAL_SECOND_APPROVER_THRESHOLD : GENERAL_SECOND_APPROVER_THRESHOLD;

/** True when a second, different administrator must approve before Finance. */
export const needsSecondAdminApproval = (
  amount: string | number | null | undefined,
  isWithdrawal: boolean,
): boolean => (Number(amount) || 0) > secondApproverThresholdFor(isWithdrawal);

/** Stored on a withdrawal at submission so the withdrawal screens know it is high value. */
export const withdrawalHighValueFlag = (amount: string | number | null | undefined): boolean =>
  (Number(amount) || 0) > WITHDRAWAL_SECOND_APPROVER_THRESHOLD;
