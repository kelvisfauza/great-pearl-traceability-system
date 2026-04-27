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
import { Banknote, Clock, Shield, Users, AlertTriangle, CheckCircle, XCircle, CreditCard, Download, Printer, Phone, Loader2, FileText, Eye, ShieldOff, Wallet, HandCoins, ArrowUpCircle, Edit } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import AdminLoanTracker from '@/components/loans/AdminLoanTracker';
import { Textarea } from '@/components/ui/textarea';
import LoanAdvertDialog from '@/components/loans/LoanAdvertDialog';
import LoanReviewModal from '@/components/loans/LoanReviewModal';
import LoanRepaymentSlip from '@/components/loans/LoanRepaymentSlip';
import { generateLoanAgreementPdf } from '@/utils/loanAgreementPdf';

// Loan types with their monthly interest rates
type LoanType = 'quick' | 'long_term';
type RepaymentFrequency = 'weekly' | 'monthly' | 'bullet';

const LOAN_TYPE_CONFIG: Record<LoanType, { label: string; monthlyRate: number; maxRate: number; description: string; frequencies: RepaymentFrequency[] }> = {
  quick: { label: 'Quick Loan', monthlyRate: 15, maxRate: 15, description: '15%/month – Short-term, weekly repayments', frequencies: ['weekly'] },
  long_term: { label: 'Long-Term Loan', monthlyRate: 10, maxRate: 30, description: '10%/month – Flexible repayment, monthly or bullet (cap 30%)', frequencies: ['monthly', 'bullet'] },
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

// Helper: get total interest capped at maxRate
const getCappedInterest = (principal: number, monthlyRate: number, months: number, maxRate: number) => {
  const rawInterest = principal * (monthlyRate / 100) * months;
  const maxInterest = principal * (maxRate / 100);
  return Math.min(rawInterest, maxInterest);
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
  const [showChangeGuarantorDialog, setShowChangeGuarantorDialog] = useState(false);
  const [changeGuarantorLoan, setChangeGuarantorLoan] = useState<any>(null);
  const [newGuarantorId, setNewGuarantorId] = useState('');
  const [showCounterOfferDialog, setShowCounterOfferDialog] = useState(false);
  const [counterOfferLoan, setCounterOfferLoan] = useState<any>(null);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [topUpLoan, setTopUpLoan] = useState<any>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpGuarantorId, setTopUpGuarantorId] = useState('');
  const [topUpDuration, setTopUpDuration] = useState('');
  const [topUpType, setTopUpType] = useState<LoanType>('quick');
  const [topUpFrequency, setTopUpFrequency] = useState<RepaymentFrequency>('weekly');
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [modifyLoan, setModifyLoan] = useState<any>(null);
  const [modifyAmount, setModifyAmount] = useState('');
  const [modifyDuration, setModifyDuration] = useState('');
  const [modifyType, setModifyType] = useState<LoanType>('quick');
  const [modifyFrequency, setModifyFrequency] = useState<RepaymentFrequency>('weekly');
  const [modifyPurpose, setModifyPurpose] = useState('');
  const [modifyGuarantorId, setModifyGuarantorId] = useState('');

  // Form state
  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('quick');
  const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>('weekly');
  const [durationMonths, setDurationMonths] = useState('');
  const [guarantorId, setGuarantorId] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');

  useEffect(() => {
    fetchLoans();
    fetchEmployees();
    checkGuarantorRequests();
    fetchGuaranteedLoans();
    fetchWalletBalances();
  }, [employee]);

  const fetchLoans = async () => {
    if (!employee) return;
    setLoading(true);
    try {
      if (isAdmin() || employee?.role === 'Manager') {
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
      // Use server-side aggregation to avoid the 1000-row Supabase limit
      const { data: allBalances, error: balError } = await supabase.rpc('get_all_wallet_balances');
      if (!balError && allBalances) {
        const balances: Record<string, number> = {};
        (allBalances as any[]).forEach((entry: any) => {
          balances[entry.user_id] = Number(entry.wallet_balance) || 0;
        });
        setWalletBalances(balances);
      }

      // Set current user's wallet balance using the same RPC as the dashboard
      if (employee.email) {
        const { data: balanceData } = await supabase.rpc('get_user_balance_safe', { user_email: employee.email });
        const userData = balanceData?.[0];
        if (userData) {
          setMyWalletBalance(Number(userData.wallet_balance) || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching wallet balances:', err);
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
      const { data: loan } = await supabase.from('loans').select('status, employee_name, employee_phone, employee_email, loan_amount').eq('id', loanId).single();
      if (!loan || loan.status !== 'pending_admin') {
        toast({ title: "Cannot Revoke", description: "This loan has already been processed by admin.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('loans').update({
        guarantor_approved: false,
        guarantor_declined: true,
        status: 'guarantor_declined',
        admin_rejection_reason: `Guarantor ${employee.name} revoked their guarantee`,
      }).eq('id', loanId);
      if (error) throw error;

      // Notify borrower via SMS + email
      await supabase.functions.invoke('send-sms', {
        body: { phone: loan.employee_phone, message: `Dear ${loan.employee_name}, your guarantor ${employee.name} has revoked their guarantee for your loan. Log in to select a new guarantor for the same application. - Great Agro Coffee`, userName: loan.employee_name, messageType: 'loan_guarantor_revoked' }
      });
      await supabase.functions.invoke('send-transactional-email', {
        body: { templateName: 'loan-guarantor-revoked', recipientEmail: loan.employee_email, idempotencyKey: `guarantor-revoked-${loanId}`, templateData: { employeeName: loan.employee_name, guarantorName: employee.name, loanAmount: loan.loan_amount.toLocaleString() } }
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
    const maxRate = LOAN_TYPE_CONFIG[loanType].maxRate;
    const { totalDays, totalWeeks } = getLoanSchedule(months);
    const freq = repaymentFrequency;

    // Bullet payments attract a flat 30% interest; monthly uses capped rate
    const interest = freq === 'bullet'
      ? amount * 0.30
      : getCappedInterest(amount, monthlyRate, months, maxRate);
    const total = Math.ceil(amount + interest);

    // Calculate installment based on frequency
    let installment = 0;
    let numInstallments = 0;
    if (freq === 'bullet') {
      installment = total; // pay everything at once at end
      numInstallments = 1;
    } else if (freq === 'monthly') {
      numInstallments = months;
      installment = months > 0 ? Math.ceil(total / months) : 0;
    } else {
      // weekly
      numInstallments = totalWeeks;
      installment = totalWeeks > 0 ? Math.ceil(total / totalWeeks) : 0;
    }

    return { amount, months, dailyRate, monthlyRate, totalDays, totalWeeks, interest, total, weekly: installment, numInstallments, frequency: freq };
  };

  const handleRequestLoan = async () => {
    if (!employee) return;
    const { amount, months, dailyRate, monthlyRate, totalDays, totalWeeks, interest, total, weekly } = calculateLoanDetails();

    if (amount <= 0 || months <= 0 || !guarantorId) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    // Check if borrower has any defaulted loans
    const defaultedLoans = myLoans.filter(l => l.is_defaulted);
    if (defaultedLoans.length > 0) {
      toast({ title: "Blocked", description: "You have an overdue loan. Clear your outstanding balance before requesting a new loan.", variant: "destructive" });
      return;
    }

    // Block new loans only if user has a pending (not yet active) application
    const pendingLoans = myLoans.filter(l => ['pending_guarantor', 'pending_admin', 'approved', 'disbursed', 'counter_offered'].includes(l.status));
    if (pendingLoans.length > 0) {
      toast({ title: "Blocked", description: "You have a pending loan application. Wait for it to be processed before requesting a new one.", variant: "destructive" });
      return;
    }
    // Also block if there's a guarantor_declined loan (they should change guarantor instead)
    const declinedLoans = myLoans.filter(l => l.status === 'guarantor_declined');
    if (declinedLoans.length > 0) {
      toast({ title: "Change Guarantor Instead", description: "You have a loan where the guarantor declined. Please select a new guarantor for that application instead of creating a new one.", variant: "destructive" });
      return;
    }

    // Check against 2x salary limit minus outstanding debt
    const salary = employee.salary || 0;
    const maxLoan = salary * 2;
    const outstanding = myLoans
      .filter(l => ['active', 'pending_guarantor', 'pending_admin'].includes(l.status))
      .reduce((s: number, l: any) => s + (l.remaining_balance || l.loan_amount || 0), 0);
    const availableLimit = Math.max(0, maxLoan - outstanding);

    if (amount > availableLimit) {
      toast({ title: "Error", description: `Your available loan limit is UGX ${availableLimit.toLocaleString()} (2x salary: UGX ${maxLoan.toLocaleString()} minus outstanding: UGX ${outstanding.toLocaleString()})`, variant: "destructive" });
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

      const freq = repaymentFrequency;
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
        monthly_installment: freq === 'weekly' ? null : Math.ceil(weekly),
        weekly_installment: freq === 'weekly' ? Math.ceil(weekly) : null,
        total_weeks: freq === 'weekly' ? totalWeeks : null,
        remaining_balance: Math.ceil(total),
        repayment_frequency: freq,
        status: 'pending_guarantor',
        guarantor_id: guarantor.id,
        guarantor_email: guarantor.email,
        guarantor_name: guarantor.name,
        guarantor_phone: guarantor.phone || '',
        guarantor_approval_code: approvalCode,
        loan_type: loanType,
      } as any);

      if (error) throw error;

      // Send email to guarantor with approval code
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'loan-guarantor-code',
          recipientEmail: guarantor.email,
          idempotencyKey: `loan-guarantor-${guarantor.email}-${Date.now()}`,
          templateData: {
            guarantorName: guarantor.name,
            borrowerName: employee.name,
            loanAmount: amount.toLocaleString(),
            duration: String(months),
            approvalCode,
          },
        }
      });

      toast({ title: "Loan Requested", description: "Guarantor has been notified via email" });
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
        totalWeeks: repaymentFrequency === 'monthly' ? months : repaymentFrequency === 'bullet' ? 1 : totalWeeks,
        weeklyInstallment: weekly,
        totalRepayable: total,
        totalInterest: interest,
        loanType,
        repaymentFrequency,
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
        : { guarantor_declined: true, guarantor_approved: false, status: 'guarantor_declined', admin_rejection_reason: 'Guarantor declined' };

      const { error } = await supabase.from('loans').update(updateData).eq('id', pendingGuarantorLoan.id);
      if (error) throw error;

      // Notify borrower via SMS + email
      await supabase.functions.invoke('send-sms', {
        body: { phone: pendingGuarantorLoan.employee_phone, message: approve ? `Dear ${pendingGuarantorLoan.employee_name}, your guarantor ${employee?.name} has approved your loan request. It is now pending admin approval.` : `Dear ${pendingGuarantorLoan.employee_name}, your guarantor ${employee?.name} has declined your loan request. Log in to select a new guarantor for the same application.`, userName: pendingGuarantorLoan.employee_name, messageType: 'loan_guarantor_response' }
      });
      await supabase.functions.invoke('send-transactional-email', {
        body: { templateName: 'loan-guarantor-response', recipientEmail: pendingGuarantorLoan.employee_email, idempotencyKey: `guarantor-response-${pendingGuarantorLoan.id}-${approve}`, templateData: { borrowerName: pendingGuarantorLoan.employee_name, guarantorName: employee?.name || '', loanAmount: pendingGuarantorLoan.loan_amount.toLocaleString(), durationMonths: String(pendingGuarantorLoan.duration_months), isApproved: approve } }
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

      // SECURITY: Admin cannot approve a loan they guaranteed
      if (approve && loan.guarantor_email === employee.email) {
        toast({ title: "Conflict of Interest", description: "You cannot approve a loan you guaranteed. Another admin must approve this loan.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

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
          // Align to the 1st of the next calendar month
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
          const isBullet = loan.repayment_frequency === 'bullet';
          const numInstallments = isBullet ? 1 : loan.duration_months;
          for (let i = 1; i <= numInstallments; i++) {
            const dueDate = new Date(startDate);
            if (isBullet) {
              // Bullet: due at end of term (1st of the month after duration_months)
              dueDate.setMonth(dueDate.getMonth() + loan.duration_months);
              dueDate.setDate(1);
            } else {
              // Monthly installments fall on the 1st of each subsequent month
              dueDate.setMonth(dueDate.getMonth() + i);
              dueDate.setDate(1);
            }
            repayments.push({
              loan_id: loanId,
              installment_number: i,
              amount_due: Math.ceil(loan.total_repayable / numInstallments),
              due_date: dueDate.toISOString().split('T')[0],
            });
          }
        }
        await supabase.from('loan_repayments').insert(repayments);

        // For top-up loans: close parent loan and only disburse the additional amount
        const isTopUp = !!(loan as any).is_topup;
        const parentLoanId = (loan as any).parent_loan_id;
        
        if (isTopUp && parentLoanId) {
          // Close the parent loan (mark as topped_up)
          await supabase.from('loans').update({
            status: 'topped_up',
            remaining_balance: 0,
          } as any).eq('id', parentLoanId);
          
          // Delete remaining installments for parent loan
          await supabase.from('loan_repayments').delete()
            .eq('loan_id', parentLoanId)
            .eq('status', 'pending');
        }

        // Add to borrower's wallet via ledger
        // For top-ups: only disburse the additional amount (original_loan_amount), not the rolled-over balance
        const disbursedAmount = isTopUp ? (loan.original_loan_amount || loan.loan_amount) : loan.loan_amount;
        const borrowerEmployee = await supabase.from('employees').select('auth_user_id').eq('email', loan.employee_email).single();
        if (borrowerEmployee.data?.auth_user_id) {
          await supabase.from('ledger_entries').insert({
            user_id: borrowerEmployee.data.auth_user_id,
            entry_type: 'DEPOSIT',
            amount: disbursedAmount,
            reference: 'LOAN-DISBURSE-' + loanId,
            metadata: { 
              loan_id: loanId, 
              duration_months: loan.duration_months, 
              interest_rate: loan.interest_rate, 
              principal: loan.loan_amount, 
              source: isTopUp ? 'loan_topup_disbursement' : 'loan_disbursement',
              repayment_frequency: loan.repayment_frequency || 'monthly',
              ...(isTopUp ? { parent_loan_id: parentLoanId, additional_amount: disbursedAmount, rolled_over_balance: loan.loan_amount - disbursedAmount } : {}),
            },
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

        const smsMsg = isTopUp 
          ? `Dear ${loan.employee_name}, your loan TOP-UP has been approved! Additional UGX ${disbursedAmount.toLocaleString()} disbursed to your wallet. New total loan: UGX ${loan.loan_amount.toLocaleString()}. Repayment: UGX ${installmentAmount.toLocaleString()}/${scheduleLabel} for ${numInstallments} ${scheduleLabel}(s). First deduction: ${repaymentDateStr}. Total repayable: UGX ${loan.total_repayable.toLocaleString()}. - Great Agro Coffee`
          : `Dear ${loan.employee_name}, your loan of UGX ${loan.loan_amount.toLocaleString()} has been approved and disbursed to your wallet. Repayment: UGX ${installmentAmount.toLocaleString()}/${scheduleLabel} for ${numInstallments} ${scheduleLabel}(s). First deduction: ${repaymentDateStr}. Total repayable: UGX ${loan.total_repayable.toLocaleString()}. - Great Agro Coffee`;

        await supabase.functions.invoke('send-sms', {
          body: {
            phone: loan.employee_phone,
            message: smsMsg,
            userName: loan.employee_name,
            messageType: 'loan_approved'
          }
        });

        // Generate loan agreement PDF
        const borrowerEmp = await supabase.from('employees').select('phone, position, department, salary').eq('email', loan.employee_email).single();
        const guarantorEmp = await supabase.from('employees').select('phone, email').eq('name', loan.guarantor_name).single();
        
        const pdfBlob = generateLoanAgreementPdf({
          loanId: loanId,
          loanType: loan.loan_type === 'long_term' ? 'Long-Term Loan' : 'Quick Loan',
          principal: loan.loan_amount,
          interestRate: loan.interest_rate,
          dailyRate: loan.daily_interest_rate || Number((loan.interest_rate / 30).toFixed(2)),
          durationMonths: loan.duration_months,
          totalRepayable: loan.total_repayable,
          remainingBalance: loan.total_repayable,
          installmentAmount,
          installmentFrequency: scheduleLabel,
          numInstallments,
          startDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + loan.duration_months)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          firstDeductionDate: repaymentDateStr,
          approvedBy: employee?.name || 'Administration',
          approvalDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          disbursedAmount,
          isTopUp,
          employeeName: loan.employee_name,
          employeeEmail: loan.employee_email,
          employeeId: '',
          employeePhone: borrowerEmp.data?.phone || loan.employee_phone || '',
          employeePosition: borrowerEmp.data?.position || '',
          employeeDepartment: borrowerEmp.data?.department || '',
          employeeSalary: borrowerEmp.data?.salary || 0,
          guarantorName: loan.guarantor_name || '',
          guarantorEmail: guarantorEmp.data?.email || loan.guarantor_email || '',
          guarantorPhone: guarantorEmp.data?.phone || '',
        });

        // Upload PDF to storage
        const pdfPath = `loan-agreements/LOAN-${loanId.substring(0, 8)}-${Date.now()}.pdf`;
        const pdfFile = new File([pdfBlob], pdfPath.split('/').pop()!, { type: 'application/pdf' });
        const { error: uploadErr } = await supabase.storage.from('loan-documents').upload(pdfPath, pdfFile, { upsert: true });
        let pdfUrl = '';
        if (uploadErr) {
          console.error('PDF upload failed:', uploadErr);
        } else {
          const { data: signedUrl } = await supabase.storage.from('loan-documents').createSignedUrl(pdfPath, 60 * 60 * 24 * 30);
          pdfUrl = signedUrl?.signedUrl || '';
          console.log('PDF signed URL:', pdfUrl);
        }

        const templateData = {
          employeeName: loan.employee_name,
          loanAmount: loan.loan_amount.toLocaleString(),
          interestRate: String(loan.interest_rate),
          dailyRate: String(loan.daily_interest_rate || (loan.interest_rate / 30).toFixed(2)),
          durationMonths: String(loan.duration_months),
          totalRepayable: loan.total_repayable.toLocaleString(),
          installmentAmount: installmentAmount.toLocaleString(),
          installmentFrequency: scheduleLabel,
          numInstallments: String(numInstallments),
          firstDeductionDate: repaymentDateStr,
          guarantorName: loan.guarantor_name || '',
          loanType: loan.loan_type === 'long_term' ? 'Long-Term Loan' : 'Quick Loan',
          approvedBy: employee?.name || 'Administration',
          approvalDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          disbursedAmount: disbursedAmount.toLocaleString(),
          isTopUp,
          pdfDownloadUrl: pdfUrl,
        };

        // Send to borrower
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'loan-approval-details',
            recipientEmail: loan.employee_email,
            idempotencyKey: `loan-approval-${loanId}`,
            templateData,
          }
        });

        // Send guarantor copy
        const gEmail = guarantorEmp.data?.email || loan.guarantor_email;
        if (gEmail) {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'loan-approval-details',
              recipientEmail: gEmail,
              idempotencyKey: `loan-approval-guarantor-${loanId}`,
              templateData: { ...templateData, isGuarantorCopy: true },
            }
          });
        }

        toast({ title: "Loan Approved", description: "Loan disbursed, PDF generated & emailed to borrower and guarantor" });
      } else {
        await supabase.from('loans').update({
          status: 'rejected',
          admin_rejection_reason: rejectionReason || 'Admin declined',
        }).eq('id', loanId);

        await supabase.functions.invoke('send-sms', {
          body: { phone: loan.employee_phone, message: `Dear ${loan.employee_name}, your loan request of UGX ${loan.loan_amount.toLocaleString()} has been declined. Reason: ${rejectionReason || 'Not specified'}.`, userName: loan.employee_name, messageType: 'loan_rejected' }
        });
        await supabase.functions.invoke('send-transactional-email', {
          body: { templateName: 'loan-rejected', recipientEmail: loan.employee_email, idempotencyKey: `loan-rejected-${loanId}`, templateData: { employeeName: loan.employee_name, loanAmount: loan.loan_amount.toLocaleString(), rejectionReason: rejectionReason || 'Not specified', loanType: loan.loan_type === 'long_term' ? 'Long-Term Loan' : 'Quick Loan' } }
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
      // For full early payoff, use daily pro-rata discount; for partial, use simple subtraction
      const isFullPayoff = amount >= earlyPayoff;
      const newBalance = isFullPayoff ? 0 : Math.max(0, (selectedLoanForPayment.remaining_balance || selectedLoanForPayment.total_repayable) - amount);

      // Update loan remaining balance and paid_amount
      const newPaidAmount = (selectedLoanForPayment.paid_amount || 0) + amount;
      const { error } = await supabase.from('loans').update({
        remaining_balance: newBalance,
        paid_amount: newPaidAmount,
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
          paid_date: isPaid ? new Date().toISOString().split('T')[0] : inst.paid_date,
        }).eq('id', inst.id);
        remaining -= payable;
      }

      // Create a ledger entry for the early payment (deduct from wallet if deposit)
      if (earlyPayMethod === 'wallet') {
        const borrowerEmployee = await supabase.from('employees').select('auth_user_id').eq('email', selectedLoanForPayment.employee_email).single();
        if (borrowerEmployee.data?.auth_user_id) {
          await supabase.from('ledger_entries').insert({
            user_id: borrowerEmployee.data.auth_user_id,
            entry_type: 'WITHDRAWAL',
            amount: -amount,
            reference: 'LOANREPAY-ADMIN-' + selectedLoanForPayment.id.slice(0, 8) + '-' + Date.now(),
            metadata: { loan_id: selectedLoanForPayment.id, method: earlyPayMethod, source: 'admin_early_pay', notes: earlyPayNotes },
          });
        }
      }

      // Send loan repayment confirmation email
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'loan-repayment',
            recipientEmail: selectedLoanForPayment.employee_email,
            idempotencyKey: `loan-repay-${selectedLoanForPayment.id}-${Date.now()}`,
            templateData: {
              employeeName: selectedLoanForPayment.employee_name,
              installmentNumber: String((unpaidInstallments || [])[0]?.installment_number || ''),
              amountDue: ((unpaidInstallments || [])[0]?.amount_due || amount).toLocaleString(),
              amountCollected: amount.toLocaleString(),
              sources: `${earlyPayMethod === 'wallet' ? 'Wallet' : earlyPayMethod}: UGX ${amount.toLocaleString()}`,
              remainingBalance: newBalance.toLocaleString(),
              isFullyPaid: newBalance <= 0,
              isVoluntaryPayment: true,
            },
          },
        });
      } catch (emailErr) {
        console.error('Failed to send loan repayment email:', emailErr);
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
        provider: 'yo_payments',
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
    const dailyRate = 0.3 / 100; // Fixed 0.3% daily interest for early payoff
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

      // For full early payoff, use daily pro-rata discount; for partial, use simple subtraction
      const newPaidAmount = (walletRepayLoan.paid_amount || 0) + amount;
      const isFullPayoff = amount >= earlyPayoff;
      const newRemainingBalance = isFullPayoff ? 0 : Math.max(0, (walletRepayLoan.remaining_balance || walletRepayLoan.total_repayable) - amount);
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

      // Send loan repayment confirmation email
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'loan-repayment',
            recipientEmail: walletRepayLoan.employee_email,
            idempotencyKey: `loan-repay-wallet-${walletRepayLoan.id}-${Date.now()}`,
            templateData: {
              employeeName: walletRepayLoan.employee_name,
              installmentNumber: String((unpaidInstallments || [])[0]?.installment_number || ''),
              amountDue: ((unpaidInstallments || [])[0]?.amount_due || amount).toLocaleString(),
              amountCollected: amount.toLocaleString(),
              sources: `Wallet: UGX ${amount.toLocaleString()}`,
              remainingBalance: newRemainingBalance.toLocaleString(),
              isFullyPaid,
              isVoluntaryPayment: true,
            },
          },
        });
      } catch (emailErr) {
        console.error('Failed to send loan repayment email:', emailErr);
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

  // Change guarantor for a loan where guarantor declined
  const handleChangeGuarantor = async () => {
    if (!changeGuarantorLoan || !employee || !newGuarantorId) return;
    const guarantor = employees.find(e => e.id === newGuarantorId);
    if (!guarantor) return;
    if (guarantor.email === employee.email) {
      toast({ title: "Error", description: "You cannot be your own guarantor", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const approvalCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { error } = await supabase.from('loans').update({
        guarantor_id: guarantor.id,
        guarantor_email: guarantor.email,
        guarantor_name: guarantor.name,
        guarantor_phone: guarantor.phone || '',
        guarantor_approval_code: approvalCode,
        guarantor_approved: false,
        guarantor_declined: false,
        status: 'pending_guarantor',
        admin_rejection_reason: null,
      } as any).eq('id', changeGuarantorLoan.id);

      if (error) throw error;

      // SMS to new guarantor
      await supabase.functions.invoke('send-sms', {
        body: {
          phone: guarantor.phone,
          message: `Dear ${guarantor.name}, ${employee.name} has requested you to guarantee a loan of UGX ${changeGuarantorLoan.loan_amount.toLocaleString()} for ${changeGuarantorLoan.duration_months} month(s). Your approval code is: ${approvalCode}. Log into the system to approve or decline.`,
          userName: guarantor.name,
          messageType: 'loan_guarantor_request'
        }
      });

      toast({ title: "New Guarantor Selected", description: `${guarantor.name} has been notified via SMS` });
      setShowChangeGuarantorDialog(false);
      setChangeGuarantorLoan(null);
      setNewGuarantorId('');
      await fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel a pending/declined loan
  const handleCancelLoan = async (loan: any) => {
    if (!employee) return;
    const canCancel = ['pending_guarantor', 'pending_admin', 'guarantor_declined', 'admin_rejected'].includes(loan.status);
    if (!canCancel) {
      toast({ title: "Cannot Cancel", description: "Only unapproved loans can be cancelled.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const { error } = await supabase.from('loans').update({
        status: 'cancelled',
        admin_rejection_reason: `Cancelled by borrower: ${employee.name}`,
      } as any).eq('id', loan.id);
      if (error) throw error;
      toast({ title: "Loan Cancelled ✅", description: "Your loan application has been cancelled. You can apply for a new loan." });
      await fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to cancel loan", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Modify a pending/declined loan
  const handleModifyLoan = async () => {
    if (!modifyLoan || !employee || !modifyAmount || !modifyDuration || !modifyGuarantorId) return;
    const guarantor = employees.find(e => e.id === modifyGuarantorId);
    if (!guarantor) return;
    if (guarantor.email === employee.email) {
      toast({ title: "Error", description: "You cannot be your own guarantor", variant: "destructive" });
      return;
    }

    const amount = parseFloat(modifyAmount);
    const months = parseInt(modifyDuration);
    if (!amount || amount <= 0 || !months || months <= 0) {
      toast({ title: "Error", description: "Enter valid amount and duration", variant: "destructive" });
      return;
    }

    // Check limit
    const salary = employee.salary || 0;
    const maxLoan = salary * 2;
    const otherOutstanding = myLoans
      .filter(l => l.id !== modifyLoan.id && ['active', 'pending_guarantor', 'pending_admin'].includes(l.status))
      .reduce((s: number, l: any) => s + (l.remaining_balance || l.loan_amount || 0), 0);
    const availableLimit = Math.max(0, maxLoan - otherOutstanding);
    if (amount > availableLimit) {
      toast({ title: "Exceeds Limit", description: `Max available: UGX ${availableLimit.toLocaleString()}`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const approvalCode = Math.floor(100000 + Math.random() * 900000).toString();
      const monthlyRate = LOAN_TYPE_CONFIG[modifyType].monthlyRate;
      const maxRate = LOAN_TYPE_CONFIG[modifyType].maxRate;
      const interest = getCappedInterest(amount, monthlyRate, months, maxRate);
      const totalRepayable = amount + interest;
      const { totalWeeks } = getLoanSchedule(months);
      const numInstallments = modifyFrequency === 'weekly' ? totalWeeks : modifyFrequency === 'bullet' ? 1 : months;
      const installment = numInstallments > 0 ? Math.ceil(totalRepayable / numInstallments) : 0;

      const { error } = await supabase.from('loans').update({
        loan_amount: amount,
        duration_months: months,
        loan_type: modifyType,
        repayment_frequency: modifyFrequency,
        interest_rate: monthlyRate,
        daily_interest_rate: monthlyRate / 30,
        total_repayable: totalRepayable,
        monthly_installment: installment,
        total_weeks: totalWeeks,
        remaining_balance: totalRepayable,
        guarantor_id: guarantor.id,
        guarantor_email: guarantor.email,
        guarantor_name: guarantor.name,
        guarantor_phone: guarantor.phone || '',
        guarantor_approval_code: approvalCode,
        guarantor_approved: false,
        guarantor_declined: false,
        status: 'pending_guarantor',
        admin_rejection_reason: null,
      } as any).eq('id', modifyLoan.id);

      if (error) throw error;

      // SMS to new guarantor
      await supabase.functions.invoke('send-sms', {
        body: {
          phone: guarantor.phone,
          message: `Dear ${guarantor.name}, ${employee.name} has requested you to guarantee a modified loan of UGX ${amount.toLocaleString()} for ${months} month(s). Your approval code is: ${approvalCode}. Log into the system to approve or decline.`,
          userName: guarantor.name,
          messageType: 'loan_guarantor_request'
        }
      });

      toast({ title: "Loan Modified ✅", description: `Updated and sent to ${guarantor.name} for guarantee` });
      setShowModifyDialog(false);
      setModifyLoan(null);
      await fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle loan top-up request
  const handleLoanTopUp = async () => {
    if (!topUpLoan || !employee || !topUpGuarantorId) return;
    const additionalAmount = parseFloat(topUpAmount) || 0;
    const months = parseInt(topUpDuration) || topUpLoan.duration_months;
    
    if (additionalAmount <= 0) {
      toast({ title: "Error", description: "Enter a valid top-up amount", variant: "destructive" });
      return;
    }

    const guarantor = employees.find(e => e.id === topUpGuarantorId);
    if (!guarantor) return;
    if (guarantor.email === employee.email) {
      toast({ title: "Error", description: "You cannot be your own guarantor", variant: "destructive" });
      return;
    }

    // Check for pending loans
    const pendingLoans = myLoans.filter(l => ['pending_guarantor', 'pending_admin', 'approved', 'disbursed', 'counter_offered'].includes(l.status));
    if (pendingLoans.length > 0) {
      toast({ title: "Blocked", description: "You have a pending loan application. Wait for it to be processed first.", variant: "destructive" });
      return;
    }

    // New principal = remaining balance of old loan + additional amount
    const newPrincipal = (topUpLoan.remaining_balance || 0) + additionalAmount;
    
    // Check 2x salary limit
    const salary = employee.salary || 0;
    const maxLoan = salary * 2;
    // Exclude the parent loan's outstanding from the calculation since it's being rolled over
    const otherOutstanding = myLoans
      .filter(l => l.id !== topUpLoan.id && ['active', 'pending_guarantor', 'pending_admin'].includes(l.status))
      .reduce((s: number, l: any) => s + (l.remaining_balance || l.loan_amount || 0), 0);
    const availableLimit = Math.max(0, maxLoan - otherOutstanding);
    
    if (newPrincipal > availableLimit) {
      toast({ title: "Error", description: `Top-up total UGX ${newPrincipal.toLocaleString()} exceeds your available limit of UGX ${availableLimit.toLocaleString()}`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const freq = topUpFrequency;
      const lType = topUpType;
      const monthlyRate = LOAN_TYPE_CONFIG[lType].monthlyRate;
      const maxRate = LOAN_TYPE_CONFIG[lType].maxRate;
      const dailyRate = monthlyRate / 30;
      const interest = getCappedInterest(newPrincipal, monthlyRate, months, maxRate);
      const total = newPrincipal + interest;
      const { totalWeeks } = getLoanSchedule(months);
      const numInstallments = freq === 'weekly' ? totalWeeks : freq === 'bullet' ? 1 : months;
      const installment = Math.ceil(total / numInstallments);
      const approvalCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { error } = await supabase.from('loans').insert({
        employee_id: employee.id,
        employee_email: employee.email,
        employee_name: employee.name,
        employee_phone: employee.phone || '',
        loan_amount: newPrincipal,
        interest_rate: monthlyRate,
        daily_interest_rate: dailyRate,
        total_repayable: Math.ceil(total),
        duration_months: months,
        monthly_installment: freq === 'weekly' ? null : Math.ceil(installment),
        weekly_installment: freq === 'weekly' ? Math.ceil(installment) : null,
        total_weeks: freq === 'weekly' ? totalWeeks : null,
        remaining_balance: Math.ceil(total),
        repayment_frequency: freq,
        status: 'pending_guarantor',
        guarantor_id: guarantor.id,
        guarantor_email: guarantor.email,
        guarantor_name: guarantor.name,
        guarantor_phone: guarantor.phone || '',
        guarantor_approval_code: approvalCode,
        loan_type: lType,
        is_topup: true,
        parent_loan_id: topUpLoan.id,
        original_loan_amount: additionalAmount,
      } as any);

      if (error) throw error;

      // SMS to guarantor
      await supabase.functions.invoke('send-sms', {
        body: {
          phone: guarantor.phone,
          message: `Dear ${guarantor.name}, ${employee.name} has requested you to guarantee a LOAN TOP-UP of UGX ${newPrincipal.toLocaleString()} (existing balance UGX ${topUpLoan.remaining_balance?.toLocaleString()} + additional UGX ${additionalAmount.toLocaleString()}) for ${months} month(s). Your approval code is: ${approvalCode}. Log into the system to approve or decline.`,
          userName: guarantor.name,
          messageType: 'loan_guarantor_request'
        }
      });

      toast({ title: "Top-Up Requested", description: "Guarantor has been notified via SMS" });
      setShowTopUpDialog(false);
      setTopUpLoan(null);
      setTopUpAmount('');
      setTopUpGuarantorId('');
      setTopUpDuration('');
      fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Accept or decline a counter offer from admin
  const handleCounterOfferResponse = async (loanId: string, accept: boolean) => {
    if (!employee) return;
    setSubmitting(true);
    try {
      const loan = myLoans.find(l => l.id === loanId);
      if (!loan || loan.status !== 'counter_offered') return;

      if (accept) {
        const newAmount = loan.counter_offer_amount;
        const lType = (loan.loan_type || 'quick') as LoanType;
        const months = loan.duration_months;
        const freq = loan.repayment_frequency;
        const monthlyRate = LOAN_TYPE_CONFIG[lType].monthlyRate;
        const maxRate = LOAN_TYPE_CONFIG[lType].maxRate;

        // Recalculate loan terms with new amount
        const interest = freq === 'bullet'
          ? newAmount * 0.30
          : getCappedInterest(newAmount, monthlyRate, months, maxRate);
        const total = Math.ceil(newAmount + interest);
        const { totalWeeks } = getLoanSchedule(months);

        let installment = 0;
        if (freq === 'bullet') {
          installment = total;
        } else if (freq === 'monthly') {
          installment = months > 0 ? Math.ceil(total / months) : 0;
        } else {
          installment = totalWeeks > 0 ? Math.ceil(total / totalWeeks) : 0;
        }

        const { error } = await supabase.from('loans').update({
          loan_amount: newAmount,
          original_loan_amount: loan.original_loan_amount || loan.loan_amount,
          total_repayable: total,
          remaining_balance: total,
          monthly_installment: freq === 'weekly' ? null : installment,
          weekly_installment: freq === 'weekly' ? installment : null,
          status: 'pending_admin',
        } as any).eq('id', loanId);
        if (error) throw error;

        // Notify admin via SMS
        const { data: admins } = await supabase
          .from('employees')
          .select('name, phone')
          .in('role', ['Administrator', 'Super Admin'])
          .eq('status', 'Active')
          .not('phone', 'is', null);

        for (const admin of (admins || [])) {
          if (admin.phone) {
            await supabase.functions.invoke('send-sms', {
              body: {
                phone: admin.phone,
                message: `Dear ${admin.name}, ${employee.name} has accepted the counter offer of UGX ${newAmount.toLocaleString()} (from UGX ${loan.loan_amount.toLocaleString()}). The loan is now pending your final approval.`,
                userName: admin.name,
                messageType: 'loan_counter_accepted'
              }
            });
          }
        }

        toast({ title: "Counter Offer Accepted", description: `Loan updated to UGX ${newAmount.toLocaleString()} and sent for admin approval` });
      } else {
        const { error } = await supabase.from('loans').update({
          status: 'rejected',
          admin_rejection_reason: 'Borrower declined counter offer',
        }).eq('id', loanId);
        if (error) throw error;

        toast({ title: "Counter Offer Declined", description: "The loan application has been closed" });
      }

      setShowCounterOfferDialog(false);
      setCounterOfferLoan(null);
      fetchLoans();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
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
      else if (e.reference?.includes('LOAN-GUARANTOR')) {
        const meta = e.metadata ? (typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata) : null;
        const borrowerName = meta?.description?.match(/for (.+?)['']s loan/)?.[1] || meta?.borrower || 'borrower';
        description = `Loan Recovery for ${borrowerName}`;
      }
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
        <h1>GREAT AGRO COFFEE</h1>
        <h2>Loan Account Statement</h2>
        <div class="date">Statement Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      <div class="section">
        <div class="section-title">📋 Loan Details</div>
        <div class="grid grid-3">
          <div><div class="label">Borrower</div><div class="value">${loan.employee_name}</div></div>
          <div><div class="label">Employee ID</div><div class="value">${employee?.employee_id || '—'}</div></div>
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
        GREAT AGRO COFFEE — Loan Management System — ${new Date().getFullYear()}
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
      guarantor_declined: { variant: 'destructive', label: 'Guarantor Declined' },
      counter_offered: { variant: 'secondary', label: 'Counter Offer' },
      topped_up: { variant: 'outline', label: 'Topped Up' },
    };
    const s = map[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Calculate loan limit - always 2x salary minus outstanding
  const getLoanLimit = (empEmail: string, empSalary: number, empAuthId?: string) => {
    const empLoans = (loans.length > 0 ? loans : myLoans).filter(l => l.employee_email === empEmail && ['active', 'pending_guarantor', 'pending_admin'].includes(l.status));
    const outstanding = empLoans.reduce((s: number, l: any) => s + (l.remaining_balance || l.loan_amount || 0), 0);
    const activeCount = empLoans.length;
    const walletBal = empAuthId ? (walletBalances[empAuthId] || 0) : 0;

    const maxFromSalary = empSalary * 2;
    const availableLimit = Math.max(0, maxFromSalary - outstanding);
    return { salary: empSalary, maxFromSalary, outstanding, activeCount, walletBal, availableLimit };
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
                    <p className="text-xs text-muted-foreground mt-1">Max: UGX {(myLimit?.availableLimit || (employee?.salary || 0) * 2).toLocaleString()} (2x salary)</p>
                  </div>
                  <div>
                    <Label>Loan Type</Label>
                    <Select value={loanType} onValueChange={(v) => {
                      const lt = v as LoanType;
                      setLoanType(lt);
                      setRepaymentFrequency(LOAN_TYPE_CONFIG[lt].frequencies[0]);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select loan type" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(LOAN_TYPE_CONFIG).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>{cfg.label} – {cfg.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {loanType === 'long_term' && (
                    <div>
                      <Label>Repayment Method</Label>
                      <Select value={repaymentFrequency} onValueChange={(v) => setRepaymentFrequency(v as RepaymentFrequency)}>
                        <SelectTrigger><SelectValue placeholder="Select repayment method" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly – Equal monthly installments</SelectItem>
                          <SelectItem value="bullet">Bullet – Pay everything at end (30% interest)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Duration (Months)</Label>
                    <Select value={durationMonths} onValueChange={setDurationMonths}>
                      <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(m => {
                          const monthlyRate = LOAN_TYPE_CONFIG[loanType].monthlyRate;
                          const maxRate = LOAN_TYPE_CONFIG[loanType].maxRate;
                          const effectiveRate = Math.min(monthlyRate * m, maxRate);
                          return (
                            <SelectItem key={m} value={m.toString()}>
                              {m} month{m > 1 ? 's' : ''} – {monthlyRate}%/mo (total interest: {effectiveRate}%)
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
                        <div className="flex justify-between"><span>Interest Rate:</span><span>{previewRate}%/month (max {LOAN_TYPE_CONFIG[loanType].maxRate}%)</span></div>
                        <div className="flex justify-between"><span>Duration:</span><span>{parseInt(durationMonths)} month(s)</span></div>
                        <div className="flex justify-between"><span>Repayment:</span><span>{repaymentFrequency === 'bullet' ? 'Bullet (lump sum at end)' : repaymentFrequency === 'monthly' ? `${parseInt(durationMonths)} monthly installments` : `${previewTotalWeeks} weekly installments`}</span></div>
                        <div className="flex justify-between"><span>Total Interest:</span><span>UGX {Math.ceil(previewInterest).toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold"><span>Total Repayable:</span><span>UGX {Math.ceil(previewTotal).toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold text-primary">
                          <span>{repaymentFrequency === 'bullet' ? 'Lump Sum Payment:' : repaymentFrequency === 'monthly' ? 'Monthly Installment:' : 'Weekly Installment:'}</span>
                          <span>UGX {Math.ceil(previewWeekly).toLocaleString()}</span>
                        </div>
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

            {/* Change Guarantor Dialog */}
            <Dialog open={showChangeGuarantorDialog} onOpenChange={(open) => { setShowChangeGuarantorDialog(open); if (!open) { setChangeGuarantorLoan(null); setNewGuarantorId(''); } }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Select New Guarantor</DialogTitle>
                </DialogHeader>
                {changeGuarantorLoan && (
                  <div className="space-y-4">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4 space-y-1 text-sm">
                        <div className="flex justify-between"><span>Loan Amount:</span><span className="font-semibold">UGX {changeGuarantorLoan.loan_amount?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Duration:</span><span>{changeGuarantorLoan.duration_months} month(s)</span></div>
                        <div className="flex justify-between text-destructive"><span>Previous Guarantor:</span><span>{changeGuarantorLoan.guarantor_name} (declined)</span></div>
                      </CardContent>
                    </Card>
                    <div>
                      <Label>Select New Guarantor</Label>
                      <Select value={newGuarantorId} onValueChange={setNewGuarantorId}>
                        <SelectTrigger><SelectValue placeholder="Choose a colleague" /></SelectTrigger>
                        <SelectContent>
                          {employees.filter(e => e.email !== employee?.email && e.email !== changeGuarantorLoan.guarantor_email).map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name} ({e.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">The previous guarantor who declined is excluded</p>
                    </div>
                    <Button onClick={handleChangeGuarantor} disabled={submitting || !newGuarantorId} className="w-full">
                      {submitting ? 'Sending...' : 'Send Guarantor Request'}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Loan Modification Dialog */}
            <Dialog open={showModifyDialog} onOpenChange={(open) => { setShowModifyDialog(open); if (!open) { setModifyLoan(null); } }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" /> Modify Loan Application</DialogTitle>
                </DialogHeader>
                {modifyLoan && (() => {
                  const amount = parseFloat(modifyAmount) || 0;
                  const months = parseInt(modifyDuration) || 1;
                  const monthlyRate = LOAN_TYPE_CONFIG[modifyType].monthlyRate;
                  const maxRate = LOAN_TYPE_CONFIG[modifyType].maxRate;
                  const interest = getCappedInterest(amount, monthlyRate, months, maxRate);
                  const totalRepayable = amount + interest;
                  const { totalWeeks } = getLoanSchedule(months);
                  const numInstallments = modifyFrequency === 'weekly' ? totalWeeks : modifyFrequency === 'bullet' ? 1 : months;
                  const installment = numInstallments > 0 ? Math.ceil(totalRepayable / numInstallments) : 0;

                  return (
                    <div className="space-y-4">
                      <Card className="bg-muted/50">
                        <CardContent className="p-3 text-xs space-y-1">
                          <div className="flex justify-between"><span>Original Amount:</span><span>UGX {modifyLoan.loan_amount?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Previous Guarantor:</span><span>{modifyLoan.guarantor_name}</span></div>
                          <div className="flex justify-between"><span>Current Status:</span><span className="capitalize">{modifyLoan.status?.replace(/_/g, ' ')}</span></div>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Loan Type</Label>
                          <Select value={modifyType} onValueChange={(v) => { setModifyType(v as LoanType); setModifyFrequency(LOAN_TYPE_CONFIG[v as LoanType].frequencies[0]); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(LOAN_TYPE_CONFIG).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Repayment Frequency</Label>
                          <Select value={modifyFrequency} onValueChange={(v) => setModifyFrequency(v as RepaymentFrequency)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {LOAN_TYPE_CONFIG[modifyType].frequencies.map(f => (
                                <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Loan Amount (UGX)</Label>
                          <Input type="number" value={modifyAmount} onChange={(e) => setModifyAmount(e.target.value)} placeholder="Enter amount" />
                        </div>
                        <div>
                          <Label>Duration (months)</Label>
                          <Input type="number" value={modifyDuration} onChange={(e) => setModifyDuration(e.target.value)} min="1" max="12" />
                        </div>
                      </div>

                      <div>
                        <Label>Select Guarantor</Label>
                        <Select value={modifyGuarantorId} onValueChange={setModifyGuarantorId}>
                          <SelectTrigger><SelectValue placeholder="Choose a colleague" /></SelectTrigger>
                          <SelectContent>
                            {employees.filter(e => e.email !== employee?.email).map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.name} ({e.position})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Purpose (optional)</Label>
                        <Textarea value={modifyPurpose} onChange={(e) => setModifyPurpose(e.target.value)} placeholder="Reason for the loan..." rows={2} />
                      </div>

                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-3 text-sm space-y-1">
                          <div className="flex justify-between"><span>Principal:</span><span className="font-semibold">UGX {amount.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Interest ({monthlyRate}% × {months}mo, max {maxRate}%):</span><span>UGX {interest.toLocaleString()}</span></div>
                          <div className="flex justify-between font-bold"><span>Total Repayable:</span><span>UGX {totalRepayable.toLocaleString()}</span></div>
                          <div className="flex justify-between text-muted-foreground"><span>Installment:</span><span>UGX {installment.toLocaleString()}/{modifyFrequency === 'weekly' ? 'wk' : modifyFrequency === 'bullet' ? 'end' : 'mo'}</span></div>
                        </CardContent>
                      </Card>

                      <Button onClick={handleModifyLoan} disabled={submitting || !modifyGuarantorId || !modifyAmount || !modifyDuration} className="w-full">
                        {submitting ? 'Updating...' : 'Submit Modified Loan'}
                      </Button>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>

            {/* Loan Top-Up Dialog */}
            <Dialog open={showTopUpDialog} onOpenChange={(open) => { setShowTopUpDialog(open); if (!open) { setTopUpLoan(null); setTopUpAmount(''); setTopUpGuarantorId(''); } }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><ArrowUpCircle className="h-5 w-5" /> Loan Top-Up</DialogTitle>
                </DialogHeader>
                {topUpLoan && (() => {
                  const additionalAmt = parseFloat(topUpAmount) || 0;
                  const newPrincipal = (topUpLoan.remaining_balance || 0) + additionalAmt;
                  const months = parseInt(topUpDuration) || topUpLoan.duration_months;
                  const monthlyRate = LOAN_TYPE_CONFIG[topUpType].monthlyRate;
                  const maxRate = LOAN_TYPE_CONFIG[topUpType].maxRate;
                  const interest = getCappedInterest(newPrincipal, monthlyRate, months, maxRate);
                  const newTotal = newPrincipal + interest;
                  const { totalWeeks } = getLoanSchedule(months);
                  const numInstallments = topUpFrequency === 'weekly' ? totalWeeks : topUpFrequency === 'bullet' ? 1 : months;
                  const installment = numInstallments > 0 ? Math.ceil(newTotal / numInstallments) : 0;

                  // Calculate available limit excluding the parent loan
                  const salary = employee?.salary || 0;
                  const maxLoan = salary * 2;
                  const otherOutstanding = myLoans
                    .filter(l => l.id !== topUpLoan.id && ['active', 'pending_guarantor', 'pending_admin'].includes(l.status))
                    .reduce((s: number, l: any) => s + (l.remaining_balance || l.loan_amount || 0), 0);
                  const availableLimit = Math.max(0, maxLoan - otherOutstanding);

                  return (
                    <div className="space-y-4">
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Current Loan Balance:</span><span className="font-semibold text-destructive">UGX {(topUpLoan.remaining_balance || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Original Amount:</span><span>UGX {topUpLoan.loan_amount?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Current Guarantor:</span><span>{topUpLoan.guarantor_name}</span></div>
                        </CardContent>
                      </Card>

                      <div>
                        <Label>Additional Amount (UGX)</Label>
                        <Input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="e.g. 200000" />
                        <p className="text-xs text-muted-foreground mt-1">Max additional: UGX {Math.max(0, availableLimit - (topUpLoan.remaining_balance || 0)).toLocaleString()}</p>
                      </div>

                      <div>
                        <Label>Loan Type</Label>
                        <Select value={topUpType} onValueChange={(v) => {
                          const lt = v as LoanType;
                          setTopUpType(lt);
                          setTopUpFrequency(LOAN_TYPE_CONFIG[lt].frequencies[0]);
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(LOAN_TYPE_CONFIG).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>{cfg.label} – {cfg.description}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Duration (months)</Label>
                        <Input type="number" value={topUpDuration} onChange={e => setTopUpDuration(e.target.value)} placeholder="e.g. 2" min="1" max="12" />
                      </div>

                      {topUpType === 'long_term' && (
                        <div>
                          <Label>Repayment Method</Label>
                          <Select value={topUpFrequency} onValueChange={(v) => setTopUpFrequency(v as RepaymentFrequency)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="bullet">Bullet (lump sum at end)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label>Select Guarantor</Label>
                        <Select value={topUpGuarantorId} onValueChange={setTopUpGuarantorId}>
                          <SelectTrigger><SelectValue placeholder="Choose a guarantor" /></SelectTrigger>
                          <SelectContent>
                            {employees.filter(e => e.email !== employee?.email).map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.name} ({e.department})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {additionalAmt > 0 && (
                        <Card className="border-primary/30 bg-primary/5">
                          <CardContent className="p-4 space-y-1 text-sm">
                            <div className="text-xs font-semibold text-primary mb-2">Top-Up Summary</div>
                            <div className="flex justify-between"><span>Existing Balance:</span><span>UGX {(topUpLoan.remaining_balance || 0).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Additional Amount:</span><span>+ UGX {additionalAmt.toLocaleString()}</span></div>
                            <div className="flex justify-between font-semibold border-t pt-1"><span>New Principal:</span><span>UGX {newPrincipal.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Interest ({monthlyRate}%/mo × {months}mo):</span><span>UGX {Math.ceil(interest).toLocaleString()}</span></div>
                            <div className="flex justify-between font-bold text-primary border-t pt-1"><span>New Total Repayable:</span><span>UGX {Math.ceil(newTotal).toLocaleString()}</span></div>
                            <div className="flex justify-between text-muted-foreground"><span>{topUpFrequency === 'weekly' ? 'Weekly' : topUpFrequency === 'bullet' ? 'Bullet' : 'Monthly'} Installment:</span><span>UGX {installment.toLocaleString()}</span></div>
                          </CardContent>
                        </Card>
                      )}

                      <Button onClick={handleLoanTopUp} disabled={submitting || !topUpAmount || !topUpGuarantorId || !topUpDuration} className="w-full">
                        {submitting ? 'Submitting...' : 'Submit Top-Up Request'}
                      </Button>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>

            {/* Counter Offer Dialog */}
            <Dialog open={showCounterOfferDialog} onOpenChange={(open) => { setShowCounterOfferDialog(open); if (!open) setCounterOfferLoan(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Management Counter Offer</DialogTitle>
                </DialogHeader>
                {counterOfferLoan && (
                  <div className="space-y-4">
                    <Card className="bg-muted/50 border-primary/30">
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Your Request:</span><span className="line-through text-muted-foreground">UGX {(counterOfferLoan.original_loan_amount || counterOfferLoan.loan_amount)?.toLocaleString()}</span></div>
                        <div className="flex justify-between text-lg font-bold"><span>Offered Amount:</span><span className="text-primary">UGX {counterOfferLoan.counter_offer_amount?.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Duration:</span><span>{counterOfferLoan.duration_months} month(s)</span></div>
                        {counterOfferLoan.counter_offer_comments && (
                          <div className="mt-2 p-3 bg-accent rounded-lg">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Management Comments:</p>
                            <p className="text-sm">{counterOfferLoan.counter_offer_comments}</p>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          Offered by {counterOfferLoan.counter_offer_by} on {counterOfferLoan.counter_offer_at ? new Date(counterOfferLoan.counter_offer_at).toLocaleDateString() : ''}
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex gap-3">
                      <Button className="flex-1" onClick={() => handleCounterOfferResponse(counterOfferLoan.id, true)} disabled={submitting}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Accept Offer
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => handleCounterOfferResponse(counterOfferLoan.id, false)} disabled={submitting}>
                        <XCircle className="mr-2 h-4 w-4" /> Decline
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Accepting will update your loan to the offered amount and send it for final approval.</p>
                  </div>
                )}
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

          {/* Counter Offer Banner */}
          {myLoans.filter(l => l.status === 'counter_offered').map(loan => (
            <Card key={loan.id} className="border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <HandCoins className="h-6 w-6 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Counter Offer from Management</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You requested UGX {(loan.original_loan_amount || loan.loan_amount)?.toLocaleString()}, management offers <span className="font-bold text-primary">UGX {loan.counter_offer_amount?.toLocaleString()}</span>.
                      {loan.counter_offer_comments && <span className="block mt-1 italic">"{loan.counter_offer_comments}"</span>}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => { setCounterOfferLoan(loan); setShowCounterOfferDialog(true); }}>
                        <Eye className="mr-1 h-4 w-4" /> Review & Respond
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Guarantor Declined Banner */}
          {myLoans.filter(l => l.status === 'guarantor_declined').map(loan => (
            <Card key={loan.id} className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Guarantor Declined</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {loan.guarantor_name} declined to guarantee your loan of UGX {loan.loan_amount?.toLocaleString()}. Please select a new guarantor.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => { setChangeGuarantorLoan(loan); setNewGuarantorId(''); setShowChangeGuarantorDialog(true); }}>
                        <Users className="mr-1 h-4 w-4" /> Select New Guarantor
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => {
                        setModifyLoan(loan);
                        setModifyAmount(String(loan.loan_amount || ''));
                        setModifyDuration(String(loan.duration_months || ''));
                        setModifyType((loan.loan_type || 'quick') as LoanType);
                        setModifyFrequency((loan.repayment_frequency || 'weekly') as RepaymentFrequency);
                        setModifyPurpose('');
                        setModifyGuarantorId('');
                        setShowModifyDialog(true);
                      }}>
                        <Edit className="mr-1 h-4 w-4" /> Modify Loan
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {myLimit && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" /> My Loan Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Salary</p>
                    <p className="text-lg font-bold">UGX {myLimit.salary.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Wallet Balance</p>
                    <p className="text-lg font-bold text-primary">UGX {Math.max(0, myLimit.walletBal).toLocaleString()}</p>
                  </div>
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
                  Active loans: {myLimit.activeCount}/3 • Limit: 2x salary minus outstanding
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
              {isAdmin() && <TabsTrigger value="loan-tracker">Loan Tracker</TabsTrigger>}
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
                            {loan.is_topup && <Badge variant="outline" className="ml-1 text-[10px] border-primary text-primary">Top-Up</Badge>}
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
                                  <Button size="sm" variant="outline" className="border-primary text-primary" onClick={() => {
                                    setTopUpLoan(loan);
                                    setTopUpAmount('');
                                    setTopUpGuarantorId('');
                                    setTopUpDuration(String(loan.duration_months));
                                    setTopUpType((loan.loan_type || 'quick') as LoanType);
                                    setTopUpFrequency((loan.repayment_frequency || 'weekly') as RepaymentFrequency);
                                    setShowTopUpDialog(true);
                                  }}>
                                    <ArrowUpCircle className="mr-1 h-3 w-3" /> Top Up
                                  </Button>
                                </>
                              )}
                              {loan.status === 'guarantor_declined' && (
                                <>
                                  <Button size="sm" variant="outline" className="border-primary text-primary" onClick={() => {
                                    setChangeGuarantorLoan(loan);
                                    setNewGuarantorId('');
                                    setShowChangeGuarantorDialog(true);
                                  }}>
                                    <Users className="mr-1 h-3 w-3" /> Change Guarantor
                                  </Button>
                                  <Button size="sm" variant="secondary" onClick={() => {
                                    setModifyLoan(loan);
                                    setModifyAmount(String(loan.loan_amount || ''));
                                    setModifyDuration(String(loan.duration_months || ''));
                                    setModifyType((loan.loan_type || 'quick') as LoanType);
                                    setModifyFrequency((loan.repayment_frequency || 'weekly') as RepaymentFrequency);
                                    setModifyPurpose('');
                                    setModifyGuarantorId('');
                                    setShowModifyDialog(true);
                                  }}>
                                    <Edit className="mr-1 h-3 w-3" /> Modify Loan
                                  </Button>
                                </>
                              )}
                              {['pending_guarantor', 'pending_admin'].includes(loan.status) && (
                                <>
                                  <Button size="sm" variant="secondary" onClick={() => {
                                    setModifyLoan(loan);
                                    setModifyAmount(String(loan.loan_amount || ''));
                                    setModifyDuration(String(loan.duration_months || ''));
                                    setModifyType((loan.loan_type || 'quick') as LoanType);
                                    setModifyFrequency((loan.repayment_frequency || 'weekly') as RepaymentFrequency);
                                    setModifyPurpose('');
                                    setModifyGuarantorId('');
                                    setShowModifyDialog(true);
                                  }}>
                                    <Edit className="mr-1 h-3 w-3" /> Modify Loan
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleCancelLoan(loan)} disabled={submitting}>
                                    <XCircle className="mr-1 h-3 w-3" /> Cancel Loan
                                  </Button>
                                </>
                              )}
                              {loan.status === 'guarantor_declined' && (
                                <Button size="sm" variant="destructive" onClick={() => handleCancelLoan(loan)} disabled={submitting}>
                                  <XCircle className="mr-1 h-3 w-3" /> Cancel Loan
                                </Button>
                              )}
                              {loan.status === 'counter_offered' && (
                                <Button size="sm" variant="secondary" className="border-primary" onClick={() => {
                                  setCounterOfferLoan(loan);
                                  setShowCounterOfferDialog(true);
                                }}>
                                  <Eye className="mr-1 h-3 w-3" /> View Offer
                                </Button>
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
                            <TableCell>
                              UGX {loan.loan_amount?.toLocaleString()}
                              {loan.is_topup && <Badge variant="outline" className="ml-1 text-[10px] border-primary text-primary">Top-Up</Badge>}
                            </TableCell>
                            <TableCell>{loan.duration_months}mo {loan.repayment_frequency === 'weekly' ? `(${loan.total_weeks || '?'}wks, ${(loan.daily_interest_rate || 0).toFixed(2)}%/day)` : `(${loan.interest_rate}%)`}</TableCell>
                            <TableCell>UGX {loan.total_repayable?.toLocaleString()}</TableCell>
                            <TableCell className="text-xs font-medium text-green-600">UGX {limit.availableLimit.toLocaleString()}</TableCell>
                            <TableCell>
                              <div>{loan.guarantor_name}</div>
                              <div className="text-xs">{loan.guarantor_approved ? <Badge variant="default" className="text-xs">Approved</Badge> : loan.guarantor_declined ? <Badge variant="destructive" className="text-xs">Declined</Badge> : <Badge variant="outline" className="text-xs">Pending</Badge>}</div>
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
              <TabsContent value="loan-tracker">
                <AdminLoanTracker />
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
        onCounterOffer={async (loanId, amount, comments) => {
          if (!employee) return;
          setSubmitting(true);
          try {
            const loan = loans.find(l => l.id === loanId);
            if (!loan) return;

            const { error } = await supabase.from('loans').update({
              status: 'counter_offered',
              counter_offer_amount: amount,
              counter_offer_by: employee.name,
              counter_offer_at: new Date().toISOString(),
              counter_offer_comments: comments,
              original_loan_amount: loan.original_loan_amount || loan.loan_amount,
            } as any).eq('id', loanId);
            if (error) throw error;

            // SMS to borrower
            await supabase.functions.invoke('send-sms', {
              body: {
                phone: loan.employee_phone,
                message: `Dear ${loan.employee_name}, management has reviewed your loan request of UGX ${loan.loan_amount.toLocaleString()} and can offer UGX ${amount.toLocaleString()}. ${comments ? 'Reason: ' + comments + '. ' : ''}Log in to accept or decline. - Great Agro Coffee`,
                userName: loan.employee_name,
                messageType: 'loan_counter_offer'
              }
            });

            toast({ title: "Counter Offer Sent", description: `${loan.employee_name} has been notified via SMS` });
            setReviewLoan(null);
            fetchLoans();
          } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          } finally {
            setSubmitting(false);
          }
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
        <h2 style="margin:0 0 4px;color:#1a365d">GREAT AGRO COFFEE</h2>
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
