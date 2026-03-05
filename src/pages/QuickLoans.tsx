import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, Clock, Shield, Users, AlertTriangle, CheckCircle, XCircle, CreditCard, Download, Printer, Phone, Loader2, FileText, Eye, ShieldOff, Wallet } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Textarea } from '@/components/ui/textarea';
import LoanAdvertDialog from '@/components/loans/LoanAdvertDialog';
import LoanReviewModal from '@/components/loans/LoanReviewModal';
import LoanRepaymentSlip from '@/components/loans/LoanRepaymentSlip';

// Loan types with their monthly interest rates
type LoanType = 'quick' | 'long_term';

const LOAN_TYPE_CONFIG: Record<LoanType, { label: string; monthlyRate: number; description: string }> = {
  quick: { label: 'Quick Loan', monthlyRate: 10, description: '10%/month – Short-term, weekly repayments' },
  long_term: { label: 'Long-Term Loan', monthlyRate: 15, description: '15%/month – Pay for actual days used, early repayment saves interest' },
};

// Helper: calculate daily interest rate from monthly rate
const getDailyRate = (loanType: LoanType) => {
  const monthlyRate = LOAN_TYPE_CONFIG[loanType].monthlyRate;
  return monthlyRate / 30;
};

// Helper: calculate total days and weeks for a duration
const getLoanSchedule = (months: number) => {
  const totalDays = months * 30;
  const totalWeeks = months * 4; // 4 weeks per month
  return { totalDays, totalWeeks };
};

// Processing fees and insurance removed

const QuickLoans = () => {
  const { employee, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<any[]>([]);
  const [myLoans, setMyLoans] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [myWalletBalance, setMyWalletBalance] = useState(0);
  const [aiLoanLimit, setAiLoanLimit] = useState<any>(null);
  const [aiLimitLoading, setAiLimitLoading] = useState(false);
  const [allAiLimits, setAllAiLimits] = useState<Record<string, any>>({});
  const [allAiLimitsLoading, setAllAiLimitsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showEarlyPayDialog, setShowEarlyPayDialog] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<any>(null);
  const [earlyPayAmount, setEarlyPayAmount] = useState('');
  const [earlyPayMethod, setEarlyPayMethod] = useState('');
  const [earlyPayNotes, setEarlyPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guarantorCode, setGuarantorCode] = useState('');
  const [pendingGuarantorLoan, setPendingGuarantorLoan] = useState<any>(null);
  const [guaranteedLoans, setGuaranteedLoans] = useState<any[]>([]);
  const [reviewLoan, setReviewLoan] = useState<any>(null);
  const [showRepaymentSlip, setShowRepaymentSlip] = useState(false);
  const [repaymentSlipData, setRepaymentSlipData] = useState<any>(null);
  const [showMomoRepayDialog, setShowMomoRepayDialog] = useState(false);
  const [momoRepayLoan, setMomoRepayLoan] = useState<any>(null);
  const [momoRepayAmount, setMomoRepayAmount] = useState('');
  const [momoRepayPhone, setMomoRepayPhone] = useState('');
  const [momoRepayLoading, setMomoRepayLoading] = useState(false);
  const [momoRepayStatus, setMomoRepayStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [showWalletRepayDialog, setShowWalletRepayDialog] = useState(false);
  const [walletRepayLoan, setWalletRepayLoan] = useState<any>(null);
  const [walletRepayAmount, setWalletRepayAmount] = useState('');
  const [walletRepayLoading, setWalletRepayLoading] = useState(false);

  // Form state
  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('quick');
  const [durationMonths, setDurationMonths] = useState('');
  const [guarantorId, setGuarantorId] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');

  useEffect(() => {
    fetchLoans();
    fetchEmployees();
    checkGuarantorRequests();
    fetchGuaranteedLoans();
    fetchWalletBalances();
    fetchAiLoanLimit();
  }, [employee]);

  const fetchLoans = async () => {
    if (!employee) return;
    setLoading(true);
    try {
      if (isAdmin()) {
        const { data } = await supabase.from('loans').select('*').order('created_at', { ascending: false });
        setLoans(data || []);
      }
      const { data: mine } = await supabase.from('loans').select('*').eq('employee_email', employee.email).order('created_at', { ascending: false });
      setMyLoans(mine || []);
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.rpc('get_guarantor_candidates');
    setEmployees((data || []).map((e: any) => ({ ...e, salary: 0, auth_user_id: '' })));
  };

  const fetchWalletBalances = async () => {
    if (!employee) return;
    try {
      // Fetch only wallet-relevant ledger entries (matching get_user_balance_safe)
      const { data: ledgerData } = await supabase
        .from('ledger_entries')
        .select('user_id, amount')
        .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT']);
      if (ledgerData) {
        const balances: Record<string, number> = {};
        ledgerData.forEach((entry: any) => {
          balances[entry.user_id] = (balances[entry.user_id] || 0) + Number(entry.amount);
        });
        setWalletBalances(balances);

        // Set current user's wallet balance
        if (employee.authUserId) {
          const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: employee.email });
          const uid = userId || employee.authUserId;
          setMyWalletBalance(balances[uid] || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching wallet balances:', err);
    }
  };

  const fetchAiLoanLimit = async () => {
    if (!employee?.email) return;
    setAiLimitLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `https://pudfybkyfedeggmokhco.supabase.co/functions/v1/ai-loan-limit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ employee_email: employee.email }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        setAiLoanLimit(data);
      }
    } catch (err) {
      console.error('Error fetching AI loan limit:', err);
    } finally {
      setAiLimitLoading(false);
    }
  };

  const fetchAllAiLimits = async () => {
    if (!employees.length) {
      console.log('⚠️ No employees loaded yet, skipping AI limits fetch');
      return;
    }
    setAllAiLimitsLoading(true);
    console.log(`🤖 Fetching AI limits for ${employees.length} employees...`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const results: Record<string, any> = {};
      // Fetch in parallel batches of 5
      for (let i = 0; i < employees.length; i += 5) {
        const batch = employees.slice(i, i + 5);
        const promises = batch.map(async (emp: any) => {
          try {
            const resp = await fetch(
              `https://pudfybkyfedeggmokhco.supabase.co/functions/v1/ai-loan-limit`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ employee_email: emp.email }),
              }
            );
            if (resp.ok) {
              const data = await resp.json();
              console.log(`✅ AI limit for ${emp.name}:`, data);
              results[emp.email] = data;
            } else {
              const errText = await resp.text();
              console.error(`❌ AI limit error for ${emp.name} (${resp.status}):`, errText);
            }
          } catch (err) {
            console.error(`AI limit error for ${emp.email}:`, err);
          }
        });
        await Promise.all(promises);
      }
      console.log(`🤖 AI limits fetched: ${Object.keys(results).length} results`);
      setAllAiLimits(results);
    } catch (err) {
      console.error('Error fetching all AI limits:', err);
    } finally {
      setAllAiLimitsLoading(false);
    }
  };

  const fetchGuaranteedLoans = async () => {
    if (!employee) return;
    const { data } = await supabase.from('loans').select('*')
      .eq('guarantor_email', employee.email)
      .order('created_at', { ascending: false });
    setGuaranteedLoans(data || []);
  };

  const handleRevokeGuarantee = async (loanId: string) => {
    if (!employee) return;
    setSubmitting(true);
    try {
      // Double-check loan is still in pending_admin status
      const { data: loan } = await supabase.from('loans').select('status, employee_name, employee_phone').eq('id', loanId).single();
      if (!loan || loan.status !== 'pending_admin') {
        toast({ title: "Cannot Revoke", description: "This loan has already been processed by admin.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('loans').update({
        guarantor_approved: false,
        guarantor_declined: true,
        status: 'rejected',
        admin_rejection_reason: `Guarantor ${employee.name} revoked their guarantee`,
      }).eq('id', loanId);
      if (error) throw error;

      // Notify borrower
      await supabase.functions.invoke('send-sms', {
        body: {
          phone: loan.employee_phone,
          message: `Dear ${loan.employee_name}, your guarantor ${employee.name} has revoked their guarantee for your loan. The loan has been cancelled. You may request a new loan with a different guarantor. - Great Pearl Coffee`,
          userName: loan.employee_name,
          messageType: 'loan_guarantor_revoked'
        }
      });

      toast({ title: "Guarantee Revoked", description: "The borrower has been notified. The loan has been cancelled." });
      fetchGuaranteedLoans();
      fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const checkGuarantorRequests = async () => {
    if (!employee) return;
    const { data } = await supabase.from('loans').select('*')
      .eq('guarantor_email', employee.email)
      .eq('status', 'pending_guarantor')
      .eq('guarantor_approved', false);
    if (data && data.length > 0) {
      setPendingGuarantorLoan(data[0]);
    }
  };

  const calculateLoanDetails = () => {
    const amount = parseFloat(loanAmount) || 0;
    const months = parseInt(durationMonths) || 0;
    const dailyRate = getDailyRate(loanType);
    const monthlyRate = LOAN_TYPE_CONFIG[loanType].monthlyRate;
    const { totalDays, totalWeeks } = getLoanSchedule(months);

    // Flat/simple interest: Interest = Principal × monthlyRate% × months
    const interest = amount * (monthlyRate / 100) * months;
    const total = Math.ceil(amount + interest);
    const weekly = totalWeeks > 0 ? Math.ceil(total / totalWeeks) : 0;

    return { amount, months, dailyRate, monthlyRate, totalDays, totalWeeks, interest, total, weekly };
  };

  const handleRequestLoan = async () => {
    if (!employee) return;
    const { amount, months, dailyRate, monthlyRate, totalDays, totalWeeks, interest, total, weekly } = calculateLoanDetails();

    if (amount <= 0 || months <= 0 || !guarantorId) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    // Check against AI-determined limit or fallback to 2x salary
    const maxLoan = myLimit?.availableLimit || (employee.salary || 0) * 2;
    if (amount > maxLoan) {
      toast({ title: "Error", description: `Max loan is UGX ${maxLoan.toLocaleString()} based on your credit assessment`, variant: "destructive" });
      return;
    }

    // Check if borrower has any defaulted loans
    const defaultedLoans = myLoans.filter(l => l.is_defaulted);
    if (defaultedLoans.length > 0) {
      toast({ title: "Blocked", description: "You have an overdue loan. Clear your outstanding balance before requesting a new loan.", variant: "destructive" });
      return;
    }

    // Check active loans count
    const activeLoans = myLoans.filter(l => ['pending_guarantor', 'pending_admin', 'approved', 'disbursed', 'active'].includes(l.status));
    if (activeLoans.length >= 3) {
      toast({ title: "Error", description: "You already have 3 active loans", variant: "destructive" });
      return;
    }

    const guarantor = employees.find(e => e.id === guarantorId);
    if (!guarantor) return;

    if (guarantor.email === employee.email) {
      toast({ title: "Error", description: "You cannot be your own guarantor", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const approvalCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { error } = await supabase.from('loans').insert({
        employee_id: employee.id,
        employee_email: employee.email,
        employee_name: employee.name,
        employee_phone: employee.phone || '',
        loan_amount: amount,
        interest_rate: monthlyRate,
        daily_interest_rate: dailyRate,
        total_repayable: Math.ceil(total),
        duration_months: months,
        monthly_installment: Math.ceil(weekly),
        weekly_installment: Math.ceil(weekly),
        total_weeks: totalWeeks,
        remaining_balance: Math.ceil(total),
        repayment_frequency: 'weekly',
        status: 'pending_guarantor',
        guarantor_id: guarantor.id,
        guarantor_email: guarantor.email,
        guarantor_name: guarantor.name,
        guarantor_phone: guarantor.phone || '',
        guarantor_approval_code: approvalCode,
        loan_type: loanType,
      } as any);

      if (error) throw error;

      // Send SMS to guarantor
      await supabase.functions.invoke('send-sms', {
        body: {
          phone: guarantor.phone,
          message: `Dear ${guarantor.name}, ${employee.name} has requested you to guarantee a loan of UGX ${amount.toLocaleString()} for ${months} month(s). Your approval code is: ${approvalCode}. Log into the system to approve or decline.`,
          userName: guarantor.name,
          messageType: 'loan_guarantor_request'
        }
      });

      toast({ title: "Loan Requested", description: "Guarantor has been notified via SMS" });
      setShowRequestDialog(false);

      // Trigger repayment statement slip
      const slipGuarantor = employees.find(e => e.id === guarantorId);
      setRepaymentSlipData({
        employeeName: employee.name,
        employeeEmail: employee.email,
        guarantorName: slipGuarantor?.name || '',
        loanAmount: amount,
        interestRate: monthlyRate,
        dailyRate,
        durationMonths: months,
        totalWeeks,
        weeklyInstallment: weekly,
        totalRepayable: total,
        totalInterest: interest,
        loanType,
      });
      setShowRepaymentSlip(true);

      setLoanAmount('');
      setDurationMonths('');
      setGuarantorId('');
      fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuarantorApproval = async (approve: boolean) => {
    if (!pendingGuarantorLoan) return;

    if (approve && guarantorCode !== pendingGuarantorLoan.guarantor_approval_code) {
      toast({ title: "Error", description: "Invalid approval code", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const updateData: any = approve
        ? { guarantor_approved: true, guarantor_approved_at: new Date().toISOString(), status: 'pending_admin' }
        : { guarantor_declined: true, status: 'rejected', admin_rejection_reason: 'Guarantor declined' };

      const { error } = await supabase.from('loans').update(updateData).eq('id', pendingGuarantorLoan.id);
      if (error) throw error;

      // Notify borrower
      await supabase.functions.invoke('send-sms', {
        body: {
          phone: pendingGuarantorLoan.employee_phone,
          message: approve
            ? `Dear ${pendingGuarantorLoan.employee_name}, your guarantor ${employee?.name} has approved your loan request. It is now pending admin approval.`
            : `Dear ${pendingGuarantorLoan.employee_name}, your guarantor ${employee?.name} has declined your loan request. Please select a new guarantor.`,
          userName: pendingGuarantorLoan.employee_name,
          messageType: 'loan_guarantor_response'
        }
      });

      toast({ title: approve ? "Loan Guaranteed" : "Loan Declined", description: approve ? "The loan is now pending admin approval" : "The borrower will be notified" });
      setPendingGuarantorLoan(null);
      setGuarantorCode('');
      fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminApproval = async (loanId: string, approve: boolean, rejectionReason?: string) => {
    if (!employee) return;
    setSubmitting(true);
    try {
      const loan = loans.find(l => l.id === loanId);
      if (!loan) return;

      if (approve) {
        const isWeekly = loan.repayment_frequency === 'weekly';
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + loan.duration_months);

        // For weekly loans, next deduction is 7 days from now; for monthly, 1st of next month
        const nextDeduction = new Date();
        if (isWeekly) {
          nextDeduction.setDate(nextDeduction.getDate() + 7);
        } else {
          nextDeduction.setMonth(nextDeduction.getMonth() + 1);
          nextDeduction.setDate(1);
        }

        // Update loan status
        const { error } = await supabase.from('loans').update({
          admin_approved: true,
          admin_approved_by: employee.email,
          admin_approved_at: new Date().toISOString(),
          status: 'active',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          next_deduction_date: nextDeduction.toISOString().split('T')[0],
          disbursed_amount: loan.loan_amount,
        }).eq('id', loanId);
        if (error) throw error;

        // Create repayment schedule using flat interest (equal installments)
        const repayments = [];
        if (isWeekly) {
          const numWeeks = loan.total_weeks || (loan.duration_months * 4);
          const weeklyInstallment = loan.weekly_installment || Math.ceil(loan.total_repayable / numWeeks);
          const totalInterest = loan.total_repayable - loan.loan_amount;
          const weeklyInterest = Math.round(totalInterest / numWeeks);
          const weeklyPrincipal = Math.round(loan.loan_amount / numWeeks);
          
          for (let i = 1; i <= numWeeks; i++) {
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + (i * 7));
            repayments.push({
              loan_id: loanId,
              installment_number: i,
              amount_due: i === numWeeks ? Math.ceil(loan.total_repayable - (weeklyInstallment * (numWeeks - 1))) : weeklyInstallment,
              due_date: dueDate.toISOString().split('T')[0],
            });
          }
        } else {
          for (let i = 1; i <= loan.duration_months; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            dueDate.setDate(1);
            repayments.push({
              loan_id: loanId,
              installment_number: i,
              amount_due: Math.ceil(loan.total_repayable / loan.duration_months),
              due_date: dueDate.toISOString().split('T')[0],
            });
          }
        }
        await supabase.from('loan_repayments').insert(repayments);

        // Add to borrower's wallet via ledger (full principal amount)
        const disbursedAmount = loan.loan_amount;
        const borrowerEmployee = await supabase.from('employees').select('auth_user_id').eq('email', loan.employee_email).single();
        if (borrowerEmployee.data?.auth_user_id) {
          await supabase.from('ledger_entries').insert({
            user_id: borrowerEmployee.data.auth_user_id,
            entry_type: 'DEPOSIT',
            amount: disbursedAmount,
            reference: 'LOAN-DISBURSE-' + loanId,
            metadata: { loan_id: loanId, duration_months: loan.duration_months, interest_rate: loan.interest_rate, principal: loan.loan_amount, source: 'loan_disbursement', repayment_frequency: loan.repayment_frequency || 'monthly' },
          });
        }

        // SMS to borrower with repayment details
        const firstRepaymentDate = new Date(startDate);
        if (isWeekly) {
          firstRepaymentDate.setDate(firstRepaymentDate.getDate() + 7);
        } else {
          firstRepaymentDate.setMonth(firstRepaymentDate.getMonth() + 1);
          firstRepaymentDate.setDate(1);
        }
        const repaymentDateStr = firstRepaymentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const installmentAmount = isWeekly
          ? Math.ceil(loan.total_repayable / (loan.total_weeks || Math.ceil((loan.duration_months * 30) / 7)))
          : Math.ceil(loan.total_repayable / loan.duration_months);
        const scheduleLabel = isWeekly ? 'week' : 'month';
        const numInstallments = isWeekly ? (loan.total_weeks || Math.ceil((loan.duration_months * 30) / 7)) : loan.duration_months;

        await supabase.functions.invoke('send-sms', {
          body: {
            phone: loan.employee_phone,
            message: `Dear ${loan.employee_name}, your loan of UGX ${loan.loan_amount.toLocaleString()} has been approved and disbursed to your wallet. Repayment: UGX ${installmentAmount.toLocaleString()}/${scheduleLabel} for ${numInstallments} ${scheduleLabel}(s). First deduction: ${repaymentDateStr}. Total repayable: UGX ${loan.total_repayable.toLocaleString()}. - Great Pearl Coffee`,
            userName: loan.employee_name,
            messageType: 'loan_approved'
          }
        });

        toast({ title: "Loan Approved", description: "Loan disbursed to employee wallet" });
      } else {
        await supabase.from('loans').update({
          status: 'rejected',
          admin_rejection_reason: rejectionReason || 'Admin declined',
        }).eq('id', loanId);

        await supabase.functions.invoke('send-sms', {
          body: {
            phone: loan.employee_phone,
            message: `Dear ${loan.employee_name}, your loan request of UGX ${loan.loan_amount.toLocaleString()} has been declined. Reason: ${rejectionReason || 'Not specified'}.`,
            userName: loan.employee_name,
            messageType: 'loan_rejected'
          }
        });

        toast({ title: "Loan Rejected" });
      }
      fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEarlyRepayment = async () => {
    if (!selectedLoanForPayment || !employee) return;
    const amount = parseFloat(earlyPayAmount) || 0;
    if (amount <= 0) {
      toast({ title: "Error", description: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const earlyPayoff = calculateEarlyPayoff(selectedLoanForPayment);
    if (amount > earlyPayoff) {
      toast({ title: "Error", description: `Max payable is UGX ${earlyPayoff.toLocaleString()} (daily pro-rata interest)`, variant: "destructive" });
      return;
    }
    if (!earlyPayMethod) {
      toast({ title: "Error", description: "Select a payment method", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const newBalance = Math.max(0, earlyPayoff - amount);

      // Update loan remaining balance
      const { error } = await supabase.from('loans').update({
        remaining_balance: newBalance,
        status: newBalance <= 0 ? 'completed' : 'active',
      }).eq('id', selectedLoanForPayment.id);
      if (error) throw error;

      // Mark unpaid installments as paid (earliest first) until amount is consumed
      const { data: unpaidInstallments } = await supabase.from('loan_repayments')
        .select('*')
        .eq('loan_id', selectedLoanForPayment.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      let remaining = amount;
      for (const inst of (unpaidInstallments || [])) {
        if (remaining <= 0) break;
        const payable = Math.min(remaining, inst.amount_due - (inst.amount_paid || 0));
        const newPaid = (inst.amount_paid || 0) + payable;
        const isPaid = newPaid >= inst.amount_due;
        await supabase.from('loan_repayments').update({
          amount_paid: newPaid,
          status: isPaid ? 'paid' : 'pending',
          paid_at: isPaid ? new Date().toISOString() : null,
        }).eq('id', inst.id);
        remaining -= payable;
      }

      // Create a ledger entry for the early payment (deduct from wallet if deposit)
      if (earlyPayMethod === 'wallet') {
        const borrowerEmployee = await supabase.from('employees').select('auth_user_id').eq('email', selectedLoanForPayment.employee_email).single();
        if (borrowerEmployee.data?.auth_user_id) {
          await supabase.from('ledger_entries').insert({
            user_id: borrowerEmployee.data.auth_user_id,
            entry_type: 'LOAN_REPAYMENT',
            amount: -amount,
            reference: 'LOAN-REPAY-' + selectedLoanForPayment.id + '-' + Date.now(),
            metadata: { loan_id: selectedLoanForPayment.id, method: earlyPayMethod, notes: earlyPayNotes },
          });
        }
      }

      toast({ 
        title: "Payment Recorded", 
        description: `UGX ${amount.toLocaleString()} paid via ${earlyPayMethod}. ${newBalance <= 0 ? 'Loan fully paid off!' : `Remaining: UGX ${newBalance.toLocaleString()}`}`,
        duration: 6000,
      });

      setShowEarlyPayDialog(false);
      setEarlyPayAmount('');
      setEarlyPayMethod('');
      setEarlyPayNotes('');
      setSelectedLoanForPayment(null);
      fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Mobile Money Loan Repayment via GosentePay
  const handleMomoRepayment = async () => {
    if (!momoRepayLoan || !employee) return;
    const amount = parseFloat(momoRepayAmount) || 0;
    if (amount <= 0 || amount < 500) {
      toast({ title: "Error", description: "Minimum amount is UGX 500", variant: "destructive" });
      return;
    }

    // Calculate max payable using daily pro-rata interest
    let maxPayable = calculateEarlyPayoff(momoRepayLoan);

    if (amount > maxPayable) {
      toast({ title: "Error", description: `Max payable is UGX ${maxPayable.toLocaleString()}`, variant: "destructive" });
      return;
    }
    if (!momoRepayPhone) {
      toast({ title: "Error", description: "Enter your phone number", variant: "destructive" });
      return;
    }

    setMomoRepayLoading(true);
    setMomoRepayStatus('processing');
    try {
      // Get user auth id for creating transaction record
      const { data: borrowerEmp } = await supabase.from('employees').select('auth_user_id').eq('email', momoRepayLoan.employee_email).single();
      if (!borrowerEmp?.auth_user_id) {
        throw new Error('Could not find your account. Please contact admin.');
      }

      // Create unique ref for this loan repayment
      const txRef = `LOANREPAY-${momoRepayLoan.id.slice(0, 8)}-${Date.now()}`;

      // Normalize phone
      let cleanPhone = momoRepayPhone.replace(/\+/g, '').replace(/\s/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '256' + cleanPhone.slice(1);
      if (!cleanPhone.startsWith('256')) cleanPhone = '256' + cleanPhone;

      // Create mobile_money_transactions record so callback can process it
      const { error: txInsertErr } = await supabase.from('mobile_money_transactions').insert({
        user_id: borrowerEmp.auth_user_id,
        transaction_ref: txRef,
        transaction_type: 'loan_repayment',
        amount: amount,
        phone: cleanPhone,
        status: 'pending',
        provider: 'gosentepay',
        withdrawal_id: momoRepayLoan.id, // Store loan_id in withdrawal_id field
      });

      if (txInsertErr) throw new Error('Failed to create transaction record');

      // Use deposit API (sends push notification to user's phone)
      const { data: result, error: fnErr } = await supabase.functions.invoke('gosentepay-deposit', {
        body: {
          phone: cleanPhone,
          amount: amount,
          email: employee.email,
          ref: txRef,
        }
      });

      if (fnErr || result?.status === 'error' || result?.error) {
        // Mark transaction as failed
        await supabase.from('mobile_money_transactions').update({ status: 'failed' }).eq('transaction_ref', txRef);
        const errorMsg = result?.message || result?.error || fnErr?.message || 'Payment request failed. Please try again.';
        throw new Error(errorMsg);
      }

      // Push notification sent successfully - waiting for user to approve on phone
      setMomoRepayStatus('success');
      toast({
        title: "Payment Request Sent! 📱",
        description: `A payment prompt has been sent to ${momoRepayPhone}. Please approve the payment of UGX ${amount.toLocaleString()} on your phone. Your loan balance will update automatically once confirmed.`,
        duration: 15000,
      });
      
      // Poll for transaction completion
      const pollInterval = setInterval(async () => {
        const { data: tx } = await supabase.from('mobile_money_transactions')
          .select('status')
          .eq('transaction_ref', txRef)
          .single();
        
        if (tx?.status === 'completed') {
          clearInterval(pollInterval);
          toast({
            title: "Loan Payment Confirmed! ✅",
            description: `UGX ${amount.toLocaleString()} has been deducted from your loan balance.`,
            duration: 8000,
          });
          fetchLoans();
        } else if (tx?.status === 'failed') {
          clearInterval(pollInterval);
          toast({
            title: "Payment Failed ❌",
            description: "The payment was not completed. Please try again.",
            variant: "destructive",
            duration: 8000,
          });
        }
      }, 5000);

      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(pollInterval), 120000);

      setTimeout(() => {
        setShowMomoRepayDialog(false);
        setMomoRepayStatus('idle');
        setMomoRepayAmount('');
        setMomoRepayPhone('');
        setMomoRepayLoan(null);
      }, 3000);

    } catch (err: any) {
      setMomoRepayStatus('failed');
      toast({ title: "Payment Failed ❌", description: err.message || 'Payment request failed. Try again.', variant: "destructive", duration: 8000 });
    } finally {
      setMomoRepayLoading(false);
    }
  };

  // Calculate early payoff amount with daily pro-rata interest
  const calculateEarlyPayoff = (loan: any) => {
    if (!loan?.start_date || !loan?.loan_amount) return loan?.remaining_balance || 0;
    const daysHeld = Math.max(1, Math.floor((Date.now() - new Date(loan.start_date).getTime()) / (1000 * 60 * 60 * 24)));
    const monthlyRate = LOAN_TYPE_CONFIG[(loan.loan_type || 'quick') as LoanType]?.monthlyRate || 10;
    const dailyRate = monthlyRate / 30 / 100;
    const interestForDaysHeld = Math.ceil(loan.loan_amount * dailyRate * daysHeld);
    const principalOwed = loan.loan_amount - (loan.paid_amount || 0);
    return Math.max(0, Math.ceil(principalOwed + interestForDaysHeld));
  };

  // Wallet-based Loan Repayment
  const handleWalletRepayment = async () => {
    if (!walletRepayLoan || !employee) return;
    const amount = parseFloat(walletRepayAmount) || 0;
    if (amount <= 0 || amount < 500) {
      toast({ title: "Error", description: "Minimum amount is UGX 500", variant: "destructive" });
      return;
    }

    const earlyPayoff = calculateEarlyPayoff(walletRepayLoan);
    if (amount > earlyPayoff) {
      toast({ title: "Error", description: `Max payable is UGX ${earlyPayoff.toLocaleString()} (daily pro-rata interest)`, variant: "destructive" });
      return;
    }

    // Check wallet balance
    if (amount > myWalletBalance) {
      toast({ title: "Insufficient Wallet Balance", description: `Your wallet balance is UGX ${myWalletBalance.toLocaleString()}`, variant: "destructive" });
      return;
    }

    setWalletRepayLoading(true);
    try {
      const { data: borrowerEmp } = await supabase.from('employees').select('auth_user_id').eq('email', walletRepayLoan.employee_email).single();
      if (!borrowerEmp?.auth_user_id) throw new Error('Could not find your account.');

      const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { input_email: walletRepayLoan.employee_email });
      const userId = unifiedId || borrowerEmp.auth_user_id;

      const txRef = `LOANREPAY-WALLET-${walletRepayLoan.id.slice(0, 8)}-${Date.now()}`;

      // Deduct from wallet via ledger
      const { error: ledgerErr } = await supabase.from('ledger_entries').insert({
        user_id: userId,
        entry_type: 'WITHDRAWAL',
        amount: -amount,
        reference: txRef,
        metadata: {
          loan_id: walletRepayLoan.id,
          source: 'wallet_loan_repayment',
          description: `Loan repayment from wallet – UGX ${amount.toLocaleString()}`
        }
      });
      if (ledgerErr) throw new Error('Failed to deduct from wallet');

      // Update loan balance (use daily interest calculation)
      const newPaidAmount = (walletRepayLoan.paid_amount || 0) + amount;
      const newRemainingBalance = Math.max(0, earlyPayoff - amount);
      const isFullyPaid = newRemainingBalance <= 0;

      const { error: loanErr } = await supabase.from('loans').update({
        paid_amount: newPaidAmount,
        remaining_balance: newRemainingBalance,
        status: isFullyPaid ? 'paid_off' : 'active',
        is_defaulted: isFullyPaid ? false : walletRepayLoan.is_defaulted,
      }).eq('id', walletRepayLoan.id);
      if (loanErr) throw loanErr;

      // Mark installments as paid (earliest first)
      const { data: unpaidInstallments } = await supabase.from('loan_repayments')
        .select('*')
        .eq('loan_id', walletRepayLoan.id)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true });

      let remaining = amount;
      for (const inst of (unpaidInstallments || [])) {
        if (remaining <= 0) break;
        const owed = inst.amount_due - (inst.amount_paid || 0);
        const payable = Math.min(remaining, owed);
        const newPaid = (inst.amount_paid || 0) + payable;
        const isPaid = newPaid >= inst.amount_due;
        await supabase.from('loan_repayments').update({
          amount_paid: newPaid,
          status: isPaid ? 'paid' : inst.status,
          paid_date: isPaid ? new Date().toISOString().split('T')[0] : null,
          payment_reference: txRef,
          deducted_from: 'Wallet Repayment',
        }).eq('id', inst.id);
        remaining -= payable;
      }

      toast({
        title: isFullyPaid ? "Loan Fully Paid Off! 🎉" : "Wallet Payment Successful! ✅",
        description: `UGX ${amount.toLocaleString()} deducted from your wallet.${isFullyPaid ? '' : ` Remaining: UGX ${newRemainingBalance.toLocaleString()}`}`,
        duration: 8000,
      });

      setShowWalletRepayDialog(false);
      setWalletRepayAmount('');
      setWalletRepayLoan(null);
      fetchLoans();
      // Update wallet balance
      setMyWalletBalance(prev => prev - amount);
    } catch (err: any) {
      toast({ title: "Payment Failed ❌", description: err.message, variant: "destructive" });
    } finally {
      setWalletRepayLoading(false);
    }
  };


  const printLoanStatement = async (loan: any) => {
    // Fetch repayment installments for this loan
    const { data: repayments } = await supabase
      .from('loan_repayments')
      .select('*')
      .eq('loan_id', loan.id)
      .order('due_date', { ascending: true });

    // Fetch loan-related ledger entries
    const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: loan.employee_email });
    const { data: ledgerEntries } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', userId || '')
      .or(`reference.ilike.%${loan.id}%,reference.ilike.%LOAN%`)
      .order('created_at', { ascending: true });

    const isWeekly = loan.repayment_frequency === 'weekly';
    const totalPaid = (repayments || []).reduce((s: number, r: any) => s + (r.amount_paid || 0), 0);
    const paidInstallments = (repayments || []).filter((r: any) => r.status === 'paid').length;
    const overdueInstallments = (repayments || []).filter((r: any) => r.status === 'overdue').length;
    const pendingInstallments = (repayments || []).filter((r: any) => r.status === 'pending').length;

    // Build installment rows
    const installmentRows = (repayments || []).map((r: any) => `
      <tr>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center;font-size:11px">${r.installment_number}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;font-size:11px">${new Date(r.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-size:11px">${(r.amount_due || 0).toLocaleString()}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-size:11px">${(r.amount_paid || 0).toLocaleString()}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:right;font-size:11px">${(r.penalty_applied || 0).toLocaleString()}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;font-size:11px">${r.deducted_from || '—'}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center;font-size:11px">
          <span style="color:${r.status === 'paid' ? '#16a34a' : r.status === 'overdue' ? '#dc2626' : '#666'};font-weight:600">${r.status.toUpperCase()}</span>
        </td>
        <td style="padding:5px 8px;border:1px solid #ddd;font-size:11px">${r.paid_date ? new Date(r.paid_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
      </tr>
    `).join('');

    // Build transaction history rows (loan-related ledger entries)
    const loanLedger = (ledgerEntries || []).filter((e: any) => 
      e.reference?.includes(loan.id) || 
      e.reference?.includes('LOAN')
    );
    const txRows = loanLedger.map((e: any) => {
      const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata || {};
      let description = meta.description || e.entry_type?.replace(/_/g, ' ');
      if (e.entry_type === 'LOAN_DISBURSEMENT') description = '💰 Loan Disbursement to Wallet';
      else if (e.entry_type === 'LOAN_REPAYMENT') description = '📱 Repayment via MoMo';
      else if (e.reference?.includes('LOAN-REPAY') && e.entry_type === 'WITHDRAWAL') description = '🏦 Auto Recovery (Wallet)';
      else if (e.reference?.includes('LOAN-REPAY-SALARY')) description = '🏦 Auto Recovery (Salary)';
      else if (e.reference?.includes('LOAN-GUARANTOR')) description = '🏦 Guarantor Recovery';
      return `
        <tr>
          <td style="padding:4px 8px;border:1px solid #eee;font-size:11px">${new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td style="padding:4px 8px;border:1px solid #eee;font-size:11px">${description}</td>
          <td style="padding:4px 8px;border:1px solid #eee;font-size:11px">${e.reference || '—'}</td>
          <td style="padding:4px 8px;border:1px solid #eee;text-align:right;font-size:11px;color:${e.amount >= 0 ? '#16a34a' : '#dc2626'};font-weight:600">
            ${e.amount >= 0 ? '+' : ''}${Number(e.amount).toLocaleString()}
          </td>
        </tr>
      `;
    }).join('');

    const progress = loan.total_repayable ? Math.round((totalPaid / loan.total_repayable) * 100) : 0;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Loan Statement - ${loan.employee_name}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; font-size: 12px; line-height: 1.4; }
      .header { text-align: center; border-bottom: 2px solid #1a365d; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { font-size: 18px; color: #1a365d; margin: 0 0 2px; text-transform: uppercase; }
      .header h2 { font-size: 13px; color: #555; margin: 0; font-weight: normal; }
      .header .date { font-size: 10px; color: #999; margin-top: 4px; }
      .section { margin-bottom: 16px; break-inside: avoid; }
      .section-title { font-size: 13px; font-weight: bold; padding: 5px 8px; background: #f0f4ff; border-left: 3px solid #1a365d; margin-bottom: 8px; }
      .grid { display: grid; gap: 4px 20px; font-size: 12px; }
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .grid .label { color: #666; font-size: 10px; }
      .grid .value { font-weight: 600; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin: 6px 0; }
      th { background: #f3f3f3; padding: 6px 8px; border: 1px solid #ddd; text-align: left; font-weight: 600; font-size: 10px; }
      .amount { text-align: right; }
      .progress-bar { height: 14px; background: #e5e7eb; border-radius: 7px; overflow: hidden; margin: 8px 0; }
      .progress-fill { height: 100%; background: #1a365d; border-radius: 7px; }
      .summary-box { background: #f8f9fa; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin: 12px 0; }
      .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
      .summary-row.total { border-top: 2px solid #333; margin-top: 6px; padding-top: 8px; font-weight: bold; font-size: 13px; }
      .status-badges { display: flex; gap: 12px; margin: 8px 0; }
      .status-badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .badge-paid { background: #dcfce7; color: #166534; }
      .badge-pending { background: #f3f4f6; color: #374151; }
      .badge-overdue { background: #fef2f2; color: #991b1b; }
      .footer { text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 20px; }
      .penalty-note { background: #fff3cd; border: 1px solid #ffc107; padding: 8px; border-radius: 4px; font-size: 11px; margin-top: 10px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
      <div class="header">
        <h1>GREAT PEARL COFFEE</h1>
        <h2>Loan Account Statement</h2>
        <div class="date">Statement Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      <div class="section">
        <div class="section-title">📋 Loan Details</div>
        <div class="grid grid-3">
          <div><div class="label">Borrower</div><div class="value">${loan.employee_name}</div></div>
          <div><div class="label">Loan Type</div><div class="value">${loan.loan_type === 'long_term' ? 'Long-Term' : 'Quick'} Loan</div></div>
          <div><div class="label">Status</div><div class="value" style="color:${loan.status === 'active' ? '#16a34a' : loan.status === 'paid_off' ? '#1a365d' : '#dc2626'}">${loan.status.toUpperCase()}</div></div>
          <div><div class="label">Principal Amount</div><div class="value">UGX ${(loan.loan_amount || 0).toLocaleString()}</div></div>
          <div><div class="label">Interest Rate</div><div class="value">${isWeekly ? `${(loan.daily_interest_rate || 0).toFixed(3)}%/day (${loan.interest_rate}%/mo)` : `${loan.interest_rate}%/month`}</div></div>
          <div><div class="label">Duration</div><div class="value">${loan.duration_months} month(s) / ${loan.total_weeks || '—'} weeks</div></div>
          <div><div class="label">Disbursement Date</div><div class="value">${loan.disbursed_at ? new Date(loan.disbursed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
          <div><div class="label">Guarantor</div><div class="value">${loan.guarantor_name || '—'}</div></div>
          <div><div class="label">${isWeekly ? 'Weekly' : 'Monthly'} Installment</div><div class="value">UGX ${(loan.monthly_installment || 0).toLocaleString()}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">💰 Payment Summary</div>
        <div class="summary-box">
          <div class="summary-row"><span>Total Repayable (Principal + Interest)</span><span>UGX ${(loan.total_repayable || 0).toLocaleString()}</span></div>
          <div class="summary-row"><span>Penalties Applied</span><span style="color:#dc2626">UGX ${(loan.penalty_amount || 0).toLocaleString()}</span></div>
          <div class="summary-row"><span>Total Amount Due</span><span>UGX ${((loan.total_repayable || 0) + (loan.penalty_amount || 0)).toLocaleString()}</span></div>
          <div class="summary-row"><span>Total Paid to Date</span><span style="color:#16a34a">UGX ${totalPaid.toLocaleString()}</span></div>
          <div class="summary-row total"><span>Outstanding Balance</span><span style="color:#dc2626">UGX ${(loan.remaining_balance || 0).toLocaleString()}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin:8px 0">
          <span style="font-size:11px;color:#666">Repayment Progress:</span>
          <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${progress}%"></div></div>
          <span style="font-size:11px;font-weight:600">${progress}%</span>
        </div>
        <div class="status-badges">
          <span class="status-badge badge-paid">✅ Paid: ${paidInstallments}</span>
          <span class="status-badge badge-pending">⏳ Pending: ${pendingInstallments}</span>
          <span class="status-badge badge-overdue">⚠️ Overdue: ${overdueInstallments}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📅 Installment Schedule</div>
        <table>
          <thead><tr>
            <th style="text-align:center">#</th><th>Due Date</th><th class="amount">Due (UGX)</th><th class="amount">Paid (UGX)</th><th class="amount">Penalty</th><th>Source</th><th style="text-align:center">Status</th><th>Paid Date</th>
          </tr></thead>
          <tbody>${installmentRows || '<tr><td colspan="8" style="text-align:center;padding:12px;color:#999">No installments recorded yet</td></tr>'}</tbody>
        </table>
      </div>

      ${txRows ? `
      <div class="section" style="page-break-before:auto">
        <div class="section-title">📊 Transaction History</div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th class="amount">Amount (UGX)</th></tr></thead>
          <tbody>${txRows}</tbody>
        </table>
      </div>` : ''}

      <div class="penalty-note">
        <strong>⚠ Terms & Conditions:</strong> Late payments incur a 20% penalty per overdue week (max 2 weeks / 40%). 
        Recovery order: Wallet → Salary → Guarantor. Missed installments block new loan requests.
        ${loan.loan_type === 'long_term' ? '<br/><strong>💡 Early Repayment:</strong> Long-term loans charge interest daily. Pay early via MoMo to save on interest.' : ''}
      </div>

      <div class="footer">
        This is a system-generated loan statement for ${loan.employee_name}. All amounts in Uganda Shillings (UGX).<br/>
        GREAT PEARL COFFEE — Loan Management System — ${new Date().getFullYear()}
      </div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending_guarantor: { variant: 'outline', label: 'Awaiting Guarantor' },
      pending_admin: { variant: 'secondary', label: 'Pending Admin' },
      approved: { variant: 'default', label: 'Approved' },
      active: { variant: 'default', label: 'Active' },
      completed: { variant: 'default', label: 'Completed' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      defaulted: { variant: 'destructive', label: 'Defaulted' },
    };
    const s = map[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Calculate loan limit - use AI limit if available, fallback to salary-based
  const getLoanLimit = (empEmail: string, empSalary: number, empAuthId?: string) => {
    const empLoans = (loans.length > 0 ? loans : myLoans).filter(l => l.employee_email === empEmail && ['active', 'pending_guarantor', 'pending_admin'].includes(l.status));
    const outstanding = empLoans.reduce((s: number, l: any) => s + (l.remaining_balance || l.loan_amount || 0), 0);
    const activeCount = empLoans.length;
    const walletBal = empAuthId ? (walletBalances[empAuthId] || 0) : 0;

    // Use AI-determined limit if available for current user
    if (aiLoanLimit && empEmail === employee?.email) {
      return {
        salary: empSalary,
        maxFromSalary: aiLoanLimit.loan_limit + outstanding, // AI already subtracted outstanding
        outstanding,
        activeCount,
        walletBal: aiLoanLimit.wallet_balance || walletBal,
        availableLimit: Math.max(0, aiLoanLimit.loan_limit),
        riskScore: aiLoanLimit.risk_score,
        factors: aiLoanLimit.factors,
        isAi: true,
      };
    }

    const maxFromSalary = empSalary * 2;
    const availableLimit = Math.max(0, maxFromSalary - outstanding);
    return { salary: empSalary, maxFromSalary, outstanding, activeCount, walletBal, availableLimit, riskScore: null, factors: null, isAi: false };
  };

  const myLimit = employee ? getLoanLimit(employee.email, employee.salary || 0, employee.authUserId) : null;

  const { monthlyRate: previewRate, dailyRate: previewDailyRate, interest: previewInterest, total: previewTotal, weekly: previewWeekly, totalWeeks: previewTotalWeeks, totalDays: previewTotalDays } = calculateLoanDetails();

  return (
    <DashboardLayout title="Quick Loans" subtitle="Borrow and manage short-term loans">
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Quick Loans</h1>
              <p className="text-muted-foreground">Borrow and manage short-term loans</p>
            </div>
            <div className="flex gap-2">
              {isAdmin() && <LoanAdvertDialog />}
            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
              <DialogTrigger asChild>
                <Button><Banknote className="mr-2 h-4 w-4" /> Request Loan</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Request a Quick Loan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Loan Amount (UGX)</Label>
                    <Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="e.g. 500000" />
                    <p className="text-xs text-muted-foreground mt-1">Max: UGX {(myLimit?.availableLimit || (employee?.salary || 0) * 2).toLocaleString()} {myLimit?.isAi ? '(AI assessed)' : '(2x salary)'}</p>
                  </div>
                  <div>
                    <Label>Loan Type</Label>
                    <Select value={loanType} onValueChange={(v) => setLoanType(v as LoanType)}>
                      <SelectTrigger><SelectValue placeholder="Select loan type" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(LOAN_TYPE_CONFIG).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>{cfg.label} – {cfg.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration (Months)</Label>
                    <Select value={durationMonths} onValueChange={setDurationMonths}>
                      <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(m => {
                          const { totalWeeks } = getLoanSchedule(m);
                          const dailyR = getDailyRate(loanType);
                          return (
                            <SelectItem key={m} value={m.toString()}>
                              {m} month{m > 1 ? 's' : ''} ({totalWeeks} weeks) - {dailyR.toFixed(2)}%/day ({LOAN_TYPE_CONFIG[loanType].monthlyRate}%/mo)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select Guarantor</Label>
                    <Select value={guarantorId} onValueChange={setGuarantorId}>
                      <SelectTrigger><SelectValue placeholder="Choose a colleague" /></SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.email !== employee?.email).map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.name} ({e.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {parseFloat(loanAmount) > 0 && durationMonths && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4 space-y-1 text-sm">
                        <div className="flex justify-between"><span>Principal:</span><span>UGX {parseFloat(loanAmount).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Daily Rate:</span><span>{previewDailyRate.toFixed(3)}% ({previewRate}%/month)</span></div>
                        <div className="flex justify-between"><span>Duration:</span><span>{previewTotalDays} days ({previewTotalWeeks} weeks)</span></div>
                        <div className="flex justify-between"><span>Total Interest:</span><span>UGX {Math.ceil(previewInterest).toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold"><span>Total Repayable:</span><span>UGX {Math.ceil(previewTotal).toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold text-primary"><span>Weekly Installment:</span><span>UGX {Math.ceil(previewWeekly).toLocaleString()}</span></div>
                      </CardContent>
                    </Card>
                  )}

                  <Button onClick={handleRequestLoan} disabled={submitting} className="w-full">
                    {submitting ? 'Submitting...' : 'Submit Loan Request'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Early Repayment Dialog */}
            <Dialog open={showEarlyPayDialog} onOpenChange={(open) => { setShowEarlyPayDialog(open); if (!open) setSelectedLoanForPayment(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Early Loan Repayment</DialogTitle>
                </DialogHeader>
                {selectedLoanForPayment && (
                  <div className="space-y-4">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4 space-y-1 text-sm">
                        <div className="flex justify-between"><span>Loan Amount:</span><span>UGX {selectedLoanForPayment.loan_amount?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Original Total:</span><span>UGX {selectedLoanForPayment.total_repayable?.toLocaleString()}</span></div>
                        {selectedLoanForPayment.start_date && (() => {
                          const ep = calculateEarlyPayoff(selectedLoanForPayment);
                          const dh = Math.max(1, Math.floor((Date.now() - new Date(selectedLoanForPayment.start_date).getTime()) / (1000 * 60 * 60 * 24)));
                          return (
                            <>
                              <div className="flex justify-between"><span>Days Held:</span><span>{dh} day(s)</span></div>
                              <div className="flex justify-between font-semibold text-primary"><span>Early Payoff (daily interest):</span><span>UGX {ep.toLocaleString()}</span></div>
                              <div className="mt-1 p-2 bg-accent/50 rounded text-xs">💡 Interest calculated daily – pay sooner, save more!</div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                    <div>
                      <Label>Payment Amount (UGX)</Label>
                      <Input type="number" value={earlyPayAmount} onChange={e => setEarlyPayAmount(e.target.value)} placeholder="Enter amount to pay" />
                      <p className="text-xs text-muted-foreground mt-1">Max: UGX {calculateEarlyPayoff(selectedLoanForPayment).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label>Payment Method</Label>
                      <Select value={earlyPayMethod} onValueChange={setEarlyPayMethod}>
                        <SelectTrigger><SelectValue placeholder="How are you paying?" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash (handed to finance)</SelectItem>
                          <SelectItem value="bank_deposit">Bank Deposit</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="wallet">Deduct from Wallet Balance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes / Reference (optional)</Label>
                      <Textarea value={earlyPayNotes} onChange={e => setEarlyPayNotes(e.target.value)} placeholder="e.g. Bank deposit ref, receipt number..." rows={2} />
                    </div>
                    <Button onClick={handleEarlyRepayment} disabled={submitting} className="w-full">
                      {submitting ? 'Processing...' : `Pay UGX ${(parseFloat(earlyPayAmount) || 0).toLocaleString()}`}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Mobile Money Repayment Dialog */}
            <Dialog open={showMomoRepayDialog} onOpenChange={(open) => { setShowMomoRepayDialog(open); if (!open) { setMomoRepayLoan(null); setMomoRepayStatus('idle'); } }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Repay Loan via Mobile Money</DialogTitle>
                </DialogHeader>
                {momoRepayLoan && (
                  <div className="space-y-4">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4 space-y-1 text-sm">
                        <div className="flex justify-between"><span>Loan Amount:</span><span>UGX {momoRepayLoan.loan_amount?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Total Repayable:</span><span>UGX {momoRepayLoan.total_repayable?.toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold text-primary"><span>Remaining Balance:</span><span>UGX {momoRepayLoan.remaining_balance?.toLocaleString()}</span></div>
                        {momoRepayLoan.start_date && (() => {
                          const earlyPayoff = calculateEarlyPayoff(momoRepayLoan);
                          const daysHeld = Math.max(1, Math.floor((Date.now() - new Date(momoRepayLoan.start_date).getTime()) / (1000 * 60 * 60 * 24)));
                          const monthlyRate = LOAN_TYPE_CONFIG[(momoRepayLoan.loan_type || 'quick') as LoanType]?.monthlyRate || 10;
                          const dailyRate = monthlyRate / 30 / 100;
                          const interestForDays = Math.ceil(momoRepayLoan.loan_amount * dailyRate * daysHeld);
                          return (
                            <div className="mt-2 p-2 bg-accent/50 rounded text-xs">
                              <strong>💡 Daily interest:</strong> {(dailyRate * 100).toFixed(3)}%/day
                              <div className="mt-1">Days held: {daysHeld} | Interest so far: UGX {interestForDays.toLocaleString()} | <strong>Early payoff: UGX {earlyPayoff.toLocaleString()}</strong></div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                    <div>
                      <Label>Phone Number (Mobile Money)</Label>
                      <Input value={momoRepayPhone} onChange={e => setMomoRepayPhone(e.target.value)} placeholder="e.g. 0701234567" />
                      <p className="text-xs text-muted-foreground mt-1">You'll receive a payment prompt on this number</p>
                    </div>
                    <div>
                      <Label>Amount to Pay (UGX)</Label>
                      <Input type="number" value={momoRepayAmount} onChange={e => setMomoRepayAmount(e.target.value)} placeholder="Enter amount" />
                      <p className="text-xs text-muted-foreground mt-1">Max: UGX {momoRepayLoan.remaining_balance?.toLocaleString()}</p>
                    </div>

                    {momoRepayStatus === 'success' && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-300 dark:border-green-700 rounded text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" /> Payment successful! Balance updated.
                      </div>
                    )}
                    {momoRepayStatus === 'failed' && (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive flex items-center gap-2">
                        <XCircle className="h-5 w-5" /> Payment failed. Please try again.
                      </div>
                    )}

                    <Button onClick={handleMomoRepayment} disabled={momoRepayLoading || momoRepayStatus === 'success'} className="w-full">
                      {momoRepayLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Collecting payment...</>
                      ) : momoRepayStatus === 'success' ? (
                        <><CheckCircle className="mr-2 h-4 w-4" /> Payment Complete</>
                      ) : (
                        <><Phone className="mr-2 h-4 w-4" /> Collect UGX {(parseFloat(momoRepayAmount) || 0).toLocaleString()} via MoMo</>
                      )}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Wallet Repayment Dialog */}
            <Dialog open={showWalletRepayDialog} onOpenChange={(open) => { setShowWalletRepayDialog(open); if (!open) setWalletRepayLoan(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Repay Loan from Wallet</DialogTitle>
                </DialogHeader>
                {walletRepayLoan && (() => {
                  const earlyPayoff = calculateEarlyPayoff(walletRepayLoan);
                  const daysHeld = Math.max(1, Math.floor((Date.now() - new Date(walletRepayLoan.start_date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
                  const monthlyRate = LOAN_TYPE_CONFIG[(walletRepayLoan.loan_type || 'quick') as LoanType]?.monthlyRate || 10;
                  const dailyRate = monthlyRate / 30 / 100;
                  const interestForDays = Math.ceil(walletRepayLoan.loan_amount * dailyRate * daysHeld);
                  return (
                    <div className="space-y-4">
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 space-y-1 text-sm">
                          <div className="flex justify-between"><span>Loan Amount:</span><span>UGX {walletRepayLoan.loan_amount?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Original Total:</span><span>UGX {walletRepayLoan.total_repayable?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Days Held:</span><span>{daysHeld} day(s)</span></div>
                          <div className="flex justify-between"><span>Daily Interest ({(dailyRate * 100).toFixed(3)}%/day):</span><span>UGX {interestForDays.toLocaleString()}</span></div>
                          <div className="flex justify-between font-semibold text-primary"><span>Early Payoff Amount:</span><span>UGX {earlyPayoff.toLocaleString()}</span></div>
                          <div className="mt-2 p-2 bg-accent/50 rounded text-xs">
                            💡 Interest is calculated daily. Pay sooner = pay less interest!
                          </div>
                        </CardContent>
                      </Card>
                      <div className="p-3 bg-muted rounded-lg text-sm flex justify-between">
                        <span>Your Wallet Balance:</span>
                        <span className="font-semibold">UGX {myWalletBalance.toLocaleString()}</span>
                      </div>
                      <div>
                        <Label>Amount to Pay (UGX)</Label>
                        <Input type="number" value={walletRepayAmount} onChange={e => setWalletRepayAmount(e.target.value)} placeholder="Enter amount" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Max payable: UGX {Math.min(earlyPayoff, myWalletBalance).toLocaleString()}
                        </p>
                      </div>
                      <Button onClick={handleWalletRepayment} disabled={walletRepayLoading || !walletRepayAmount} className="w-full">
                        {walletRepayLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                        ) : (
                          <><Wallet className="mr-2 h-4 w-4" /> Pay UGX {(parseFloat(walletRepayAmount) || 0).toLocaleString()} from Wallet</>
                        )}
                      </Button>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Guarantor Approval Banner */}
          {pendingGuarantorLoan && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold">Guarantor Request</h3>
                      <p className="text-sm text-muted-foreground">
                        <strong>{pendingGuarantorLoan.employee_name}</strong> wants you to guarantee a loan of{' '}
                        <strong>UGX {pendingGuarantorLoan.loan_amount?.toLocaleString()}</strong> for{' '}
                        {pendingGuarantorLoan.duration_months} month(s) ({pendingGuarantorLoan.repayment_frequency === 'weekly' ? 'weekly repayments' : 'monthly repayments'}). If they fail to repay, the amount will be deducted from your salary.
                      </p>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Enter Approval Code (sent via SMS)</Label>
                        <Input value={guarantorCode} onChange={e => setGuarantorCode(e.target.value)} placeholder="6-digit code" />
                      </div>
                      <Button size="sm" onClick={() => handleGuarantorApproval(true)} disabled={submitting || !guarantorCode}>
                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleGuarantorApproval(false)} disabled={submitting}>
                        <XCircle className="mr-1 h-4 w-4" /> Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {myLimit && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" /> My Loan Eligibility
                  {aiLimitLoading && <span className="text-xs text-muted-foreground ml-2">Analyzing...</span>}
                  {myLimit.isAi && <Badge variant="outline" className="ml-2 text-xs">AI Scored</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Salary</p>
                    <p className="text-lg font-bold">UGX {myLimit.salary.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Wallet Balance</p>
                    <p className="text-lg font-bold text-primary">UGX {Math.max(0, myLimit.walletBal).toLocaleString()}</p>
                  </div>
                  {myLimit.riskScore !== null && myLimit.riskScore !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                      <p className={`text-lg font-bold ${myLimit.riskScore >= 70 ? 'text-green-600' : myLimit.riskScore >= 40 ? 'text-yellow-600' : 'text-destructive'}`}>
                        {myLimit.riskScore}/100
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding Loans</p>
                    <p className="text-lg font-bold text-destructive">UGX {myLimit.outstanding.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available to Borrow</p>
                    <p className="text-lg font-bold text-green-600">UGX {myLimit.availableLimit.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Active loans: {myLimit.activeCount}/3
                  {myLimit.isAi && ' • Limit determined by AI risk assessment'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Wallet & Loan Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/10">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">My Wallet Balance</p>
                  <p className="text-2xl font-bold text-green-600">UGX {Math.max(0, myWalletBalance).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Loan Balance</p>
                  <p className="text-2xl font-bold text-destructive">UGX {myLoans.filter(l => l.status === 'active').reduce((s, l) => s + (l.remaining_balance || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{myLoans.filter(l => l.status === 'active').length} active loan(s)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Banknote className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">My Active Loans</p>
                  <p className="text-2xl font-bold">{myLoans.filter(l => l.status === 'active').length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{myLoans.filter(l => ['pending_guarantor', 'pending_admin'].includes(l.status)).length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Borrowed</p>
                  <p className="text-2xl font-bold">UGX {myLoans.filter(l => ['active', 'completed'].includes(l.status)).reduce((s, l) => s + (l.loan_amount || 0), 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold">UGX {myLoans.filter(l => l.status === 'active').reduce((s, l) => s + (l.remaining_balance || 0), 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="my-loans" onValueChange={(val) => {
            if (val === 'employee-limits' && Object.keys(allAiLimits).length === 0 && !allAiLimitsLoading) {
              fetchAllAiLimits();
            }
          }}>
            <TabsList>
              <TabsTrigger value="my-loans">My Loans</TabsTrigger>
              {isAdmin() && <TabsTrigger value="all-loans">All Loans (Admin)</TabsTrigger>}
              {isAdmin() && <TabsTrigger value="employee-limits">Employee Limits</TabsTrigger>}
              <TabsTrigger value="repayments">Repayment Schedule</TabsTrigger>
              <TabsTrigger value="guaranteed">Guaranteed Loans</TabsTrigger>
            </TabsList>

            <TabsContent value="my-loans">
              <Card>
                <CardHeader><CardTitle>My Loan History</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Installment</TableHead>
                        <TableHead>Guarantor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myLoans.map(loan => (
                        <TableRow key={loan.id}>
                          <TableCell className="text-sm">
                            {new Date(loan.created_at).toLocaleDateString()}
                            {loan.loan_type === 'long_term' && <Badge variant="secondary" className="ml-1 text-[10px]">Long-term</Badge>}
                          </TableCell>
                          <TableCell>UGX {loan.loan_amount?.toLocaleString()}</TableCell>
                          <TableCell>{loan.duration_months}mo {loan.repayment_frequency === 'weekly' ? `(${loan.total_weeks || '?'}wks)` : ''}</TableCell>
                          <TableCell>{loan.repayment_frequency === 'weekly' ? `${(loan.daily_interest_rate || 0).toFixed(2)}%/day` : `${loan.interest_rate}%`}</TableCell>
                          <TableCell>UGX {loan.monthly_installment?.toLocaleString()}{loan.repayment_frequency === 'weekly' ? '/wk' : '/mo'}</TableCell>
                          <TableCell className="text-sm">{loan.guarantor_name}</TableCell>
                          <TableCell>{getStatusBadge(loan.status)}</TableCell>
                          <TableCell>UGX {loan.remaining_balance?.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button size="sm" variant="ghost" onClick={() => printLoanStatement(loan)}>
                                <FileText className="mr-1 h-3 w-3" /> Statement
                              </Button>
                              {loan.status === 'active' && (loan.remaining_balance || 0) > 0 && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setSelectedLoanForPayment(loan);
                                    setShowEarlyPayDialog(true);
                                  }}>
                                    <CreditCard className="mr-1 h-3 w-3" /> Pay Early
                                  </Button>
                                  <Button size="sm" variant="default" onClick={() => {
                                    setMomoRepayLoan(loan);
                                    setMomoRepayPhone(employee?.phone || '');
                                    setMomoRepayAmount('');
                                    setMomoRepayStatus('idle');
                                    setShowMomoRepayDialog(true);
                                  }}>
                                    <Phone className="mr-1 h-3 w-3" /> Repay via MoMo
                                  </Button>
                                  <Button size="sm" variant="secondary" onClick={() => {
                                    setWalletRepayLoan(loan);
                                    setWalletRepayAmount('');
                                    setShowWalletRepayDialog(true);
                                  }}>
                                    <Wallet className="mr-1 h-3 w-3" /> Pay from Wallet
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {myLoans.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No loans yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin() && (
              <TabsContent value="all-loans">
                <Card>
                  <CardHeader><CardTitle>All Loan Requests</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Wallet</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Total Repayable</TableHead>
                          <TableHead>Available Limit</TableHead>
                          <TableHead>Guarantor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map(loan => {
                          const emp = employees.find(e => e.email === loan.employee_email);
                          const limit = getLoanLimit(loan.employee_email, emp?.salary || 0, emp?.auth_user_id);
                          return (
                          <TableRow key={loan.id}>
                            <TableCell>
                              <div>{loan.employee_name}</div>
                              <div className="text-xs text-muted-foreground">{loan.employee_email}</div>
                            </TableCell>
                            <TableCell className="text-xs">UGX {(emp?.salary || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-xs">UGX {Math.max(0, limit.walletBal).toLocaleString()}</TableCell>
                            <TableCell>UGX {loan.loan_amount?.toLocaleString()}</TableCell>
                            <TableCell>{loan.duration_months}mo {loan.repayment_frequency === 'weekly' ? `(${loan.total_weeks || '?'}wks, ${(loan.daily_interest_rate || 0).toFixed(2)}%/day)` : `(${loan.interest_rate}%)`}</TableCell>
                            <TableCell>UGX {loan.total_repayable?.toLocaleString()}</TableCell>
                            <TableCell className="text-xs font-medium text-green-600">UGX {limit.availableLimit.toLocaleString()}</TableCell>
                            <TableCell>
                              <div>{loan.guarantor_name}</div>
                              <div className="text-xs">{loan.guarantor_approved ? <Badge variant="default" className="text-xs">Approved</Badge> : <Badge variant="outline" className="text-xs">Pending</Badge>}</div>
                            </TableCell>
                            <TableCell>{getStatusBadge(loan.status)}</TableCell>
                            <TableCell>
                              {loan.status === 'pending_admin' && (
                                <Button size="sm" variant="outline" onClick={() => setReviewLoan(loan)} disabled={submitting}>
                                  <Shield className="mr-1 h-3 w-3" /> Review
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                        {loans.length === 0 && (
                          <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No loan requests</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {isAdmin() && (
              <TabsContent value="employee-limits">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      AI Credit Assessment — All Employees
                      {allAiLimitsLoading && <Badge variant="outline" className="text-xs">Analyzing...</Badge>}
                      {!allAiLimitsLoading && Object.keys(allAiLimits).length > 0 && (
                        <Badge variant="outline" className="text-xs">{Object.keys(allAiLimits).length} assessed</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allAiLimitsLoading && Object.keys(allAiLimits).length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                        <p>AI is analyzing employee credit profiles...</p>
                        <p className="text-xs mt-1">This may take a moment for all employees</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Salary</TableHead>
                            <TableHead>Wallet</TableHead>
                            <TableHead>Risk Score</TableHead>
                            <TableHead>AI Loan Limit</TableHead>
                            <TableHead>Outstanding</TableHead>
                            <TableHead>Active Loans</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((emp: any) => {
                            const aiData = allAiLimits[emp.email];
                            return (
                              <TableRow key={emp.id}>
                                <TableCell>
                                  <div className="font-medium">{emp.name}</div>
                                  <div className="text-xs text-muted-foreground">{emp.email}</div>
                                </TableCell>
                                <TableCell className="text-sm">UGX {(emp.salary || 0).toLocaleString()}</TableCell>
                                <TableCell className="text-sm">
                                  {aiData ? `UGX ${Math.max(0, aiData.wallet_balance || 0).toLocaleString()}` : '—'}
                                </TableCell>
                                <TableCell>
                                  {aiData ? (
                                    <Badge variant={aiData.risk_score >= 70 ? 'default' : aiData.risk_score >= 40 ? 'outline' : 'destructive'}>
                                      {aiData.risk_score}/100
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  {aiData ? `UGX ${(aiData.loan_limit || 0).toLocaleString()}` : '—'}
                                </TableCell>
                                <TableCell className="text-sm text-destructive">
                                  {aiData ? `UGX ${(aiData.outstanding || 0).toLocaleString()}` : '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {aiData ? aiData.active_loans : '—'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="repayments">
              <RepaymentSchedule myLoans={myLoans} />
            </TabsContent>

            <TabsContent value="guaranteed">
              <GuaranteedLoansTab
                guaranteedLoans={guaranteedLoans}
                onRevoke={handleRevokeGuarantee}
                submitting={submitting}
                getStatusBadge={getStatusBadge}
                printLoanStatement={printLoanStatement}
              />
            </TabsContent>
          </Tabs>
      </div>

      <LoanReviewModal
        loan={reviewLoan}
        open={!!reviewLoan}
        onClose={() => setReviewLoan(null)}
        onApprove={(loanId) => {
          handleAdminApproval(loanId, true);
          setReviewLoan(null);
        }}
        onReject={(loanId, reason) => {
          handleAdminApproval(loanId, false, reason);
          setReviewLoan(null);
        }}
        submitting={submitting}
      />
      <LoanRepaymentSlip
        open={showRepaymentSlip}
        onClose={() => setShowRepaymentSlip(false)}
        loanData={repaymentSlipData}
      />
    </DashboardLayout>
  );
};

const RepaymentSchedule = ({ myLoans }: { myLoans: any[] }) => {
  const [repayments, setRepayments] = useState<any[]>([]);
  const activeLoans = myLoans.filter(l => l.status === 'active');

  useEffect(() => {
    if (activeLoans.length === 0) return;
    const fetchRepayments = async () => {
      const loanIds = activeLoans.map(l => l.id);
      const { data } = await supabase.from('loan_repayments').select('*').in('loan_id', loanIds).order('due_date', { ascending: true });
      setRepayments(data || []);
    };
    fetchRepayments();
  }, [myLoans]);

  const getRepaymentsByLoan = (loanId: string) => repayments.filter(r => r.loan_id === loanId);

  const printLoanSchedule = (loan: any) => {
    const loanRepayments = getRepaymentsByLoan(loan.id);
    const isWeekly = loan.repayment_frequency === 'weekly';
    const totalPaid = loanRepayments.reduce((s: number, r: any) => s + (r.amount_paid || 0), 0);

    const rows = loanRepayments.map((r: any) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${r.installment_number}</td>
        <td style="padding:6px 10px;border:1px solid #ddd">${new Date(r.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">UGX ${(r.amount_due || 0).toLocaleString()}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">UGX ${(r.amount_paid || 0).toLocaleString()}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center;color:${r.status === 'paid' ? '#16a34a' : r.status === 'overdue' ? '#dc2626' : '#666'};font-weight:600">${r.status.toUpperCase()}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Loan Repayment Program</title>
      <style>
        body{font:13px/1.6 system-ui;margin:0;padding:24px;color:#333}
        table{width:100%;border-collapse:collapse;margin:16px 0}
        th{padding:8px 10px;border:1px solid #333;background:#f1f3f4;font-size:12px;text-align:left}
        .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px}
        .summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;font-size:13px}
        .summary div{padding:6px 0;border-bottom:1px solid #eee}
        .footer{text-align:center;font-size:10px;color:#888;margin-top:30px;border-top:1px solid #ddd;padding-top:10px}
        @media print{body{padding:15px}}
      </style>
    </head><body>
      <div class="header">
        <h2 style="margin:0 0 4px;color:#1a365d">GREAT PEARL COFFEE</h2>
        <h3 style="margin:0;font-weight:normal;color:#555">Loan Repayment Program</h3>
      </div>

      <div class="summary">
        <div><strong>Borrower:</strong> ${loan.employee_name}</div>
        <div><strong>Loan Date:</strong> ${new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div><strong>Principal Amount:</strong> UGX ${(loan.loan_amount || 0).toLocaleString()}</div>
        <div><strong>Interest:</strong> ${isWeekly ? `${(loan.daily_interest_rate || 0).toFixed(2)}% daily` : `${loan.interest_rate}% monthly`}</div>
        <div><strong>Total Repayable:</strong> UGX ${(loan.total_repayable || 0).toLocaleString()}</div>
        <div><strong>Frequency:</strong> ${isWeekly ? `Weekly (${loan.total_weeks} weeks)` : `Monthly (${loan.duration_months} months)`}</div>
        <div><strong>Installment:</strong> UGX ${(loan.monthly_installment || 0).toLocaleString()} / ${isWeekly ? 'week' : 'month'}</div>
        <div><strong>Remaining Balance:</strong> UGX ${(loan.remaining_balance || 0).toLocaleString()}</div>
        <div><strong>Guarantor:</strong> ${loan.guarantor_name || 'N/A'}</div>
        <div><strong>Total Paid:</strong> UGX ${totalPaid.toLocaleString()}</div>
      </div>

      <table>
        <thead><tr><th style="text-align:center">#</th><th>Due Date</th><th style="text-align:right">Amount Due (UGX)</th><th style="text-align:right">Amount Paid (UGX)</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>This is a computer-generated document. For queries, contact the Finance Department.</p>
      </div>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const downloadLoanSchedule = (loan: any) => {
    const loanRepayments = getRepaymentsByLoan(loan.id);
    const isWeekly = loan.repayment_frequency === 'weekly';
    let csv = 'Installment,Due Date,Amount Due (UGX),Amount Paid (UGX),Status\n';
    loanRepayments.forEach((r: any) => {
      csv += `${r.installment_number},${new Date(r.due_date).toLocaleDateString()},${r.amount_due || 0},${r.amount_paid || 0},${r.status}\n`;
    });
    csv += `\nLoan Summary\n`;
    csv += `Principal,UGX ${loan.loan_amount}\n`;
    csv += `Total Repayable,UGX ${loan.total_repayable}\n`;
    csv += `Frequency,${isWeekly ? 'Weekly' : 'Monthly'}\n`;
    csv += `Remaining Balance,UGX ${loan.remaining_balance}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repayment-program-${loan.id.slice(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (activeLoans.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Repayment Schedule</CardTitle></CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No active loans with repayment schedules</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {activeLoans.map(loan => {
        const loanRepayments = getRepaymentsByLoan(loan.id);
        const isWeekly = loan.repayment_frequency === 'weekly';
        const totalPaid = loanRepayments.reduce((s: number, r: any) => s + (r.amount_paid || 0), 0);
        const progress = loan.total_repayable ? Math.round((totalPaid / loan.total_repayable) * 100) : 0;

        return (
          <Card key={loan.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">
                  Loan — UGX {(loan.loan_amount || 0).toLocaleString()}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {isWeekly ? `${loan.total_weeks} weeks` : `${loan.duration_months} months`}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadLoanSchedule(loan)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => printLoanSchedule(loan)}>
                    <Printer className="h-3.5 w-3.5 mr-1" /> Print
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Principal:</span>
                  <span className="ml-1 font-medium">UGX {(loan.loan_amount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Interest:</span>
                  <span className="ml-1 font-medium">{isWeekly ? `${(loan.daily_interest_rate || 0).toFixed(2)}%/day` : `${loan.interest_rate}%/mo`}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Installment:</span>
                  <span className="ml-1 font-medium">UGX {(loan.monthly_installment || 0).toLocaleString()}/{isWeekly ? 'wk' : 'mo'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="ml-1 font-medium text-destructive">UGX {(loan.remaining_balance || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Repayment progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanRepayments.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.installment_number}</TableCell>
                      <TableCell>{new Date(r.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>UGX {(r.amount_due || 0).toLocaleString()}</TableCell>
                      <TableCell>UGX {(r.amount_paid || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'paid' ? 'default' : r.status === 'overdue' ? 'destructive' : 'outline'}>
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loanRepayments.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No installments found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const GuaranteedLoansTab = ({ guaranteedLoans, onRevoke, submitting, getStatusBadge, printLoanStatement }: {
  guaranteedLoans: any[];
  onRevoke: (loanId: string) => void;
  submitting: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
  printLoanStatement: (loan: any) => void;
}) => {
  const [repayments, setRepayments] = useState<Record<string, any[]>>({});
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const fetchRepaymentsForLoan = async (loanId: string) => {
    if (repayments[loanId]) {
      setExpandedLoan(expandedLoan === loanId ? null : loanId);
      return;
    }
    const { data } = await supabase.from('loan_repayments').select('*').eq('loan_id', loanId).order('due_date', { ascending: true });
    setRepayments(prev => ({ ...prev, [loanId]: data || [] }));
    setExpandedLoan(loanId);
  };

  if (guaranteedLoans.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Loans I've Guaranteed</CardTitle></CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">You haven't guaranteed any loans yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Loans I've Guaranteed</CardTitle>
          <p className="text-sm text-muted-foreground">Track loans you've guaranteed and their repayment progress. You can revoke your guarantee if admin hasn't approved yet.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Total Repayable</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guaranteedLoans.map(loan => {
                const progress = loan.total_repayable ? Math.round(((loan.total_repayable - (loan.remaining_balance || 0)) / loan.total_repayable) * 100) : 0;
                const canRevoke = loan.status === 'pending_admin' && !loan.admin_approved;
                return (
                  <React.Fragment key={loan.id}>
                    <TableRow>
                      <TableCell>
                        <div className="font-medium">{loan.employee_name}</div>
                        <div className="text-xs text-muted-foreground">{loan.employee_email}</div>
                      </TableCell>
                      <TableCell>UGX {(loan.loan_amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{loan.duration_months}mo</TableCell>
                      <TableCell>UGX {(loan.total_repayable || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div>UGX {(loan.remaining_balance || 0).toLocaleString()}</div>
                        {loan.status === 'active' && (
                          <div className="mt-1">
                            <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{progress}% paid</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell className="text-sm">{new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {['active', 'completed', 'defaulted'].includes(loan.status) && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => fetchRepaymentsForLoan(loan.id)}>
                                <Eye className="mr-1 h-3 w-3" /> {expandedLoan === loan.id ? 'Hide' : 'View'} Schedule
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => printLoanStatement(loan)}>
                                <FileText className="mr-1 h-3 w-3" /> Statement
                              </Button>
                            </>
                          )}
                          {canRevoke && (
                            <Button size="sm" variant="destructive" onClick={() => onRevoke(loan.id)} disabled={submitting}>
                              <ShieldOff className="mr-1 h-3 w-3" /> Revoke Guarantee
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedLoan === loan.id && repayments[loan.id] && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="text-sm font-semibold mb-2">Repayment Schedule for {loan.employee_name}</div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Amount Due</TableHead>
                                <TableHead>Amount Paid</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {repayments[loan.id].map((r: any) => (
                                <TableRow key={r.id}>
                                  <TableCell>{r.installment_number}</TableCell>
                                  <TableCell>{new Date(r.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</TableCell>
                                  <TableCell>UGX {(r.amount_due || 0).toLocaleString()}</TableCell>
                                  <TableCell>UGX {(r.amount_paid || 0).toLocaleString()}</TableCell>
                                  <TableCell>
                                    <Badge variant={r.status === 'paid' ? 'default' : r.status === 'overdue' ? 'destructive' : 'outline'}>
                                      {r.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {repayments[loan.id].length === 0 && (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No installments yet</TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickLoans;
