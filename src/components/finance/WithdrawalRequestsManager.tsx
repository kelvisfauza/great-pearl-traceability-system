import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { 
  Wallet, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Banknote,
  Smartphone,
  User,
  Calendar,
  DollarSign,
  Loader2,
  RefreshCw,
  Printer
} from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  phone_number: string;
  status: string;
  channel: string;
  request_ref: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  processed_at?: string;
  payment_voucher?: string;
  requires_three_approvals?: boolean;
  admin_approved_1_by?: string;
  admin_approved_1_at?: string;
  admin_approved_2_by?: string;
  admin_approved_2_at?: string;
  admin_approved_3_by?: string;
  admin_approved_3_at?: string;
  requester_name?: string;
  requester_email?: string;
  disbursement_method?: string;
  // Joined employee data
  employee_name?: string;
  employee_email?: string;
  employee_phone?: string;
}

export const WithdrawalRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentVoucher, setPaymentVoucher] = useState('');
  const { toast } = useToast();
  const { employee } = useAuth();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch withdrawal requests that are pending finance approval (all admins have approved)
      const { data: withdrawalData, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending_finance')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with employee names
      const enrichedRequests = await Promise.all(
        (withdrawalData || []).map(async (request) => {
          // Try to get employee info by user_id (which might be email)
          let employeeData = null;
          
          // First try by email (user_id might be email)
          const { data: byEmail } = await supabase
            .from('employees')
            .select('name, email, phone')
            .eq('email', request.user_id)
            .maybeSingle();
          
          if (byEmail) {
            employeeData = byEmail;
          } else {
            // Try by auth_user_id
            const { data: byAuthId } = await supabase
              .from('employees')
              .select('name, email, phone')
              .eq('auth_user_id', request.user_id)
              .maybeSingle();
            employeeData = byAuthId;
          }

          return {
            ...request,
            employee_name: employeeData?.name || request.user_id,
            employee_email: employeeData?.email || request.user_id,
            employee_phone: employeeData?.phone || request.phone_number
          };
        })
      );

      setRequests(enrichedRequests);
    } catch (error: any) {
      console.error('Error fetching withdrawal requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch withdrawal requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    // Prevent self-approval
    const requesterEmail = (selectedRequest as any).requester_email || selectedRequest.employee_email;
    if (requesterEmail === employee?.email) {
      toast({
        title: "Self-Approval Blocked",
        description: "You cannot approve your own withdrawal request.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(selectedRequest.id);
    try {
      const updateData: any = {
        finance_approved_at: new Date().toISOString(),
        finance_approved_by: employee?.name || employee?.email || 'Finance',
        updated_at: new Date().toISOString()
      };

      if (paymentVoucher) {
        updateData.payment_voucher = paymentVoucher;
      }

      // The trigger will auto-set status to 'approved' and create ledger entry
      const { error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      const phoneToNotify = (selectedRequest as any).disbursement_phone || selectedRequest.phone_number || selectedRequest.employee_phone;
      const isMobileMoney = selectedRequest.channel === 'MOBILE_MONEY' || (selectedRequest.channel !== 'CASH' && selectedRequest.channel !== 'BANK');

      // For Mobile Money: initiate payout via GosentePay
      let payoutRef = '';
      let payoutSuccess = false;
      if (isMobileMoney && phoneToNotify) {
        try {
          // Normalize phone for GosentePay (must start with 256)
          let payoutPhone = phoneToNotify.replace(/\D/g, '');
          if (payoutPhone.startsWith('0')) payoutPhone = '256' + payoutPhone.slice(1);
          if (!payoutPhone.startsWith('256')) payoutPhone = '256' + payoutPhone;

          const { data: payoutData, error: payoutError } = await supabase.functions.invoke('gosentepay-payout', {
            body: {
              phone: payoutPhone,
              amount: selectedRequest.amount,
              ref: selectedRequest.request_ref || `WD-${selectedRequest.id.slice(0, 8)}`
            }
          });

          if (payoutError) {
            console.error('GosentePay payout error:', payoutError);
          } else if (payoutData?.status === 'success') {
            payoutSuccess = true;
            payoutRef = payoutData.ref || selectedRequest.request_ref;
            console.log('GosentePay payout initiated successfully:', payoutRef);
          } else {
            console.error('GosentePay payout failed:', payoutData);
          }
        } catch (payoutErr) {
          console.error('GosentePay payout exception:', payoutErr);
        }
      }

      // Send SMS notification
      if (phoneToNotify) {
        let message = '';
        if (isMobileMoney) {
          if (payoutSuccess) {
            message = `Dear ${selectedRequest.employee_name}, your withdrawal of UGX ${selectedRequest.amount.toLocaleString()} has been APPROVED and sent to your Mobile Money number ${selectedRequest.phone_number}. Ref: ${payoutRef}. Great Pearl Coffee.`;
          } else {
            message = `Dear ${selectedRequest.employee_name}, your withdrawal of UGX ${selectedRequest.amount.toLocaleString()} has been APPROVED. Mobile Money disbursement is being processed to ${selectedRequest.phone_number}. Ref: ${selectedRequest.request_ref}. Contact Finance if not received. Great Pearl Coffee.`;
          }
        } else {
          message = `Dear ${selectedRequest.employee_name}, your withdrawal of UGX ${selectedRequest.amount.toLocaleString()} has been APPROVED. Please collect your CASH from the Finance office. Ref: ${selectedRequest.request_ref}. Great Pearl Coffee.`;
        }

        try {
          await supabase.functions.invoke('send-sms', {
            body: { phone: phoneToNotify, message }
          });
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
        }
      }

      toast({
        title: "Withdrawal Approved by Finance",
        description: isMobileMoney && payoutSuccess
          ? `UGX ${selectedRequest.amount.toLocaleString()} sent to ${selectedRequest.phone_number} via Mobile Money.`
          : isMobileMoney
          ? `UGX ${selectedRequest.amount.toLocaleString()} approved. Mobile Money payout may need manual follow-up.`
          : `UGX ${selectedRequest.amount.toLocaleString()} approved for cash collection by ${selectedRequest.employee_name}.`,
      });

      setShowApproveDialog(false);
      setSelectedRequest(null);
      setPaymentVoucher('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve withdrawal",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setProcessing(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'Rejected by Finance',
          rejected_by: employee?.name || employee?.email || 'Finance',
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Withdrawal Rejected",
        description: `Withdrawal request for ${selectedRequest.employee_name} has been rejected`,
      });

      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject withdrawal",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const openApproveDialog = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const openRejectDialog = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const printPaymentSlip = (request: WithdrawalRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Payment Slip – ${request.request_ref}</title>
        <style>
          body { font: 14px/1.4 system-ui; margin: 0; padding: 20px; }
          .card { width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #ddd; }
          h1 { font-size: 18px; margin: 0 0 12px; text-align: center; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; padding: 4px 0; border-bottom: 1px dotted #ccc; }
          .muted { color: #555; font-size: 12px; }
          .amount { font-size: 24px; font-weight: bold; text-align: center; margin: 16px 0; color: #059669; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-box { width: 45%; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; }
          @media print { .no-print { display:none; } }
        </style>
      </head>
      <body onload="window.print();">
        <div class="card">
          <h1>WITHDRAWAL PAYMENT SLIP</h1>
          <p class="muted" style="text-align: center;">Great Pearl Coffee Limited</p>
          <hr />
          
          <div class="amount">UGX ${request.amount.toLocaleString()}</div>
          
          <div class="row"><div>Reference</div><div><strong>${request.request_ref}</strong></div></div>
          <div class="row"><div>Employee</div><div>${request.employee_name}</div></div>
          <div class="row"><div>Email</div><div>${request.employee_email}</div></div>
          <div class="row"><div>Payment Method</div><div><strong>${request.channel === 'CASH' ? '💵 CASH' : '📱 MOBILE MONEY'}</strong></div></div>
          ${request.channel !== 'CASH' ? `<div class="row"><div>Phone Number</div><div>${request.phone_number}</div></div>` : ''}
          <div class="row"><div>Requested At</div><div>${format(new Date(request.created_at), 'dd MMM yyyy, HH:mm')}</div></div>
          ${request.approved_by ? `<div class="row"><div>Approved By</div><div>${request.approved_by}</div></div>` : ''}
          ${request.payment_voucher ? `<div class="row"><div>Payment Voucher</div><div>${request.payment_voucher}</div></div>` : ''}
          
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line">Employee Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Finance Officer</div>
            </div>
          </div>
          
          <p class="muted" style="margin-top: 24px; text-align: center;">
            Printed on ${format(new Date(), 'dd MMM yyyy, HH:mm')}
          </p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'CASH' ? (
      <Badge className="bg-amber-100 text-amber-800">
        <Banknote className="h-3 w-3 mr-1" />Cash
      </Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800">
        <Smartphone className="h-3 w-3 mr-1" />Mobile Money
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Pending Withdrawal Requests ({requests.length})
        </h2>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium">All Clear!</h3>
            <p className="text-muted-foreground">No pending withdrawal requests to process.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{request.employee_name}</h3>
                      {getStatusBadge(request.status)}
                      {getChannelIcon(request.channel)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ref: {request.request_ref}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      UGX {request.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Employee</p>
                      <p className="font-medium truncate">{request.employee_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{request.phone_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Requested</p>
                      <p className="font-medium">{format(new Date(request.created_at), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Channel</p>
                      <p className="font-medium">{request.channel === 'CASH' ? 'Cash' : 'Mobile Money'}</p>
                    </div>
                  </div>
                </div>

                {/* Admin Approval Info */}
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">✅ Admin Approvals Complete</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {request.admin_approved_1_by && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Admin 1: {request.admin_approved_1_by}</span>
                    )}
                    {request.admin_approved_2_by && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Admin 2: {request.admin_approved_2_by}</span>
                    )}
                    {request.admin_approved_3_by && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Admin 3: {request.admin_approved_3_by}</span>
                    )}
                  </div>
                  {request.requires_three_approvals && (
                    <p className="text-xs text-green-600 mt-1">⚡ High-value withdrawal — required 3 admin approvals</p>
                  )}
                </div>

                {/* Caution for Finance */}
                <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    ⚠️ <strong>Finance Caution:</strong> By approving, UGX {request.amount.toLocaleString()} will be deducted from the employee's wallet balance.
                    {request.channel !== 'CASH' && ' Ensure the phone number is correct before sending mobile money.'}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => printPaymentSlip(request)}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print Slip
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openRejectDialog(request)}
                    disabled={processing === request.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openApproveDialog(request)}
                    disabled={processing === request.id}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {request.channel === 'CASH' ? 'Pay Cash' : 'Send Mobile Money'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Withdrawal
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-medium">{selectedRequest.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-lg">UGX {selectedRequest.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium">
                    {selectedRequest.channel === 'CASH' ? '💵 Cash' : '📱 Mobile Money'}
                  </span>
                </div>
                {selectedRequest.channel !== 'CASH' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{selectedRequest.phone_number}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="voucher">Payment Voucher Number (Optional)</Label>
                <Input
                  id="voucher"
                  placeholder="e.g., PV-2024-001"
                  value={paymentVoucher}
                  onChange={(e) => setPaymentVoucher(e.target.value)}
                />
              </div>

              {selectedRequest.channel === 'CASH' && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Cash Payment:</strong> Ensure you have verified the employee's identity before handing over cash. Get their signature on the payment slip.
                  </p>
                </div>
              )}

              {selectedRequest.channel !== 'CASH' && (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Mobile Money:</strong> The amount will be sent to <strong>{selectedRequest.phone_number}</strong>. Please confirm this number is correct.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={processing !== null}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? 'Processing...' : 'Confirm & Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Withdrawal
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-medium">{selectedRequest.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold">UGX {selectedRequest.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection">Reason for Rejection</Label>
                <Textarea
                  id="rejection"
                  placeholder="Please provide a reason for rejecting this withdrawal..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject} 
              disabled={processing !== null || !rejectionReason}
            >
              {processing ? 'Processing...' : 'Reject Withdrawal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
