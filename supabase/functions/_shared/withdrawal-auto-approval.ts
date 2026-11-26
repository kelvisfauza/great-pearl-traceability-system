// Automatic approval for small mobile-money wallet withdrawals (owner rules, Nov 2026).
export const WITHDRAWAL_AUTO_LIMIT = 30000; // strictly below
export const TRANSFER_CATEGORIES = ['INTERNAL_TRANSFER', 'TRANSFER_IN'];
export const POINTS_CATEGORIES = ['SYSTEM_AWARD', 'LOYALTY', 'LOYALTY_REWARD', 'BONUS'];
export const WORK_ACTIVITY_DAYS = 3; // must have signed in or attended within this many days
export const POINTS_ENTRY_TYPES = ['LOYALTY_REWARD', 'BONUS'];

export interface WithdrawalAutoInput {
  amount: number;
  fee: number;
  channel: string;
  walletBalance: number;      // ledger balance
  availableBalance: number;   // after pending holds
  recentTransferIn: number;   // fellow-employee transfers received in the review window
  recentUnconfirmedPoints: number; // points/rewards credited in the window with no treasury backing
  otherWithdrawalsToday: number;
  payoutBalance: number;      // GosentePay
  payoutFee: number;
  walletFrozen: boolean;
  employeeActive?: boolean;   // employee record Active and not disabled
  onLeave?: boolean;          // approved leave covers today
  suspended?: boolean;        // active suspension
  daysSinceLastWork?: number | null; // days since last sign-in or attendance; null = never
}

export type Decision = { decision: 'approve' | 'manual' | 'reject'; reasons: string[]; watch: boolean };

export function evaluateWithdrawalAutoApproval(i: WithdrawalAutoInput): Decision {
  const need = i.amount + i.fee;
  const usable = Math.min(i.walletBalance, i.availableBalance);
  const watch = i.otherWithdrawalsToday >= 1;
  if (i.recentTransferIn > 0 && usable - i.recentTransferIn < need) {
    return { decision: 'reject', reasons: ['This withdrawal uses money transferred from a fellow employee'], watch };
  }
  const reasons: string[] = [];
  if (i.amount >= WITHDRAWAL_AUTO_LIMIT) reasons.push(`Amount is UGX ${WITHDRAWAL_AUTO_LIMIT.toLocaleString()} or more`);
  if (i.channel !== 'MOBILE_MONEY') reasons.push('Only mobile money withdrawals are paid automatically');
  if (i.walletFrozen) reasons.push('Wallet is frozen');
  if (i.employeeActive === false) reasons.push('Employee is not active');
  if (i.suspended) reasons.push('Employee is suspended');
  if (i.onLeave) reasons.push('Employee is on leave');
  if (i.daysSinceLastWork !== undefined && (i.daysSinceLastWork === null || i.daysSinceLastWork > WORK_ACTIVITY_DAYS))
    reasons.push(i.daysSinceLastWork === null ? 'No record of the employee working' : `No work activity in the last ${WORK_ACTIVITY_DAYS} days`);
  if (usable < need) reasons.push('Wallet cannot cover the amount and charge without overdraft');
  else if (i.recentUnconfirmedPoints > 0 && usable - i.recentUnconfirmedPoints < need) reasons.push('Depends on points or rewards that are not yet confirmed');
  if (watch) reasons.push(`Employee already made ${i.otherWithdrawalsToday} other withdrawal(s) today`);
  if (i.payoutBalance < i.amount + i.payoutFee) reasons.push('Not enough money on GosentePay');
  return { decision: reasons.length ? 'manual' : 'approve', reasons, watch };
}
