import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, CheckCircle, Loader2, Send, AlertTriangle, Info, Building, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface BankDetails {
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_phone: string | null;
  bank_email: string | null;
  alternative_bank: string | null;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  salary: number;
  department: string;
  position: string;
}

interface SalaryPayment {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_phone: string | null;
  gross_salary: number;
  salary_amount: number;
  advance_deduction: number;
  advance_id: string | null;
  time_deduction: number;
  time_deduction_hours: number;
  net_salary: number;
  payment_month: string;
  payment_method: string;
  payment_label: string | null;
  transaction_id: string | null;
  status: string;
  processed_by: string;
  processed_by_email: string;
  completed_at: string | null;
  completed_by: string | null;
  sms_sent: boolean;
  notes: string | null;
  created_at: string;
}

interface AdvanceInfo {
  id: string;
  remaining_balance: number;
  minimum_payment: number;
  original_amount: number;
}

interface TimeDeductionInfo {
  hours_missed: number;
  total_deduction: number;
  reason: string | null;
}

const ProcessPayrollDialog = () => {
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [advanceInfo, setAdvanceInfo] = useState<AdvanceInfo | null>(null);
  const [timeDeductionInfo, setTimeDeductionInfo] = useState<TimeDeductionInfo | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'half' | 'balance'>('full');
  const [alreadyPaidCurrentMonth, setAlreadyPaidCurrentMonth] = useState(false);
  const [halfPayAlreadyPaid, setHalfPayAlreadyPaid] = useState(false);
  const [halfPayInfo, setHalfPayInfo] = useState<{ netPaid: number; grossPaid: number; deductionsApplied: number } | null>(null);
  const [currentMonthPaymentInfo, setCurrentMonthPaymentInfo] = useState<{ count: number; totalPaid: number } | null>(null);
  const [form, setForm] = useState({
    salaryAmount: '',
    advanceDeduction: '',
    month: format(new Date(), 'MMMM yyyy'),
    paymentMethod: 'Bank Transfer',
    notes: '',
  });
  const [employeeBankDetails, setEmployeeBankDetails] = useState<BankDetails | null>(null);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchPayments();
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, email, phone, salary, department, position')
      .eq('status', 'Active')
      .order('name');
    setEmployees(data || []);
  };

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('employee_salary_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setPayments((data as SalaryPayment[]) || []);
    setLoading(false);
  };

  const getNextMonth = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return format(next, 'MMMM yyyy');
  };

  const handleEmployeeSelect = async (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    setSelectedEmployee(emp || null);
    setAdvanceInfo(null);
    setTimeDeductionInfo(null);
    setEmployeeBankDetails(null);
    setAlreadyPaidCurrentMonth(false);
    setCurrentMonthPaymentInfo(null);
    setHalfPayAlreadyPaid(false);
    setHalfPayInfo(null);
    setPaymentType('full');

    if (!emp) return;

    // Check if employee already has a completed/processing payment for current month
    const currentMonth = format(new Date(), 'MMMM yyyy');
    const { data: existingPayments } = await supabase
      .from('employee_salary_payments')
      .select('id, net_salary, gross_salary, status, payment_month, payment_label, advance_deduction, time_deduction, notes')
      .eq('employee_id', emp.id)
      .eq('payment_month', currentMonth)
      .in('status', ['completed', 'processing']);

    const paidThisMonth = existingPayments && existingPayments.length > 0;
    setAlreadyPaidCurrentMonth(!!paidThisMonth);

    // Check if half salary was already paid this month
    const halfPayRecord = existingPayments?.find(p => 
      p.payment_label === 'HALF SALARY' || (p.notes && typeof p.notes === 'string' && p.notes.includes('[HALF SALARY]'))
    );
    
    if (halfPayRecord) {
      setHalfPayAlreadyPaid(true);
      const deductionsApplied = Number(halfPayRecord.advance_deduction || 0) + Number(halfPayRecord.time_deduction || 0);
      setHalfPayInfo({
        netPaid: Number(halfPayRecord.net_salary || 0),
        grossPaid: Number(halfPayRecord.gross_salary || 0),
        deductionsApplied,
      });
      // Auto-set to balance payment
      setPaymentType('balance');
      const balanceGross = Math.round(emp.salary / 2);
      setForm(prev => ({
        ...prev,
        salaryAmount: balanceGross.toString(),
        advanceDeduction: '0', // Deductions already applied on half pay
        month: currentMonth,
      }));
    } else if (paidThisMonth) {
      const totalPaid = existingPayments.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
      setCurrentMonthPaymentInfo({ count: existingPayments.length, totalPaid });
      // Roll to next month
      setForm(prev => ({ ...prev, month: getNextMonth() }));
    }

    // Fetch bank details
    const { data: bankData } = await supabase
      .from('employees')
      .select('bank_name, account_name, account_number, bank_phone, bank_email, alternative_bank')
      .eq('id', emp.id)
      .single();
    if (bankData) {
      setEmployeeBankDetails(bankData as any);
    }

    // Fetch active salary advances (all of them)
    const { data: advances } = await supabase
      .from('employee_salary_advances')
      .select('id, remaining_balance, minimum_payment, original_amount')
      .eq('employee_email', emp.email)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Sum up all active advances
    let advMinPayment = 0;
    if (advances && advances.length > 0) {
      const totalRemaining = advances.reduce((sum, a) => sum + Number(a.remaining_balance), 0);
      const totalMinPayment = advances.reduce((sum, a) => sum + Number(a.minimum_payment), 0);
      const totalOriginal = advances.reduce((sum, a) => sum + Number(a.original_amount), 0);
      advMinPayment = totalMinPayment;
      setAdvanceInfo({
        id: advances[0].id,
        remaining_balance: totalRemaining,
        minimum_payment: totalMinPayment,
        original_amount: totalOriginal,
      });
    } else {
      setAdvanceInfo(null);
    }

    // Fetch current month time deductions (only those not already deducted)
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: deductions } = await supabase
      .from('time_deductions')
      .select('hours_missed, total_deduction, reason, deducted_in_payment_id')
      .eq('employee_id', emp.id)
      .eq('month', monthKey);

    // Only count deductions that haven't been cleared yet
    const undeductedRecords = deductions?.filter(d => !d.deducted_in_payment_id) || [];
    const totalHours = undeductedRecords.reduce((sum, d) => sum + Number(d.hours_missed), 0);
    const totalDeduction = undeductedRecords.reduce((sum, d) => sum + Number(d.total_deduction), 0);

    if (totalDeduction > 0) {
      setTimeDeductionInfo({ hours_missed: totalHours, total_deduction: totalDeduction, reason: undeductedRecords[0]?.reason || null });
    }

    // If balance payment (half pay already done with deductions), zero out deductions
    if (halfPayRecord) {
      // Deductions already cleared on half pay - no deductions for balance
      setTimeDeductionInfo(null);
      return; // form already set above
    }

    const salaryAmount = emp.salary;
    setForm(prev => ({
      ...prev,
      salaryAmount: paidThisMonth ? salaryAmount.toString() : salaryAmount.toString(),
      advanceDeduction: advMinPayment > 0 ? advMinPayment.toString() : '0',
      month: paidThisMonth ? getNextMonth() : currentMonth,
    }));
  };

  // Update salary amount when payment type changes
  const handlePaymentTypeChange = (type: 'full' | 'half' | 'balance') => {
    setPaymentType(type);
    if (selectedEmployee) {
      if (type === 'half') {
        const amount = Math.round(selectedEmployee.salary / 2);
        setForm(prev => ({ ...prev, salaryAmount: amount.toString() }));
      } else if (type === 'balance') {
        const amount = Math.round(selectedEmployee.salary / 2);
        setForm(prev => ({ ...prev, salaryAmount: amount.toString(), advanceDeduction: '0' }));
        // No deductions on balance - already applied on half pay
        setTimeDeductionInfo(null);
      } else {
        setForm(prev => ({ ...prev, salaryAmount: selectedEmployee.salary.toString() }));
      }
    }
  };

  const grossSalary = parseFloat(form.salaryAmount) || 0;
  const advDeduction = parseFloat(form.advanceDeduction) || 0;
  const timeDeduction = timeDeductionInfo?.total_deduction || 0;
  const netSalary = Math.max(0, grossSalary - advDeduction - timeDeduction);

  const handleSubmit = async () => {
    if (!selectedEmployee || !form.salaryAmount || !form.month) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('employee_salary_payments')
        .insert({
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.name,
          employee_email: selectedEmployee.email,
          employee_phone: selectedEmployee.phone,
          gross_salary: grossSalary,
          salary_amount: netSalary,
          advance_deduction: advDeduction,
          advance_id: advanceInfo?.id || null,
          time_deduction: timeDeduction,
          time_deduction_hours: timeDeductionInfo?.hours_missed || 0,
          net_salary: netSalary,
          payment_month: form.month,
          payment_method: form.paymentMethod,
          processed_by: currentUser?.name || '',
          processed_by_email: currentUser?.email || '',
          notes: `${paymentType === 'half' ? '[HALF SALARY] ' : paymentType === 'balance' ? '[BALANCE SALARY] ' : '[FULL SALARY] '}${alreadyPaidCurrentMonth && paymentType !== 'balance' ? '[NEXT MONTH PAYMENT] ' : ''}${form.notes || ''}`.trim() || null,
          payment_label: paymentType === 'half' ? 'HALF SALARY' : paymentType === 'balance' ? 'BALANCE SALARY' : 'FULL SALARY',
          status: 'processing',
        });

      if (error) throw error;

      toast({ title: "Success", description: `Salary payment for ${selectedEmployee.name} initiated. Net: UGX ${netSalary.toLocaleString()}` });
      setSelectedEmployee(null);
      setAdvanceInfo(null);
      setTimeDeductionInfo(null);
      setAlreadyPaidCurrentMonth(false);
      setCurrentMonthPaymentInfo(null);
      setHalfPayAlreadyPaid(false);
      setHalfPayInfo(null);
      setPaymentType('full');
      setForm({ salaryAmount: '', advanceDeduction: '', month: format(new Date(), 'MMMM yyyy'), paymentMethod: 'Bank Transfer', notes: '' });
      fetchPayments();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({ title: "Error", description: "Failed to process payment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async (payment: SalaryPayment) => {
    const txId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      const { error } = await supabase
        .from('employee_salary_payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: currentUser?.name || '',
          transaction_id: txId,
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Update salary advance balances if there was a deduction
      if (payment.advance_deduction > 0 && payment.advance_id) {
        try {
          // Get all active advances for this employee
          const { data: advances } = await supabase
            .from('employee_salary_advances')
            .select('id, remaining_balance, minimum_payment')
            .eq('employee_email', payment.employee_email)
            .eq('status', 'active')
            .order('created_at', { ascending: true });

          if (advances && advances.length > 0) {
            let remainingDeduction = payment.advance_deduction;
            for (const adv of advances) {
              if (remainingDeduction <= 0) break;
              const deductFromThis = Math.min(remainingDeduction, Number(adv.remaining_balance));
              const newBalance = Math.max(0, Number(adv.remaining_balance) - deductFromThis);
              await supabase
                .from('employee_salary_advances')
                .update({
                  remaining_balance: newBalance,
                  status: newBalance <= 0 ? 'paid_off' : 'active',
                })
                .eq('id', adv.id);
              remainingDeduction -= deductFromThis;
            }
          }
        } catch (err) {
          console.error('Failed to update advance balance:', err);
        }
      }

      // Mark time deductions as cleared for this payment
      if (payment.time_deduction > 0) {
        try {
          const now = new Date();
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          
          // Get employee_id from the payment's employee
          const { data: empData } = await supabase
            .from('employees')
            .select('id')
            .eq('email', payment.employee_email)
            .single();

          if (empData) {
            await supabase
              .from('time_deductions')
              .update({ deducted_in_payment_id: payment.id })
              .eq('employee_id', empData.id)
              .eq('month', monthKey)
              .is('deducted_in_payment_id', null);
          }
        } catch (err) {
          console.error('Failed to clear time deductions:', err);
        }
      }

      // Send SMS notification
      if (payment.employee_phone) {
        try {
          const payLabel = payment.payment_label ? ` (${payment.payment_label})` : '';
          let smsMessage = `Great Pearl Coffee: Your salary${payLabel} for ${payment.payment_month} has been disbursed.\n\nGross: UGX ${Number(payment.gross_salary).toLocaleString()}`;
          if (payment.advance_deduction > 0) {
            smsMessage += `\nAdvance Deduction: -UGX ${Number(payment.advance_deduction).toLocaleString()}`;
          }
          if (payment.time_deduction > 0) {
            smsMessage += `\nTime Deduction: -UGX ${Number(payment.time_deduction).toLocaleString()} (${payment.time_deduction_hours}hrs)`;
          }
          smsMessage += `\nNet Paid: UGX ${Number(payment.net_salary).toLocaleString()}`;
          smsMessage += `\nTransaction ID: ${txId}`;

          await supabase.functions.invoke('send-sms', {
            body: { phone: payment.employee_phone, message: smsMessage },
          });

          await supabase
            .from('employee_salary_payments')
            .update({ sms_sent: true })
            .eq('id', payment.id);
        } catch (smsErr) {
          console.error('SMS send failed:', smsErr);
        }
      }

      toast({
        title: "Payment Completed",
        description: `${payment.employee_name}'s salary marked as paid. Transaction ID: ${txId}`
      });
      fetchPayments();
    } catch (error) {
      console.error('Error completing payment:', error);
      toast({ title: "Error", description: "Failed to complete payment", variant: "destructive" });
    }
  };

  const handleCancelPayment = async (payment: SalaryPayment) => {
    try {
      const { error } = await supabase
        .from('employee_salary_payments')
        .update({
          status: 'cancelled',
          notes: `${payment.notes ? payment.notes + ' | ' : ''}Cancelled by ${currentUser?.name || 'HR'} on ${new Date().toLocaleDateString()}`,
        })
        .eq('id', payment.id);

      if (error) throw error;

      toast({
        title: "Payment Cancelled",
        description: `Salary payment for ${payment.employee_name} has been cancelled.`,
      });
      fetchPayments();
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast({ title: "Error", description: "Failed to cancel payment", variant: "destructive" });
    }
  };


  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <DollarSign className="h-4 w-4" />
        Process Employee Salary
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Process Employee Salary Payment
            </DialogTitle>
            <DialogDescription>
              Select an employee, review deductions, and process payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Process New Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">New Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Employee</Label>
                    <Select onValueChange={handleEmployeeSelect} value={selectedEmployee?.id || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} - {emp.department}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Month</Label>
                    <Input
                      value={form.month}
                      onChange={e => setForm({ ...form, month: e.target.value })}
                      placeholder="e.g. February 2026"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={paymentType} onValueChange={(v: 'full' | 'half' | 'balance') => handlePaymentTypeChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Salary</SelectItem>
                        <SelectItem value="half">Half Salary</SelectItem>
                        <SelectItem value="balance">Balance (Remaining Half)</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedEmployee && (
                      <p className="text-xs text-muted-foreground">
                        {paymentType === 'half' ? 'Half' : paymentType === 'balance' ? 'Balance' : 'Full'}: UGX {(
                          paymentType === 'half' || paymentType === 'balance' 
                            ? Math.round(selectedEmployee.salary / 2) 
                            : selectedEmployee.salary
                        ).toLocaleString()}
                        {paymentType === 'balance' && ' (No deductions — already applied on half pay)'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Gross Salary (UGX)</Label>
                    <Input
                      type="number"
                      value={form.salaryAmount}
                      onChange={e => setForm({ ...form, salaryAmount: e.target.value })}
                      placeholder="0"
                    />
                    {selectedEmployee && (
                      <p className="text-xs text-muted-foreground">
                        Base salary: UGX {selectedEmployee.salary.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={form.paymentMethod} onValueChange={v => setForm({ ...form, paymentMethod: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Half Pay Already Paid - Balance Info */}
                {selectedEmployee && halfPayAlreadyPaid && halfPayInfo && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-sm text-green-800">
                      <strong>Half Salary Already Paid:</strong> {selectedEmployee.name} received <strong>UGX {halfPayInfo.netPaid.toLocaleString()}</strong> (half pay) for {format(new Date(), 'MMMM yyyy')}.
                      {halfPayInfo.deductionsApplied > 0 && (
                        <span> Deductions of <strong>UGX {halfPayInfo.deductionsApplied.toLocaleString()}</strong> were already applied.</span>
                      )}
                      <br />
                      <span className="font-semibold">Balance remaining: UGX {Math.round(selectedEmployee.salary / 2).toLocaleString()} — No deductions will apply.</span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Already Fully Paid Alert */}
                {selectedEmployee && alreadyPaidCurrentMonth && !halfPayAlreadyPaid && currentMonthPaymentInfo && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800">
                      <strong>{selectedEmployee.name}</strong> has already been paid for <strong>{format(new Date(), 'MMMM yyyy')}</strong> 
                      ({currentMonthPaymentInfo.count} payment{currentMonthPaymentInfo.count > 1 ? 's' : ''}, 
                      total: UGX {currentMonthPaymentInfo.totalPaid.toLocaleString()}).
                      <br />
                      <span className="font-semibold">This payment will be applied to {getNextMonth()}.</span> All deductions will also carry over to next month.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Deductions Section */}
                {selectedEmployee && (advanceInfo || timeDeductionInfo) && (
                  <div className="space-y-3 p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      Deductions
                    </h4>

                    {advanceInfo && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Salary Advance (Balance: UGX {advanceInfo.remaining_balance.toLocaleString()})
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Min: UGX {advanceInfo.minimum_payment.toLocaleString()}
                          </span>
                        </div>
                        <Input
                          type="number"
                          value={form.advanceDeduction}
                          onChange={e => setForm({ ...form, advanceDeduction: e.target.value })}
                          placeholder="Advance deduction amount"
                          min={0}
                          max={advanceInfo.remaining_balance}
                        />
                        <p className="text-xs text-muted-foreground">
                          HR decides how much to deduct (min recommended: UGX {advanceInfo.minimum_payment.toLocaleString()})
                        </p>
                      </div>
                    )}

                    {timeDeductionInfo && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-sm text-red-800">
                          <strong>Time Deduction:</strong> {timeDeductionInfo.hours_missed} hrs missed → 
                          <strong> -UGX {timeDeductionInfo.total_deduction.toLocaleString()}</strong>
                          {timeDeductionInfo.reason && <span className="block text-xs mt-1">Reason: {timeDeductionInfo.reason}</span>}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Employee Bank Details */}
                {selectedEmployee && employeeBankDetails?.bank_name && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4" />
                      Employee Bank Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Bank</span>
                        <p className="font-medium">{employeeBankDetails.bank_name}</p>
                      </div>
                      {employeeBankDetails.account_name && (
                        <div>
                          <span className="text-muted-foreground text-xs">Account Name</span>
                          <p className="font-medium">{employeeBankDetails.account_name}</p>
                        </div>
                      )}
                      {employeeBankDetails.account_number && (
                        <div>
                          <span className="text-muted-foreground text-xs">Account No.</span>
                          <p className="font-medium">{employeeBankDetails.account_number}</p>
                        </div>
                      )}
                      {employeeBankDetails.bank_phone && (
                        <div>
                          <span className="text-muted-foreground text-xs">Phone</span>
                          <p className="font-medium">{employeeBankDetails.bank_phone}</p>
                        </div>
                      )}
                      {employeeBankDetails.bank_email && (
                        <div>
                          <span className="text-muted-foreground text-xs">Email</span>
                          <p className="font-medium">{employeeBankDetails.bank_email}</p>
                        </div>
                      )}
                      {employeeBankDetails.alternative_bank && (
                        <div>
                          <span className="text-muted-foreground text-xs">Alt. Bank</span>
                          <p className="font-medium">{employeeBankDetails.alternative_bank}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEmployee && !employeeBankDetails?.bank_name && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      This employee has not added bank details yet. They can add them from My Expenses → Salary Requests.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Net Salary Summary */}
                {selectedEmployee && (
                  <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Gross Salary</span>
                        <span className="font-medium">UGX {grossSalary.toLocaleString()}</span>
                      </div>
                      {advDeduction > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>- Advance Deduction</span>
                          <span>UGX {advDeduction.toLocaleString()}</span>
                        </div>
                      )}
                      {timeDeduction > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>- Time Deduction ({timeDeductionInfo?.hours_missed}hrs)</span>
                          <span>UGX {timeDeduction.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Net Salary</span>
                        <span className="text-primary">UGX {netSalary.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleSubmit} disabled={submitting || !selectedEmployee} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Processing...' : `Process Payment — UGX ${netSalary.toLocaleString()}`}
                </Button>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No payments processed yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Gross</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Net Paid</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map(payment => {
                          const totalDeductions = Number(payment.advance_deduction || 0) + Number(payment.time_deduction || 0);
                          return (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">
                                {payment.employee_name}
                                {payment.payment_label && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {payment.payment_label}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{payment.payment_month}</TableCell>
                              <TableCell>UGX {Number(payment.gross_salary || payment.salary_amount).toLocaleString()}</TableCell>
                              <TableCell>
                                {totalDeductions > 0 ? (
                                  <span className="text-red-600 text-sm">-UGX {totalDeductions.toLocaleString()}</span>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="font-semibold">UGX {Number(payment.net_salary || payment.salary_amount).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={payment.status === 'completed' ? 'default' : 'secondary'} 
                                  className={
                                    payment.status === 'completed' ? 'bg-green-600' : 
                                    payment.status === 'cancelled' ? 'bg-red-600' : 'bg-orange-500'
                                  }
                                >
                                  {payment.status === 'completed' ? 'Paid' : payment.status === 'cancelled' ? 'Cancelled' : 'Processing'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {payment.status === 'processing' && (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleMarkComplete(payment)}>
                                      <CheckCircle className="h-3 w-3" />
                                      Mark Paid
                                    </Button>
                                    <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleCancelPayment(payment)}>
                                      <XCircle className="h-3 w-3" />
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                                {payment.status === 'completed' && payment.sms_sent && (
                                  <span className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> SMS Sent
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProcessPayrollDialog;
