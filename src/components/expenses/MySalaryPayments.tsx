import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Clock, Printer, DollarSign, Info, AlertTriangle, CreditCard, Building, Save, Edit, X } from 'lucide-react';
import { format } from 'date-fns';

interface SalaryPayment {
  id: string;
  employee_name: string;
  gross_salary: number;
  salary_amount: number;
  advance_deduction: number;
  time_deduction: number;
  time_deduction_hours: number;
  net_salary: number;
  payment_month: string;
  payment_method: string;
  transaction_id: string | null;
  status: string;
  processed_by: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  bank_phone: string;
  bank_email: string;
  alternative_bank: string;
}

const MySalaryPayments = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [printPayment, setPrintPayment] = useState<SalaryPayment | null>(null);
  const [advanceInfo, setAdvanceInfo] = useState<{ remaining_balance: number; minimum_payment: number; original_amount: number } | null>(null);
  const [timeDeductionInfo, setTimeDeductionInfo] = useState<{ hours_missed: number; total_deduction: number } | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails>({ bank_name: '', account_name: '', account_number: '', bank_phone: '', bank_email: '', alternative_bank: '' });
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankLoaded, setBankLoaded] = useState(false);

  useEffect(() => {
    if (employee?.email) {
      fetchMyPayments();
      fetchDeductions();
      fetchBankDetails();
    }
  }, [employee?.email]);

  const fetchBankDetails = async () => {
    if (!employee?.authUserId) return;
    const { data } = await supabase
      .from('employees')
      .select('bank_name, account_name, account_number, bank_phone, bank_email, alternative_bank')
      .eq('auth_user_id', employee.authUserId)
      .single();
    if (data) {
      setBankDetails({
        bank_name: (data as any).bank_name || '',
        account_name: (data as any).account_name || '',
        account_number: (data as any).account_number || '',
        bank_phone: (data as any).bank_phone || '',
        bank_email: (data as any).bank_email || '',
        alternative_bank: (data as any).alternative_bank || '',
      });
    }
    setBankLoaded(true);
  };

  const handleSaveBankDetails = async () => {
    if (!employee?.authUserId) return;
    setSavingBank(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          bank_name: bankDetails.bank_name || null,
          account_name: bankDetails.account_name || null,
          account_number: bankDetails.account_number || null,
          bank_phone: bankDetails.bank_phone || null,
          bank_email: bankDetails.bank_email || null,
          alternative_bank: bankDetails.alternative_bank || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('auth_user_id', employee.authUserId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Bank details saved successfully!' });
      setEditingBank(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save bank details', variant: 'destructive' });
    } finally {
      setSavingBank(false);
    }
  };

  const fetchMyPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('employee_salary_payments')
      .select('*')
      .eq('employee_email', employee?.email)
      .order('created_at', { ascending: false });
    setPayments((data as SalaryPayment[]) || []);
    setLoading(false);
  };

  const fetchDeductions = async () => {
    if (!employee) return;

    // Fetch active salary advance
    const { data: advances } = await supabase
      .from('employee_salary_advances')
      .select('remaining_balance, minimum_payment, original_amount')
      .eq('employee_email', employee.email)
      .eq('status', 'active')
      .limit(1);

    if (advances?.[0]) {
      setAdvanceInfo(advances[0] as any);
    }

    // Fetch current month time deductions
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: deductions } = await supabase
      .from('time_deductions')
      .select('hours_missed, total_deduction')
      .eq('employee_id', employee.id)
      .eq('month', currentMonth);

    const totalHours = deductions?.reduce((sum, d) => sum + Number(d.hours_missed), 0) || 0;
    const totalDeduction = deductions?.reduce((sum, d) => sum + Number(d.total_deduction), 0) || 0;
    if (totalDeduction > 0) {
      setTimeDeductionInfo({ hours_missed: totalHours, total_deduction: totalDeduction });
    }
  };

  const currentMonth = format(new Date(), 'MMMM yyyy');
  const currentMonthPayment = payments.find(p => p.payment_month === currentMonth);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Salary payments are now processed automatically by HR.</strong> You no longer need to submit salary requests. Check below for your payment status.
        </AlertDescription>
      </Alert>

      {/* Active Deductions Summary */}
      {(advanceInfo || timeDeductionInfo) && (
        <Card className="border-2 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Active Deductions This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {advanceInfo && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <CreditCard className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Salary Advance</p>
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                    <p>Original Amount: UGX {advanceInfo.original_amount.toLocaleString()}</p>
                    <p>Remaining Balance: <span className="font-semibold text-amber-700">UGX {advanceInfo.remaining_balance.toLocaleString()}</span></p>
                    <p>Monthly Installment: UGX {advanceInfo.minimum_payment.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {timeDeductionInfo && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                <Clock className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Time Deduction</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    <p>{timeDeductionInfo.hours_missed} hours missed × 3,000 UGX/hr = <span className="font-semibold text-red-700">-UGX {timeDeductionInfo.total_deduction.toLocaleString()}</span></p>
                  </div>
                </div>
              </div>
            )}

            {employee?.salary && (
              <>
                <Separator />
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Salary</span>
                    <span>UGX {employee.salary.toLocaleString()}</span>
                  </div>
                  {advanceInfo && (
                    <div className="flex justify-between text-red-600">
                      <span>Advance Installment</span>
                      <span>-UGX {advanceInfo.minimum_payment.toLocaleString()}</span>
                    </div>
                  )}
                  {timeDeductionInfo && (
                    <div className="flex justify-between text-red-600">
                      <span>Time Penalty</span>
                      <span>-UGX {timeDeductionInfo.total_deduction.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Estimated Net Salary</span>
                    <span className="text-primary">
                      UGX {Math.max(0, employee.salary - (advanceInfo?.minimum_payment || 0) - (timeDeductionInfo?.total_deduction || 0)).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">* Final amount may differ based on HR's applied deduction</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bank Details */}
      {bankLoaded && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                My Bank Details
              </CardTitle>
              {!editingBank ? (
                <Button size="sm" variant="outline" onClick={() => setEditingBank(true)} className="gap-1">
                  <Edit className="h-3 w-3" />
                  {bankDetails.bank_name ? 'Edit' : 'Add Bank Details'}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveBankDetails} disabled={savingBank} className="gap-1">
                    {savingBank ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingBank(false); fetchBankDetails(); }} className="gap-1">
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingBank ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bank Name</Label>
                  <Input value={bankDetails.bank_name} onChange={e => setBankDetails(p => ({ ...p, bank_name: e.target.value }))} placeholder="e.g. Stanbic Bank" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account Name</Label>
                  <Input value={bankDetails.account_name} onChange={e => setBankDetails(p => ({ ...p, account_name: e.target.value }))} placeholder="Name on account" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Account Number</Label>
                  <Input value={bankDetails.account_number} onChange={e => setBankDetails(p => ({ ...p, account_number: e.target.value }))} placeholder="Account number" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone Number</Label>
                  <Input value={bankDetails.bank_phone} onChange={e => setBankDetails(p => ({ ...p, bank_phone: e.target.value }))} placeholder="e.g. 0770123456" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={bankDetails.bank_email} onChange={e => setBankDetails(p => ({ ...p, bank_email: e.target.value }))} placeholder="email@example.com" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Alternative Bank</Label>
                  <Input value={bankDetails.alternative_bank} onChange={e => setBankDetails(p => ({ ...p, alternative_bank: e.target.value }))} placeholder="e.g. Centenary Bank" />
                </div>
              </div>
            ) : bankDetails.bank_name ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Bank Name</p>
                  <p className="font-medium">{bankDetails.bank_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Account Name</p>
                  <p className="font-medium">{bankDetails.account_name || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Account Number</p>
                  <p className="font-medium">{bankDetails.account_number || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{bankDetails.bank_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{bankDetails.bank_email || '-'}</p>
                </div>
                {bankDetails.alternative_bank && (
                  <div>
                    <p className="text-muted-foreground text-xs">Alternative Bank</p>
                    <p className="font-medium">{bankDetails.alternative_bank}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bank details added yet. Click "Add Bank Details" to set up your payment information for HR.</p>
            )}
          </CardContent>
        </Card>
      )}

      {currentMonthPayment ? (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {currentMonth} Salary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Gross Salary</p>
                <p className="text-lg font-bold">UGX {Number(currentMonthPayment.gross_salary || currentMonthPayment.salary_amount).toLocaleString()}</p>
              </div>
              {Number(currentMonthPayment.advance_deduction) > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Advance Deduction</p>
                  <p className="font-medium text-red-600">-UGX {Number(currentMonthPayment.advance_deduction).toLocaleString()}</p>
                </div>
              )}
              {Number(currentMonthPayment.time_deduction) > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Time Deduction ({currentMonthPayment.time_deduction_hours}hrs)</p>
                  <p className="font-medium text-red-600">-UGX {Number(currentMonthPayment.time_deduction).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Net Salary</p>
                <p className="text-lg font-bold text-primary">UGX {Number(currentMonthPayment.net_salary || currentMonthPayment.salary_amount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Method</p>
                <p className="font-medium">{currentMonthPayment.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={currentMonthPayment.status === 'completed' ? 'bg-green-600' : 'bg-orange-500'}>
                  {currentMonthPayment.status === 'completed' ? (
                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Paid</span>
                  ) : (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Processing</span>
                  )}
                </Badge>
              </div>
            </div>

            {currentMonthPayment.transaction_id && (
              <p className="text-xs font-mono text-muted-foreground">Transaction ID: {currentMonthPayment.transaction_id}</p>
            )}

            {currentMonthPayment.status === 'completed' && (
              <Button variant="outline" className="gap-2" onClick={() => setPrintPayment(currentMonthPayment)}>
                <Printer className="h-4 w-4" />
                Print Payment Slip
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2">
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No salary payment recorded for {currentMonth} yet.</p>
            <p className="text-xs text-muted-foreground mt-1">HR will process your payment. You'll receive an SMS once paid.</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map(payment => {
                const totalDeductions = Number(payment.advance_deduction || 0) + Number(payment.time_deduction || 0);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <p className="font-medium">{payment.payment_month}</p>
                      <p className="text-sm text-muted-foreground">
                        Gross: UGX {Number(payment.gross_salary || payment.salary_amount).toLocaleString()}
                        {totalDeductions > 0 && (
                          <span className="text-red-600"> • Deductions: -UGX {totalDeductions.toLocaleString()}</span>
                        )}
                        <span className="font-semibold"> • Net: UGX {Number(payment.net_salary || payment.salary_amount).toLocaleString()}</span>
                      </p>
                      {payment.transaction_id && (
                        <p className="text-xs font-mono text-muted-foreground">ID: {payment.transaction_id}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className={payment.status === 'completed' ? 'bg-green-600' : 'bg-orange-500'}>
                        {payment.status === 'completed' ? 'Paid' : 'Processing'}
                      </Badge>
                      {payment.status === 'completed' && (
                        <Button size="sm" variant="ghost" onClick={() => setPrintPayment(payment)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print Payment Slip Dialog */}
      {printPayment && (
        <Dialog open={!!printPayment} onOpenChange={() => setPrintPayment(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payment Slip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 print:p-8" id="payment-slip">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">Great Agro Coffee Ltd</h2>
                <p className="text-sm text-muted-foreground">Salary Payment Slip</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee</p>
                  <p className="font-medium">{employee?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Department</p>
                  <p className="font-medium">{employee?.department}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Position</p>
                  <p className="font-medium">{employee?.position}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Month</p>
                  <p className="font-medium">{printPayment.payment_month}</p>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="border rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gross Salary</span>
                  <span className="font-medium">UGX {Number(printPayment.gross_salary || printPayment.salary_amount).toLocaleString()}</span>
                </div>
                {Number(printPayment.advance_deduction) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Salary Advance Deduction</span>
                    <span>-UGX {Number(printPayment.advance_deduction).toLocaleString()}</span>
                  </div>
                )}
                {Number(printPayment.time_deduction) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Time Deduction ({printPayment.time_deduction_hours}hrs missed)</span>
                    <span>-UGX {Number(printPayment.time_deduction).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Net Salary Paid</span>
                  <span>UGX {Number(printPayment.net_salary || printPayment.salary_amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{printPayment.payment_method}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-xs">{printPayment.transaction_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date Paid</p>
                  <p className="font-medium">
                    {printPayment.completed_at ? format(new Date(printPayment.completed_at), 'dd MMM yyyy, HH:mm') : '-'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="border-b border-dashed mb-1 h-8" />
                  <p className="text-xs text-muted-foreground">Employee Signature</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-dashed mb-1 h-8" />
                  <p className="text-xs text-muted-foreground">Authorized By</p>
                </div>
              </div>
            </div>
            <Button onClick={handlePrint} className="gap-2 w-full">
              <Printer className="h-4 w-4" />
              Print Slip
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MySalaryPayments;
