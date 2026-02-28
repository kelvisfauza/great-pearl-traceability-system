import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Printer,
  Building,
  Package,
  Settings,
  Trash2,
  UserPlus,
  Scale,
  TrendingUp,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { UnifiedApprovalRequest } from '@/hooks/useUnifiedApprovalRequests';
import { supabase } from '@/integrations/supabase/client';

interface DynamicDetailedViewProps {
  request: UnifiedApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  onPrint?: (data: any) => void;
  className?: string;
}

export const DynamicDetailedView: React.FC<DynamicDetailedViewProps> = ({
  request,
  onApprove,
  onReject,
  onPrint,
  className
}) => {
  const [walletData, setWalletData] = useState<{
    balance: number;
    recentEntries: any[];
    loading: boolean;
  }>({ balance: 0, recentEntries: [], loading: true });

  // Fetch wallet balance and earning history for the requester
  useEffect(() => {
    const fetchWalletInfo = async () => {
      try {
        const requesterEmail = request.details?.requester_email || request.requestedBy;
        
        // Find user_id from employees
        const { data: emp } = await supabase
          .from('employees')
          .select('auth_user_id, name')
          .eq('email', requesterEmail)
          .maybeSingle();

        if (!emp?.auth_user_id) {
          setWalletData(prev => ({ ...prev, loading: false }));
          return;
        }

        const userId = emp.auth_user_id;

        // Fetch ALL ledger entries to calculate the same balance the user sees
        // The user dashboard shows: loyalty + bonus + deposits - withdrawals - pending
        const { data: entries } = await supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', userId)
          .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'])
          .order('created_at', { ascending: false });

        const allEntries = entries || [];
        
        // Sum only the types visible in the user's loyalty wallet (excludes DAILY_SALARY, LOAN_DISBURSEMENT)
        const balance = allEntries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        // Get pending withdrawals EXCLUDING the current request being reviewed
        const { data: pendingW } = await supabase
          .from('withdrawal_requests')
          .select('id, amount')
          .eq('user_id', userId)
          .in('status', ['pending_approval', 'pending_admin_2', 'pending_admin_3', 'pending_finance']);

        const currentRequestId = request.details?.withdrawal_id || request.id;
        const otherPending = (pendingW || [])
          .filter((w: any) => w.id !== currentRequestId)
          .reduce((s: number, w: any) => s + Number(w.amount), 0);
        
        // Show balance BEFORE this withdrawal — only subtract other pending requests
        const availableBalance = Math.max(0, balance - otherPending);

        setWalletData({
          balance: availableBalance,
          recentEntries: allEntries.slice(0, 10),
          loading: false,
        });
      } catch (err) {
        console.error('Error fetching wallet info:', err);
        setWalletData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchWalletInfo();
  }, [request.id, request.requestedBy, request.details]);


  const formatCurrency = (amount: string | number) => {
    if (!amount || amount === 0 || amount === '0') return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
    if (isNaN(numericAmount)) return amount;
    return `UGX ${numericAmount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const renderStoreReportDeletion = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-500" />
            Store Report Deletion Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Report Date</p>
              <p className="text-sm text-muted-foreground">{request.details?.reportDate || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Report ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.details?.reportId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Coffee Type</p>
              <p className="text-sm text-muted-foreground">{request.details?.coffeeType || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Input By</p>
              <p className="text-sm text-muted-foreground">{request.details?.inputBy || 'N/A'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Deletion Reason</p>
            <p className="text-sm text-muted-foreground bg-red-50 p-3 rounded border border-red-200">
              {request.details?.deleteReason || 'No reason provided'}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderUserRegistration = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-500" />
            User Registration Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">First Name</p>
              <p className="text-sm text-muted-foreground">{request.details?.firstName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Last Name</p>
              <p className="text-sm text-muted-foreground">{request.details?.lastName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{request.details?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-muted-foreground">{request.details?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Requested Role</p>
              <Badge variant="outline">{request.details?.role || 'User'}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Target Department</p>
              <Badge variant="secondary">{request.department}</Badge>
            </div>
          </div>
          {request.details?.reason && (
            <div>
              <p className="text-sm font-medium">Additional Information</p>
              <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
                {request.details.reason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderSalaryPayment = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            Salary Payment Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Month</p>
              <p className="text-sm text-muted-foreground">{request.details?.month || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Employee Count</p>
              <p className="text-sm text-muted-foreground">{request.details?.employee_count || 0} employees</p>
            </div>
            <div>
              <p className="text-sm font-medium">Total Amount</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(request.details?.total_amount || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Payment Method</p>
              <p className="text-sm text-muted-foreground">{request.details?.payment_method || 'Bank Transfer'}</p>
            </div>
          </div>
          
          {request.details?.bonuses && Number(request.details.bonuses) > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Bonuses</p>
                <p className="text-sm text-green-600">{formatCurrency(request.details.bonuses)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Deductions</p>
                <p className="text-sm text-red-600">{formatCurrency(request.details?.deductions || 0)}</p>
              </div>
            </div>
          )}

          {request.details?.notes && (
            <div>
              <p className="text-sm font-medium">Notes</p>
              <p className="text-sm text-muted-foreground bg-green-50 p-3 rounded border border-green-200">
                {request.details.notes}
              </p>
            </div>
          )}

          {request.details?.employee_details && Array.isArray(request.details.employee_details) && (
            <div>
              <p className="text-sm font-medium mb-2">Employee Details</p>
              <div className="max-h-32 overflow-y-auto border rounded">
                <div className="text-xs bg-gray-50 p-2 font-medium grid grid-cols-3 gap-2">
                  <span>Employee</span>
                  <span>Position</span>
                  <span>Amount</span>
                </div>
                {request.details.employee_details.slice(0, 5).map((emp: any, index: number) => (
                  <div key={index} className="text-xs p-2 border-t grid grid-cols-3 gap-2">
                    <span className="font-medium">{emp.name || 'N/A'}</span>
                    <span className="text-muted-foreground">{emp.position || 'N/A'}</span>
                    <span className="font-medium">{formatCurrency(emp.amount || 0)}</span>
                  </div>
                ))}
                {request.details.employee_details.length > 5 && (
                  <div className="text-xs p-2 text-center text-muted-foreground border-t">
                    +{request.details.employee_details.length - 5} more employees
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderBankTransfer = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-500" />
            Bank Transfer Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Supplier</p>
              <p className="text-sm text-muted-foreground">{request.details?.supplier || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Amount</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(request.details?.amount || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Batch Number</p>
              <p className="text-sm text-muted-foreground">{request.details?.batchNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Payment ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.details?.paymentId || 'N/A'}</p>
            </div>
          </div>
          
          {request.details?.qualityAssessmentId && (
            <div>
              <p className="text-sm font-medium">Quality Assessment ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.details.qualityAssessmentId}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderModificationRequest = () => (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-purple-500" />
            Modification Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Target Department</p>
              <Badge variant="secondary">{request.targetDepartment || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Original Payment ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.originalPaymentId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Batch Number</p>
              <p className="text-sm text-muted-foreground">{request.batchNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Quality Assessment ID</p>
              <p className="text-sm text-muted-foreground font-mono">{request.qualityAssessmentId || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium">Modification Reason</p>
            <p className="text-sm text-muted-foreground bg-purple-50 p-3 rounded border border-purple-200">
              {request.reason || 'No reason provided'}
            </p>
          </div>
          
          {request.comments && (
            <div>
              <p className="text-sm font-medium">Additional Comments</p>
              <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded border border-gray-200">
                {request.comments}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderRequestContent = () => {
    switch (request.requestType) {
      case 'Store Report Deletion':
        return renderStoreReportDeletion();
      case 'User Registration':
        return renderUserRegistration();
      case 'Salary Payment':
        return renderSalaryPayment();
      case 'Bank Transfer':
        return renderBankTransfer();
      case 'Modification Request':
        return renderModificationRequest();
      default:
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {request.details?.expense_type || request.requestType || 'General Request'} Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Request Type</p>
                  <Badge variant="outline">{request.details?.expense_type || request.requestType}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Department</p>
                  <Badge variant="secondary">{request.department}</Badge>
                </div>
                {request.details?.requestedby_name && (
                  <div>
                    <p className="text-sm font-medium">Requester Name</p>
                    <p className="text-sm text-muted-foreground">{request.details.requestedby_name}</p>
                  </div>
                )}
                {request.details?.requestedby_position && (
                  <div>
                    <p className="text-sm font-medium">Position</p>
                    <p className="text-sm text-muted-foreground">{request.details.requestedby_position}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(request.amount)}</p>
                </div>
              </div>

              {/* Description / Reason */}
              {request.description && (
                <div>
                  <p className="text-sm font-medium">Description / Reason</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded border">
                    {request.description}
                  </p>
                </div>
              )}

              {/* Disbursement Information */}
              {(request.details?.disbursement_method || request.details?.payment_method) && (
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment / Disbursement Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {request.details?.disbursement_method && (
                      <div>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Disbursement Method</p>
                        <p className="text-sm font-medium capitalize">{request.details.disbursement_method}</p>
                      </div>
                    )}
                    {request.details?.payment_method && (
                      <div>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Payment Method</p>
                        <p className="text-sm font-medium capitalize">{request.details.payment_method}</p>
                      </div>
                    )}
                    {request.details?.disbursement_phone && (
                      <div>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Phone Number</p>
                        <p className="text-sm font-mono font-medium">{request.details.disbursement_phone}</p>
                      </div>
                    )}
                    {request.details?.disbursement_bank_name && (
                      <div>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Bank Name</p>
                        <p className="text-sm font-medium">{request.details.disbursement_bank_name}</p>
                      </div>
                    )}
                    {request.details?.disbursement_account_number && (
                      <div>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Account Number</p>
                        <p className="text-sm font-mono font-medium">{request.details.disbursement_account_number}</p>
                      </div>
                    )}
                    {request.details?.disbursement_account_name && (
                      <div>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Account Name</p>
                        <p className="text-sm font-medium">{request.details.disbursement_account_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3-tier approval info */}
              {request.details?.requires_three_approvals && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    High-value request — requires 2 admin approvals + Finance approval
                  </p>
                  {request.details?.admin_approved_1_by && (
                    <p className="text-xs text-amber-600 mt-1">
                      ✅ Admin 1 approved by: {request.details.admin_approved_1_by}
                    </p>
                  )}
                  {request.details?.admin_approved_2_by && (
                    <p className="text-xs text-amber-600 mt-1">
                      ✅ Admin 2 approved by: {request.details.admin_approved_2_by}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{request.title}</h3>
          <p className="text-sm text-muted-foreground">{request.description}</p>
        </div>
        {onPrint && (
          <Button onClick={() => onPrint(request)} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print Details
          </Button>
        )}
      </div>

      <ScrollArea className="h-96">
        <div className="space-y-4">
          {/* Basic Request Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Requested By</p>
                  <p className="text-sm text-muted-foreground">{request.requestedBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Department</p>
                  <Badge variant="outline">{request.department}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Date Requested</p>
                  <p className="text-sm text-muted-foreground">{request.dateRequested}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Priority</p>
                  <Badge variant={request.priority === 'High' ? 'destructive' : 
                                request.priority === 'Medium' ? 'default' : 'secondary'}>
                    {request.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(request.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Source</p>
                  <Badge variant="outline">{request.source}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specific Request Content */}
          {renderRequestContent()}

          {/* Wallet Balance & Earning History */}
          {!walletData.loading && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-500" />
                  User Account Balance & Earnings
                </CardTitle>
                <CardDescription>
                  Current wallet state for {request.details?.requester_name || request.details?.requestedby_name || request.requestedBy}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                    <p className="text-xs font-medium text-muted-foreground">Balance Before Approval</p>
                    <p className="text-2xl font-bold text-green-700">UGX {walletData.balance.toLocaleString()}</p>
                  </div>
                  <div className="flex-1 p-4 rounded-lg bg-muted border">
                    <p className="text-xs font-medium text-muted-foreground">Requesting</p>
                    <p className="text-2xl font-bold text-destructive">− UGX {Number(request.amount).toLocaleString()}</p>
                  </div>
                  <div className="flex-1 p-4 rounded-lg bg-muted border">
                    <p className="text-xs font-medium text-muted-foreground">Balance After Approval</p>
                    <p className={`text-2xl font-bold ${walletData.balance - Number(request.amount) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                      UGX {(walletData.balance - Number(request.amount)).toLocaleString()}
                    </p>
                  </div>
                </div>

                {walletData.balance < Number(request.amount) && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">
                      Insufficient balance! User is requesting more than their available balance.
                    </p>
                  </div>
                )}

                {walletData.recentEntries.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">How They Earned (Recent Transactions)</p>
                    <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <div className="text-xs bg-muted p-2 font-medium grid grid-cols-4 gap-2 sticky top-0">
                        <span>Date</span>
                        <span>Type</span>
                        <span className="text-right">Amount</span>
                        <span>Source</span>
                      </div>
                      {walletData.recentEntries.map((entry: any, idx: number) => {
                        const isPositive = Number(entry.amount) > 0;
                        const typeLabels: Record<string, string> = {
                          LOYALTY_REWARD: 'Loyalty Reward',
                          BONUS: 'Bonus',
                          DEPOSIT: 'Deposit',
                          WITHDRAWAL: 'Withdrawal',
                          ADJUSTMENT: 'Adjustment',
                          DAILY_SALARY: 'Daily Salary',
                        };
                        return (
                          <div key={idx} className="text-xs p-2 border-t grid grid-cols-4 gap-2 items-center">
                            <span className="text-muted-foreground">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              {isPositive ? (
                                <ArrowDownRight className="h-3 w-3 text-green-500" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 text-destructive" />
                              )}
                              {typeLabels[entry.entry_type] || entry.entry_type}
                            </span>
                            <span className={`text-right font-mono font-medium ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
                              {isPositive ? '+' : ''}{Number(entry.amount).toLocaleString()}
                            </span>
                            <span className="text-muted-foreground truncate">
                              {entry.metadata?.activity_type || entry.reference?.split('-')[0] || '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <Separator />
      <div className="flex justify-end gap-3">
        <Button onClick={onReject} variant="destructive">
          <XCircle className="h-4 w-4 mr-2" />
          Reject Request
        </Button>
        <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve Request
        </Button>
      </div>
    </div>
  );
};