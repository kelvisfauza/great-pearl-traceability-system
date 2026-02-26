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
import { Banknote, Clock, Shield, Users, AlertTriangle, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Textarea } from '@/components/ui/textarea';

const INTEREST_RATES: Record<number, number> = {
  1: 5,
  2: 8,
  3: 10,
  4: 12,
  5: 13,
  6: 15,
};

const QuickLoans = () => {
  const { employee, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<any[]>([]);
  const [myLoans, setMyLoans] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
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

  // Form state
  const [loanAmount, setLoanAmount] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [guarantorId, setGuarantorId] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');

  useEffect(() => {
    fetchLoans();
    fetchEmployees();
    checkGuarantorRequests();
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
    const { data } = await supabase.from('employees').select('id, name, email, phone, salary').eq('status', 'Active');
    setEmployees(data || []);
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
    const rate = INTEREST_RATES[months] || 0;
    const interest = amount * (rate / 100);
    const total = amount + interest;
    const monthly = months > 0 ? total / months : 0;
    return { amount, months, rate, interest, total, monthly };
  };

  const handleRequestLoan = async () => {
    if (!employee) return;
    const { amount, months, rate, total, monthly } = calculateLoanDetails();

    if (amount <= 0 || months <= 0 || !guarantorId) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    // Check max 3x salary
    if (amount > (employee.salary || 0) * 3) {
      toast({ title: "Error", description: `Max loan is UGX ${((employee.salary || 0) * 3).toLocaleString()} (3x your salary)`, variant: "destructive" });
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
        interest_rate: rate,
        total_repayable: total,
        duration_months: months,
        monthly_installment: Math.ceil(monthly),
        remaining_balance: total,
        status: 'pending_guarantor',
        guarantor_id: guarantor.id,
        guarantor_email: guarantor.email,
        guarantor_name: guarantor.name,
        guarantor_phone: guarantor.phone || '',
        guarantor_approval_code: approvalCode,
      });

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
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + loan.duration_months);
        const nextDeduction = new Date();
        nextDeduction.setMonth(nextDeduction.getMonth() + 1);
        nextDeduction.setDate(1);

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

        // Create repayment schedule
        const repayments = [];
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
        await supabase.from('loan_repayments').insert(repayments);

        // Add to borrower's wallet via ledger
        const borrowerEmployee = await supabase.from('employees').select('auth_user_id').eq('email', loan.employee_email).single();
        if (borrowerEmployee.data?.auth_user_id) {
          await supabase.from('ledger_entries').insert({
            user_id: borrowerEmployee.data.auth_user_id,
            entry_type: 'LOAN_DISBURSEMENT',
            amount: loan.loan_amount,
            reference: 'LOAN-' + loanId,
            metadata: { loan_id: loanId, duration_months: loan.duration_months, interest_rate: loan.interest_rate },
          });
        }

        // SMS to borrower
        await supabase.functions.invoke('send-sms', {
          body: {
            phone: loan.employee_phone,
            message: `Dear ${loan.employee_name}, your loan of UGX ${loan.loan_amount.toLocaleString()} has been approved and disbursed to your wallet. Monthly installment: UGX ${Math.ceil(loan.total_repayable / loan.duration_months).toLocaleString()} for ${loan.duration_months} month(s).`,
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
    if (amount > (selectedLoanForPayment.remaining_balance || 0)) {
      toast({ title: "Error", description: `Amount exceeds remaining balance of UGX ${selectedLoanForPayment.remaining_balance?.toLocaleString()}`, variant: "destructive" });
      return;
    }
    if (!earlyPayMethod) {
      toast({ title: "Error", description: "Select a payment method", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const newBalance = (selectedLoanForPayment.remaining_balance || 0) - amount;

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

  const { rate: previewRate, interest: previewInterest, total: previewTotal, monthly: previewMonthly } = calculateLoanDetails();

  return (
    <DashboardLayout title="Quick Loans" subtitle="Borrow and manage short-term loans">
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Quick Loans</h1>
              <p className="text-muted-foreground">Borrow and manage short-term loans</p>
            </div>
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
                    <p className="text-xs text-muted-foreground mt-1">Max: UGX {((employee?.salary || 0) * 3).toLocaleString()} (3x salary)</p>
                  </div>
                  <div>
                    <Label>Duration (Months)</Label>
                    <Select value={durationMonths} onValueChange={setDurationMonths}>
                      <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(m => (
                          <SelectItem key={m} value={m.toString()}>{m} month{m > 1 ? 's' : ''} - {INTEREST_RATES[m]}% interest</SelectItem>
                        ))}
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
                        <div className="flex justify-between"><span>Interest ({previewRate}%):</span><span>UGX {Math.ceil(previewInterest).toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold"><span>Total Repayable:</span><span>UGX {Math.ceil(previewTotal).toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold text-primary"><span>Monthly Installment:</span><span>UGX {Math.ceil(previewMonthly).toLocaleString()}</span></div>
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
                        <div className="flex justify-between"><span>Total Repayable:</span><span>UGX {selectedLoanForPayment.total_repayable?.toLocaleString()}</span></div>
                        <div className="flex justify-between font-semibold text-primary"><span>Remaining Balance:</span><span>UGX {selectedLoanForPayment.remaining_balance?.toLocaleString()}</span></div>
                      </CardContent>
                    </Card>
                    <div>
                      <Label>Payment Amount (UGX)</Label>
                      <Input type="number" value={earlyPayAmount} onChange={e => setEarlyPayAmount(e.target.value)} placeholder="Enter amount to pay" />
                      <p className="text-xs text-muted-foreground mt-1">Max: UGX {selectedLoanForPayment.remaining_balance?.toLocaleString()}</p>
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
                        {pendingGuarantorLoan.duration_months} month(s). If they fail to repay, the amount will be deducted from your salary.
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
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{myLoans.filter(l => ['pending_guarantor', 'pending_admin'].includes(l.status)).length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Borrowed</p>
                  <p className="text-2xl font-bold">UGX {myLoans.filter(l => ['active', 'completed'].includes(l.status)).reduce((s, l) => s + (l.loan_amount || 0), 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-2xl font-bold">UGX {myLoans.filter(l => l.status === 'active').reduce((s, l) => s + (l.remaining_balance || 0), 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="my-loans">
            <TabsList>
              <TabsTrigger value="my-loans">My Loans</TabsTrigger>
              {isAdmin() && <TabsTrigger value="all-loans">All Loans (Admin)</TabsTrigger>}
              <TabsTrigger value="repayments">Repayment Schedule</TabsTrigger>
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
                        <TableHead>Monthly</TableHead>
                        <TableHead>Guarantor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myLoans.map(loan => (
                        <TableRow key={loan.id}>
                          <TableCell className="text-sm">{new Date(loan.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>UGX {loan.loan_amount?.toLocaleString()}</TableCell>
                          <TableCell>{loan.duration_months}mo</TableCell>
                          <TableCell>{loan.interest_rate}%</TableCell>
                          <TableCell>UGX {loan.monthly_installment?.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{loan.guarantor_name}</TableCell>
                          <TableCell>{getStatusBadge(loan.status)}</TableCell>
                          <TableCell>UGX {loan.remaining_balance?.toLocaleString()}</TableCell>
                          <TableCell>
                            {loan.status === 'active' && (loan.remaining_balance || 0) > 0 && (
                              <Button size="sm" variant="outline" onClick={() => {
                                setSelectedLoanForPayment(loan);
                                setShowEarlyPayDialog(true);
                              }}>
                                <CreditCard className="mr-1 h-3 w-3" /> Pay Early
                              </Button>
                            )}
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
                          <TableHead>Amount</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Total Repayable</TableHead>
                          <TableHead>Guarantor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map(loan => (
                          <TableRow key={loan.id}>
                            <TableCell>
                              <div>{loan.employee_name}</div>
                              <div className="text-xs text-muted-foreground">{loan.employee_email}</div>
                            </TableCell>
                            <TableCell>UGX {loan.loan_amount?.toLocaleString()}</TableCell>
                            <TableCell>{loan.duration_months}mo ({loan.interest_rate}%)</TableCell>
                            <TableCell>UGX {loan.total_repayable?.toLocaleString()}</TableCell>
                            <TableCell>
                              <div>{loan.guarantor_name}</div>
                              <div className="text-xs">{loan.guarantor_approved ? <Badge variant="default" className="text-xs">Approved</Badge> : <Badge variant="outline" className="text-xs">Pending</Badge>}</div>
                            </TableCell>
                            <TableCell>{getStatusBadge(loan.status)}</TableCell>
                            <TableCell>
                              {loan.status === 'pending_admin' && (
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleAdminApproval(loan.id, true)} disabled={submitting}>
                                    <CheckCircle className="mr-1 h-3 w-3" /> Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleAdminApproval(loan.id, false, 'Admin declined')} disabled={submitting}>
                                    <XCircle className="mr-1 h-3 w-3" /> Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {loans.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No loan requests</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="repayments">
              <RepaymentSchedule myLoans={myLoans} />
            </TabsContent>
          </Tabs>
      </div>
    </DashboardLayout>
  );
};

const RepaymentSchedule = ({ myLoans }: { myLoans: any[] }) => {
  const [repayments, setRepayments] = useState<any[]>([]);

  useEffect(() => {
    const activeLoans = myLoans.filter(l => l.status === 'active');
    if (activeLoans.length === 0) return;

    const fetchRepayments = async () => {
      const loanIds = activeLoans.map(l => l.id);
      const { data } = await supabase.from('loan_repayments').select('*').in('loan_id', loanIds).order('due_date', { ascending: true });
      setRepayments(data || []);
    };
    fetchRepayments();
  }, [myLoans]);

  return (
    <Card>
      <CardHeader><CardTitle>Repayment Schedule</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repayments.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.installment_number}</TableCell>
                <TableCell>{new Date(r.due_date).toLocaleDateString()}</TableCell>
                <TableCell>UGX {r.amount_due?.toLocaleString()}</TableCell>
                <TableCell>UGX {(r.amount_paid || 0).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'paid' ? 'default' : r.status === 'overdue' ? 'destructive' : 'outline'}>
                    {r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {repayments.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No active repayment schedules</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default QuickLoans;
