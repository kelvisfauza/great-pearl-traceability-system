// Shared loan maths used by the borrower application flow (QuickLoans) and the
// admin review / terms-revision flow (LoanReviewModal). Single source of truth.

export type LoanType = 'quick' | 'long_term' | 'pure_salary' | 'business';
export type RepaymentFrequency = 'weekly' | 'monthly' | 'bullet';

export const LOAN_TYPE_CONFIG: Record<LoanType, { label: string; monthlyRate: number; maxRate: number; description: string; frequencies: RepaymentFrequency[]; maxMonths?: number; requiresGuarantor?: boolean; guarantorsRequired?: number; minAmount?: number }> = {
  quick: { label: 'Quick Loan', monthlyRate: 10, maxRate: 35, description: '10%/month base – Short-term, weekly repayments (total interest cap 35%)', frequencies: ['weekly'], maxMonths: 6, requiresGuarantor: true, guarantorsRequired: 1 },
  long_term: { label: 'Long-Term Loan', monthlyRate: 10, maxRate: 35, description: '10%/month base – Flexible repayment, monthly or bullet (total interest cap 35%)', frequencies: ['monthly', 'bullet'], maxMonths: 6, requiresGuarantor: true, guarantorsRequired: 1 },
  pure_salary: { label: 'Pure Salary Loan', monthlyRate: 15, maxRate: 45, description: '15%/month – Repaid by 50% of monthly salary (no guarantor, max 3 months)', frequencies: ['monthly'], maxMonths: 3, requiresGuarantor: false },
  business: { label: 'Employee Business Loan', monthlyRate: 4, maxRate: 30, description: '4%/month – Low-rate business capital, minimum UGX 500,000, flexible monthly repayment up to 8 months, 2 guarantors required (total interest cap 30%)', frequencies: ['monthly'], maxMonths: 8, requiresGuarantor: true, guarantorsRequired: 2, minAmount: 500000 },
};

export const getGuarantorsRequired = (t: LoanType) =>
  LOAN_TYPE_CONFIG[t].requiresGuarantor === false ? 0 : (LOAN_TYPE_CONFIG[t].guarantorsRequired ?? 1);

/** Daily interest rate derived from the monthly rate. */
export const getDailyRate = (loanType: LoanType) => LOAN_TYPE_CONFIG[loanType].monthlyRate / 30;

/** Total days and weeks for a duration in months (4 weeks per month). */
export const getLoanSchedule = (months: number) => ({
  totalDays: months * 30,
  totalWeeks: months * 4,
});

/** Total interest, capped at maxRate of principal. */
export const getCappedInterest = (principal: number, monthlyRate: number, months: number, maxRate: number) => {
  const rawInterest = principal * (monthlyRate / 100) * months;
  const maxInterest = principal * (maxRate / 100);
  return Math.min(rawInterest, maxInterest);
};

export interface ComputedLoanTerms {
  principal: number;
  months: number;
  frequency: RepaymentFrequency;
  interest: number;
  totalRepayable: number;
  numInstallments: number;
  installment: number;
  monthlyRate: number;
  maxRate: number;
}

/**
 * Recompute the full commercial terms of a loan from principal, type, duration
 * and repayment frequency. `salary` is only used for pure salary loans, whose
 * installment is capped at 50% of monthly salary.
 */
export const computeLoanTerms = (
  principal: number,
  loanType: LoanType,
  months: number,
  frequency: RepaymentFrequency,
  salary?: number,
): ComputedLoanTerms => {
  const cfg = LOAN_TYPE_CONFIG[loanType] || LOAN_TYPE_CONFIG.quick;
  const amount = Math.max(0, Math.round(principal || 0));
  const m = Math.max(1, Math.round(months || 1));
  const { totalWeeks } = getLoanSchedule(m);

  const interest = frequency === 'bullet'
    ? amount * 0.35
    : getCappedInterest(amount, cfg.monthlyRate, m, cfg.maxRate);
  const totalRepayable = Math.ceil(amount + interest);

  let numInstallments = m;
  if (frequency === 'bullet') numInstallments = 1;
  else if (frequency === 'weekly') numInstallments = totalWeeks;

  let installment = numInstallments > 0 ? Math.ceil(totalRepayable / numInstallments) : totalRepayable;

  if (loanType === 'pure_salary' && salary && salary > 0) {
    const halfSalary = Math.floor(salary * 0.5);
    if (halfSalary > 0) installment = Math.min(installment, halfSalary);
  }

  return {
    principal: amount,
    months: m,
    frequency,
    interest: Math.ceil(interest),
    totalRepayable,
    numInstallments,
    installment,
    monthlyRate: cfg.monthlyRate,
    maxRate: cfg.maxRate,
  };
};
