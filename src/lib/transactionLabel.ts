// Gives each wallet withdrawal / debit a specific, human label instead of a generic "Withdrawal".
const parse = (m: unknown): any => {
  if (!m) return {};
  if (typeof m === 'string') { try { return JSON.parse(m); } catch { return {}; } }
  return m as any;
};

export function getSpecificWithdrawalLabel(entry: { entry_type: string; amount?: number | string; metadata?: unknown; reference?: string | null }): string | null {
  if (entry.entry_type !== 'WITHDRAWAL') return null;
  const meta = parse(entry.metadata);
  const t = String(meta.type || '').toLowerCase();
  const ch = String(meta.channel || '').toUpperCase();
  const ref = String(entry.reference || '').toUpperCase();
  const amt = Number(entry.amount) || 0;

  if (t === 'investment_lock') return 'Invest & Earn Deposit';
  if (t === 'auto_salary_investment') return 'Salary Auto-Invest';
  if (t === 'wallet_transfer' || t === 'wallet_transfer_out') return amt >= 0 ? 'Wallet Transfer Received' : 'Wallet-to-Wallet Transfer';
  if (t === 'internal_transfer_credit') return 'Internal Transfer';
  if (t === 'transfer_reversal' || t === 'wallet_transfer_reversal') return 'Transfer Reversal';
  if (t === 'admin_cash_withdrawal' || ch === 'CASH') return 'Cash Withdrawal';
  if (ch === 'BANK_DEPOSIT' || ref.startsWith('BNK-')) return 'Bank Withdrawal';
  if (t === 'instant_withdrawal') {
    return meta.payment_provider === 'gosente' || meta.provider === 'gosente'
      ? 'Mobile Money Withdrawal (GosentePay)'
      : 'Mobile Money Withdrawal';
  }
  if (ch === 'MOBILE_MONEY') return 'Mobile Money Withdrawal';
  if (t === 'overdraft_interest') return 'Overdraft Interest';
  if (t.startsWith('overdraft_penalty')) return 'Overdraft Penalty';
  if (t === 'overdraft_fee') return 'Overdraft Fee';
  if (t === 'overdraft_draw') return 'Overdraft Draw';
  if (t === 'overdraft_recovery' || t === 'overdraft_repayment') return 'Overdraft Repayment';
  if (t === 'correction') return 'Correction';
  if (meta.source === 'balance_check_fee' || ref.startsWith('BALCHK-')) return 'Balance Check Fee';
  if (ref.startsWith('LOAN-RECON')) return 'Loan Reconciliation Recovery';
  if (ref.startsWith('STMT') ) return 'Statement Fee';
  return null;
}
