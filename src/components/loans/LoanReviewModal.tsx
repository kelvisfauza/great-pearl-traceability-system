import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, User, Wallet, Shield, Calendar, AlertTriangle, TrendingUp, Banknote } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LoanReviewModalProps {
  loan: any;
  open: boolean;
  onClose: () => void;
  onApprove: (loanId: string) => void;
  onReject: (loanId: string, reason: string) => void;
  submitting: boolean;
}

const LoanReviewModal = ({ loan, open, onClose, onApprove, onReject, submitting, walletBalances }: LoanReviewModalProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [borrowerDetails, setBorrowerDetails] = useState<any>(null);
  const [guarantorDetails, setGuarantorDetails] = useState<any>(null);
  const [borrowerLoans, setBorrowerLoans] = useState<any[]>([]);
  const [guarantorLoans, setGuarantorLoans] = useState<any[]>([]);
  const [borrowerLedger, setBorrowerLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && loan) {
      fetchReviewData();
    }
  }, [open, loan]);

  const fetchReviewData = async () => {
    if (!loan) return;
    setLoading(true);
    try {
      // Fetch borrower employee details
      const { data: borrower } = await supabase
        .from('employees')
        .select('name, email, phone, salary, department, position, join_date, auth_user_id')
        .eq('email', loan.employee_email)
        .single();
      setBorrowerDetails(borrower);

      // Fetch guarantor employee details
      if (loan.guarantor_email) {
        const { data: guarantor } = await supabase
          .from('employees')
          .select('name, email, phone, salary, department, position, join_date')
          .eq('email', loan.guarantor_email)
          .single();
        setGuarantorDetails(guarantor);
      }

      // Fetch borrower's loan history
      const { data: bLoans } = await supabase
        .from('loans')
        .select('*')
        .eq('employee_email', loan.employee_email)
        .neq('id', loan.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setBorrowerLoans(bLoans || []);

      // Fetch guarantor's active loans (as borrower AND as guarantor)
      if (loan.guarantor_email) {
        const { data: gLoans } = await supabase
          .from('loans')
          .select('*')
          .or(`employee_email.eq.${loan.guarantor_email},guarantor_email.eq.${loan.guarantor_email}`)
          .in('status', ['active', 'pending_admin', 'pending_guarantor'])
          .order('created_at', { ascending: false });
        setGuarantorLoans(gLoans || []);
      }

      // Fetch borrower's recent ledger activity
      if (borrower?.auth_user_id) {
        const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: loan.employee_email });
        const uid = userId || borrower.auth_user_id;
        const { data: ledger } = await supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(15);
        setBorrowerLedger(ledger || []);
      }
    } catch (err) {
      console.error('Error fetching review data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!loan) return null;

  const borrowerWalletBalance = borrowerDetails?.auth_user_id
    ? walletBalances[borrowerDetails.auth_user_id] || 0
    : 0;

  const existingActiveLoans = borrowerLoans.filter(l => ['active', 'pending_admin', 'pending_guarantor'].includes(l.status));
  const totalOutstanding = existingActiveLoans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0);
  const totalMonthlyObligations = existingActiveLoans
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.monthly_installment || 0), 0);

  const newMonthlyInstallment = loan.monthly_installment || Math.ceil(loan.total_repayable / loan.duration_months);
  const totalMonthlyAfterApproval = totalMonthlyObligations + newMonthlyInstallment;
  const salary = borrowerDetails?.salary || 0;
  const debtToIncomeRatio = salary > 0 ? ((totalMonthlyAfterApproval / salary) * 100).toFixed(1) : 'N/A';

  const tenureMonths = borrowerDetails?.join_date
    ? Math.floor((Date.now() - new Date(borrowerDetails.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  // Generate repayment schedule preview
  const repaymentSchedule = [];
  const startDate = new Date();
  for (let i = 1; i <= loan.duration_months; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    dueDate.setDate(1);
    repaymentSchedule.push({
      installment: i,
      dueDate: dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: newMonthlyInstallment,
      source: 'Salary deduction',
    });
  }

  // Risk indicators
  const riskFlags: { label: string; severity: 'high' | 'medium' | 'low' }[] = [];
  if (Number(debtToIncomeRatio) > 50) riskFlags.push({ label: `Debt-to-income ratio: ${debtToIncomeRatio}%`, severity: 'high' });
  else if (Number(debtToIncomeRatio) > 30) riskFlags.push({ label: `Debt-to-income ratio: ${debtToIncomeRatio}%`, severity: 'medium' });
  if (existingActiveLoans.length >= 2) riskFlags.push({ label: `${existingActiveLoans.length} existing active loans`, severity: 'high' });
  if (tenureMonths < 3) riskFlags.push({ label: `Short tenure: ${tenureMonths} months`, severity: 'high' });
  else if (tenureMonths < 6) riskFlags.push({ label: `Tenure: ${tenureMonths} months`, severity: 'medium' });
  if (borrowerWalletBalance < 0) riskFlags.push({ label: `Negative wallet: UGX ${borrowerWalletBalance.toLocaleString()}`, severity: 'high' });
  if (loan.loan_amount > salary * 2) riskFlags.push({ label: 'Loan exceeds 2x salary', severity: 'medium' });

  const paidOffLoans = borrowerLoans.filter(l => l.status === 'paid_off' || l.status === 'completed');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Loan Application Review
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] px-6 pb-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading review data...</div>
          ) : (
            <div className="space-y-4">
              {/* Risk Alerts */}
              {riskFlags.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-semibold text-sm text-destructive">Risk Indicators</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {riskFlags.map((flag, i) => (
                        <Badge key={i} variant={flag.severity === 'high' ? 'destructive' : 'outline'} className="text-xs">
                          {flag.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Loan Summary */}
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Loan Request
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Principal</p>
                      <p className="font-bold">UGX {loan.loan_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Interest ({loan.interest_rate}%)</p>
                      <p className="font-bold">UGX {(loan.total_repayable - loan.loan_amount)?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Repayable</p>
                      <p className="font-bold">UGX {loan.total_repayable?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Monthly Installment</p>
                      <p className="font-bold">UGX {newMonthlyInstallment?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Borrower Profile */}
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" /> Borrower Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Name</p>
                      <p className="font-medium">{loan.employee_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Position</p>
                      <p className="font-medium">{borrowerDetails?.position || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Department</p>
                      <p className="font-medium">{borrowerDetails?.department || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Monthly Salary</p>
                      <p className="font-bold">UGX {salary.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Wallet Balance</p>
                      <p className={`font-bold ${borrowerWalletBalance < 0 ? 'text-destructive' : ''}`}>
                        {borrowerWalletBalance < 0 ? '-' : ''}UGX {Math.abs(borrowerWalletBalance).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Tenure</p>
                      <p className="font-medium">{tenureMonths} months</p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Existing Active Loans</p>
                      <p className="font-bold">{existingActiveLoans.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Outstanding Balance</p>
                      <p className="font-bold text-destructive">UGX {totalOutstanding.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Current Monthly Obligations</p>
                      <p className="font-bold">UGX {totalMonthlyObligations.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Past Loans Completed</p>
                      <p className="font-bold text-green-600">{paidOffLoans.length}</p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Affordability Analysis */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Affordability Analysis
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Total Monthly After Approval</p>
                        <p className="font-bold">UGX {totalMonthlyAfterApproval.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Salary Remaining</p>
                        <p className={`font-bold ${(salary - totalMonthlyAfterApproval) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          UGX {(salary - totalMonthlyAfterApproval).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Debt-to-Income Ratio</p>
                        <p className={`font-bold ${Number(debtToIncomeRatio) > 50 ? 'text-destructive' : Number(debtToIncomeRatio) > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                          {debtToIncomeRatio}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Guarantor */}
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Guarantor
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Name</p>
                      <p className="font-medium">{loan.guarantor_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Position</p>
                      <p className="font-medium">{guarantorDetails?.position || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      {loan.guarantor_approved ? (
                        <Badge className="text-xs bg-green-600">Approved</Badge>
                      ) : loan.guarantor_declined ? (
                        <Badge variant="destructive" className="text-xs">Declined</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Salary</p>
                      <p className="font-medium">UGX {(guarantorDetails?.salary || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Own Active Loans</p>
                      <p className="font-medium">{guarantorLoans.filter(l => l.employee_email === loan.guarantor_email).length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Guaranteeing Others</p>
                      <p className="font-medium">{guarantorLoans.filter(l => l.guarantor_email === loan.guarantor_email && l.id !== loan.id).length}</p>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    <strong>Recovery Plan:</strong> Monthly installments of UGX {newMonthlyInstallment.toLocaleString()} will be auto-deducted from borrower's salary. 
                    If borrower defaults, the guarantor ({loan.guarantor_name}) becomes liable for the remaining balance. 
                    System will flag overdue payments and escalate recovery through salary deductions from both borrower and guarantor if necessary.
                  </div>
                </CardContent>
              </Card>

              {/* Repayment Schedule */}
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Repayment Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 text-xs font-medium">#</th>
                          <th className="text-left p-2 text-xs font-medium">Due Date</th>
                          <th className="text-left p-2 text-xs font-medium">Amount</th>
                          <th className="text-left p-2 text-xs font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repaymentSchedule.map((r) => (
                          <tr key={r.installment} className="border-t">
                            <td className="p-2 text-xs">{r.installment}</td>
                            <td className="p-2 text-xs font-medium">{r.dueDate}</td>
                            <td className="p-2 text-xs">UGX {r.amount.toLocaleString()}</td>
                            <td className="p-2 text-xs text-muted-foreground">{r.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Wallet Activity */}
              {borrowerLedger.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> Recent Wallet Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-1">
                      {borrowerLedger.slice(0, 8).map((entry: any) => (
                        <div key={entry.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0">
                          <div>
                            <span className="font-medium">{entry.entry_type?.replace(/_/g, ' ')}</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span className={entry.amount >= 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                            {entry.amount >= 0 ? '+' : ''}UGX {entry.amount?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Decision Section */}
              {loan.status === 'pending_admin' && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Rejection Reason (if declining)</Label>
                  <Textarea
                    placeholder="Provide reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      onClick={() => onApprove(loan.id)}
                      disabled={submitting}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve & Disburse
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => onReject(loan.id, rejectionReason || 'Admin declined')}
                      disabled={submitting}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LoanReviewModal;
