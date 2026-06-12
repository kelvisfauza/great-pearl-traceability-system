import { supabase } from '@/integrations/supabase/client';
import { generateLoanAgreementPdf } from './loanAgreementPdf';

/**
 * Generates a loan agreement PDF for an existing loan, uploads it to storage,
 * and emails it to the borrower (with operations CC'd via the standard template).
 * Works for pure-salary, quick, and long-term loans.
 */
export async function sendLoanAgreement(loanId: string, approverName = 'Administration'): Promise<{ ok: true; pdfUrl: string } | { ok: false; error: string }> {
  try {
    const { data: loan, error: loanErr } = await (supabase as any)
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .maybeSingle();
    if (loanErr || !loan) return { ok: false, error: loanErr?.message || 'Loan not found' };

    const isPureSalary = loan.loan_type === 'pure_salary';
    const isWeekly = (loan.repayment_frequency || 'monthly') === 'weekly';
    const numInstallments: number = isPureSalary
      ? Math.max(1, Math.ceil(Number(loan.total_repayable) / Number(loan.monthly_installment || 1)))
      : isWeekly
        ? (loan.total_weeks || Math.ceil((loan.duration_months * 30) / 7))
        : loan.duration_months;
    const installmentAmount: number = isPureSalary
      ? Number(loan.monthly_installment || Math.ceil(loan.total_repayable / loan.duration_months))
      : isWeekly
        ? Math.ceil(loan.total_repayable / numInstallments)
        : Math.ceil(loan.total_repayable / loan.duration_months);
    const scheduleLabel = isPureSalary ? 'month (27th payroll)' : isWeekly ? 'week' : 'month';

    // Earliest pending installment = first deduction date
    const { data: schedule } = await (supabase as any)
      .from('loan_repayments')
      .select('due_date')
      .eq('loan_id', loanId)
      .order('due_date', { ascending: true })
      .limit(1);
    const firstDue = schedule?.[0]?.due_date ? new Date(schedule[0].due_date) : new Date();

    const { data: borrowerEmp } = await supabase
      .from('employees')
      .select('phone, position, department, salary')
      .eq('email', loan.employee_email)
      .maybeSingle();
    const { data: guarantorEmp } = loan.guarantor_name
      ? await supabase.from('employees').select('phone, email').eq('name', loan.guarantor_name).maybeSingle()
      : { data: null as any };

    const loanTypeLabel = isPureSalary
      ? 'Pure Salary Loan'
      : loan.loan_type === 'long_term'
        ? 'Long-Term Loan'
        : 'Quick Loan';

    const fmtDate = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const start = loan.created_at ? new Date(loan.created_at) : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(loan.duration_months || numInstallments));

    const pdfBlob = generateLoanAgreementPdf({
      loanId: loan.id,
      loanType: loanTypeLabel,
      principal: Number(loan.loan_amount),
      interestRate: Number(loan.interest_rate),
      dailyRate: Number(loan.daily_interest_rate || (Number(loan.interest_rate) / 30).toFixed(2)),
      durationMonths: Number(loan.duration_months || numInstallments),
      totalRepayable: Number(loan.total_repayable),
      remainingBalance: Number(loan.remaining_balance ?? loan.total_repayable),
      installmentAmount,
      installmentFrequency: scheduleLabel,
      numInstallments,
      startDate: fmtDate(start),
      endDate: fmtDate(end),
      firstDeductionDate: fmtDate(firstDue),
      approvedBy: approverName,
      approvalDate: fmtDate(new Date()),
      disbursedAmount: Number(loan.loan_amount),
      isTopUp: false,
      employeeName: loan.employee_name,
      employeeEmail: loan.employee_email,
      employeeId: '',
      employeePhone: borrowerEmp?.phone || loan.employee_phone || '',
      employeePosition: borrowerEmp?.position || '',
      employeeDepartment: borrowerEmp?.department || '',
      employeeSalary: borrowerEmp?.salary || 0,
      guarantorName: loan.guarantor_name || '',
      guarantorEmail: guarantorEmp?.email || loan.guarantor_email || '',
      guarantorPhone: guarantorEmp?.phone || '',
    });

    const pdfPath = `loan-agreements/LOAN-${loan.id.substring(0, 8)}-${Date.now()}.pdf`;
    const pdfFile = new File([pdfBlob], pdfPath.split('/').pop()!, { type: 'application/pdf' });
    const { error: upErr } = await supabase.storage.from('loan-documents').upload(pdfPath, pdfFile, { upsert: true });
    if (upErr) return { ok: false, error: `PDF upload failed: ${upErr.message}` };
    const { data: signed } = await supabase.storage
      .from('loan-documents')
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 30);
    const pdfUrl = signed?.signedUrl || '';

    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'loan-approval-details',
        recipientEmail: loan.employee_email,
        idempotencyKey: `loan-agreement-${loan.id}-${Date.now()}`,
        templateData: {
          employeeName: loan.employee_name,
          loanAmount: Number(loan.loan_amount).toLocaleString(),
          interestRate: String(loan.interest_rate),
          dailyRate: String(loan.daily_interest_rate || (Number(loan.interest_rate) / 30).toFixed(2)),
          durationMonths: String(loan.duration_months),
          totalRepayable: Number(loan.total_repayable).toLocaleString(),
          installmentAmount: installmentAmount.toLocaleString(),
          installmentFrequency: scheduleLabel,
          numInstallments: String(numInstallments),
          firstDeductionDate: fmtDate(firstDue),
          guarantorName: loan.guarantor_name || '',
          loanType: loanTypeLabel,
          approvedBy: approverName,
          approvalDate: fmtDate(new Date()),
          disbursedAmount: Number(loan.loan_amount).toLocaleString(),
          isTopUp: false,
          pdfDownloadUrl: pdfUrl,
        },
      },
    });

    return { ok: true, pdfUrl };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown error' };
  }
}