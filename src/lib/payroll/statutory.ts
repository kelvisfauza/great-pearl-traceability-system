// Uganda statutory payroll calculations (NSSF + URA PAYE).
// Pure functions — used by both UI preview and edge functions.

export const NSSF_EMPLOYEE_RATE = 0.05;
export const NSSF_EMPLOYER_RATE = 0.10;

export interface NSSFBreakdown {
  employee: number;
  employer: number;
  total: number;
}

export function calculateNSSF(gross: number, exempt = false): NSSFBreakdown {
  if (exempt || gross <= 0) return { employee: 0, employer: 0, total: 0 };
  const employee = Math.round(gross * NSSF_EMPLOYEE_RATE);
  const employer = Math.round(gross * NSSF_EMPLOYER_RATE);
  return { employee, employer, total: employee + employer };
}

/**
 * Uganda Revenue Authority monthly PAYE bands (resident individuals).
 *  ≤ 235,000                     → 0
 *  235,001 – 335,000             → 10% of (x − 235,000)
 *  335,001 – 410,000             → 10,000 + 20% of (x − 335,000)
 *  410,001 – 10,000,000          → 25,000 + 30% of (x − 410,000)
 *  > 10,000,000                  → above + additional 10% of (x − 10,000,000)
 */
export function calculatePAYE(taxable: number, exempt = false): number {
  if (exempt || taxable <= 235_000) return 0;
  let tax = 0;
  if (taxable <= 335_000) {
    tax = 0.10 * (taxable - 235_000);
  } else if (taxable <= 410_000) {
    tax = 10_000 + 0.20 * (taxable - 335_000);
  } else if (taxable <= 10_000_000) {
    tax = 25_000 + 0.30 * (taxable - 410_000);
  } else {
    const base = 25_000 + 0.30 * (10_000_000 - 410_000);
    tax = base + 0.30 * (taxable - 10_000_000) + 0.10 * (taxable - 10_000_000);
  }
  return Math.round(tax);
}

export interface PayrollBreakdown {
  gross: number;
  nssfEmployee: number;
  nssfEmployer: number;
  nssfTotal: number;
  taxableIncome: number;
  paye: number;
  statutoryDeduction: number; // nssfEmployee + paye
  net: number;                // before non-statutory deductions (advance, time)
}

export interface PayrollOptions {
  nssfExempt?: boolean;
  payeExempt?: boolean;
}

export function calculatePayroll(gross: number, opts: PayrollOptions = {}): PayrollBreakdown {
  const g = Math.max(0, Number(gross) || 0);
  const nssf = calculateNSSF(g, opts.nssfExempt);
  const taxable = Math.max(0, g - nssf.employee);
  const paye = calculatePAYE(taxable, opts.payeExempt);
  const statutory = nssf.employee + paye;
  return {
    gross: g,
    nssfEmployee: nssf.employee,
    nssfEmployer: nssf.employer,
    nssfTotal: nssf.total,
    taxableIncome: taxable,
    paye,
    statutoryDeduction: statutory,
    net: Math.max(0, g - statutory),
  };
}

export function fmtUGX(n: number): string {
  return `UGX ${Math.round(Number(n) || 0).toLocaleString()}`;
}