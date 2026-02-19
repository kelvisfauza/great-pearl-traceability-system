import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, UserCheck, CheckCircle, Loader2, Printer, Send } from 'lucide-react';
import { format } from 'date-fns';

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
  salary_amount: number;
  payment_month: string;
  payment_method: string;
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

const ProcessPayrollDialog = () => {
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    salaryAmount: '',
    month: format(new Date(), 'MMMM yyyy'),
    paymentMethod: 'Bank Transfer',
    notes: '',
  });

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

  const handleEmployeeSelect = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    setSelectedEmployee(emp || null);
    if (emp) {
      setForm(prev => ({ ...prev, salaryAmount: emp.salary.toString() }));
    }
  };

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
          salary_amount: parseFloat(form.salaryAmount),
          payment_month: form.month,
          payment_method: form.paymentMethod,
          processed_by: currentUser?.name || '',
          processed_by_email: currentUser?.email || '',
          notes: form.notes || null,
          status: 'processing',
        });

      if (error) throw error;

      toast({ title: "Success", description: `Salary payment for ${selectedEmployee.name} initiated` });
      setSelectedEmployee(null);
      setForm({ salaryAmount: '', month: format(new Date(), 'MMMM yyyy'), paymentMethod: 'Bank Transfer', notes: '' });
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

      // Send SMS notification
      if (payment.employee_phone) {
        try {
          const smsMessage = `Great Pearl Coffee: Your salary of UGX ${Number(payment.salary_amount).toLocaleString()} for ${payment.payment_month} has been successfully disbursed to your account. Transaction ID: ${txId}. Thank you.`;
          
          await supabase.functions.invoke('send-sms', {
            body: {
              phone: payment.employee_phone,
              message: smsMessage,
            },
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
              Select an employee, enter salary details, and process payment
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
                    <Label>Salary Amount (UGX)</Label>
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
                  {submitting ? 'Processing...' : 'Process Salary Payment'}
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
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map(payment => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{payment.employee_name}</TableCell>
                            <TableCell>{payment.payment_month}</TableCell>
                            <TableCell>UGX {Number(payment.salary_amount).toLocaleString()}</TableCell>
                            <TableCell>{payment.payment_method}</TableCell>
                            <TableCell>
                              <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className={payment.status === 'completed' ? 'bg-green-600' : 'bg-orange-500'}>
                                {payment.status === 'completed' ? 'Paid' : 'Processing'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{payment.transaction_id || '-'}</TableCell>
                            <TableCell>
                              {payment.status === 'processing' && (
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleMarkComplete(payment)}>
                                  <CheckCircle className="h-3 w-3" />
                                  Mark Paid
                                </Button>
                              )}
                              {payment.status === 'completed' && payment.sms_sent && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" /> SMS Sent
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
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
