// Edge-function copy of statutory calculations. Keep in sync with src/lib/payroll/statutory.ts.
export const NSSF_EMPLOYEE_RATE = 0.05;
export const NSSF_EMPLOYER_RATE = 0.10;

export function calculateNSSF(gross: number, exempt = false) {
  if (exempt || gross <= 0) return { employee: 0, employer: 0, total: 0 };
  const employee = Math.round(gross * NSSF_EMPLOYEE_RATE);
  const employer = Math.round(gross * NSSF_EMPLOYER_RATE);
  return { employee, employer, total: employee + employer };
}

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

export function calculatePayroll(gross: number, opts: { nssfExempt?: boolean; payeExempt?: boolean } = {}) {
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