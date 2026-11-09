import { getGuarantorsRequired, type LoanType } from './loanMath';

export const LOAN_REVIEW_STATUSES = ['pending_admin', 'pending_guarantor', 'revision_pending_signature', 'counter_offered'];

export function loanApprovalBlock(loan: any, actorEmail: string | undefined, admin: boolean): string | null {
  const actor = actorEmail?.trim().toLowerCase();
  if (!admin || !actor) return 'Administrator access is required.';
  if (actor === loan.employee_email?.toLowerCase()) return 'Another administrator must review your own loan.';
  if ([loan.guarantor_email, loan.guarantor2_email].some(email => email?.toLowerCase() === actor)) return 'Another administrator must approve a loan you guarantee.';
  if (loan.status !== 'pending_admin' || loan.admin_approved) return 'This loan is not awaiting administrator approval.';
  const type = (loan.loan_type || 'quick') as LoanType;
  if (!['quick', 'long_term', 'business', 'pure_salary'].includes(type)) return 'The loan type needs review.';
  const required = getGuarantorsRequired(type);
  if (required >= 1 && (!loan.guarantor_email || !loan.guarantor_approved || loan.guarantor_declined || loan.guarantor_email.toLowerCase() === loan.employee_email?.toLowerCase())) return 'The required guarantor must approve first.';
  if (required >= 2 && (!loan.guarantor2_email || !loan.guarantor2_approved || loan.guarantor2_declined || [loan.employee_email, loan.guarantor_email].some(email => email?.toLowerCase() === loan.guarantor2_email.toLowerCase()))) return 'Both distinct guarantors must approve first.';
  if (!loan.terms_accepted || !loan.terms_signature?.trim()) return 'The borrower must sign the loan terms first.';
  if (loan.revision_amount != null && (!loan.revision_signed_at || !loan.revision_signature?.trim() || loan.revision_declined_reason?.trim())) return 'The borrower must accept and sign the revised terms first.';
  return null;
}