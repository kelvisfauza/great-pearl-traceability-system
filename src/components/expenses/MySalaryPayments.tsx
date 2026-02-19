import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle, Clock, Printer, DollarSign, Info } from 'lucide-react';
import { format } from 'date-fns';

interface SalaryPayment {
  id: string;
  employee_name: string;
  salary_amount: number;
  payment_month: string;
  payment_method: string;
  transaction_id: string | null;
  status: string;
  processed_by: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

const MySalaryPayments = () => {
  const { employee } = useAuth();
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [printPayment, setPrintPayment] = useState<SalaryPayment | null>(null);

  useEffect(() => {
    if (employee?.email) fetchMyPayments();
  }, [employee?.email]);

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
      {/* Current Month Status */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Salary payments are now processed automatically by HR.</strong> You no longer need to submit salary requests. Check below for your payment status.
        </AlertDescription>
      </Alert>

      {currentMonthPayment ? (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {currentMonth} Salary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-lg font-bold">UGX {Number(currentMonthPayment.salary_amount).toLocaleString()}</p>
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
              <div>
                <p className="text-sm text-muted-foreground">Transaction ID</p>
                <p className="font-mono text-sm">{currentMonthPayment.transaction_id || 'Pending'}</p>
              </div>
            </div>

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
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <p className="font-medium">{payment.payment_month}</p>
                    <p className="text-sm text-muted-foreground">
                      UGX {Number(payment.salary_amount).toLocaleString()} • {payment.payment_method}
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
              ))}
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
                <h2 className="text-xl font-bold">Great Pearl Coffee Ltd</h2>
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
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg">UGX {Number(printPayment.salary_amount).toLocaleString()}</p>
                </div>
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
