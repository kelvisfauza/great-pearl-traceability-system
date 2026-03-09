// @ts-nocheck - withdrawal_requests table has columns not yet in generated types
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
  Printer,
  AlertTriangle,
  RotateCcw
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
  disbursement_phone?: string;
  payout_status?: string;
  payout_error?: string;
  payout_attempted_at?: string;
  payout_ref?: string;
  finance_approved_at?: string;
  finance_approved_by?: string;
  // Joined employee data
  employee_name?: string;
  employee_email?: string;
  employee_phone?: string;
}

export const WithdrawalRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [failedPayouts, setFailedPayouts] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPayCashDialog, setShowPayCashDialog] = useState(false);
  const [cashRequest, setCashRequest] = useState<WithdrawalRequest | null>(null);
  const [cashVoucher, setCashVoucher] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentVoucher, setPaymentVoucher] = useState('');
  const { toast } = useToast();
  const { employee } = useAuth();

  const enrichWithEmployeeData = async (withdrawalData: any[]) => {
    return Promise.all(
      (withdrawalData || []).map(async (request: any) => {
        let employeeData = null;
        const { data: byEmail } = await supabase
          .from('employees')
          .select('name, email, phone')
          .eq('email', request.user_id)
          .maybeSingle();
        
        if (byEmail) {
          employeeData = byEmail;
        } else {
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
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch pending finance approval requests
      const { data: withdrawalData, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending_finance')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch failed payouts (approved but payout failed)
      const { data: failedData, error: failedError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'approved')
        .eq('channel', 'MOBILE_MONEY')
        .in('payout_status', ['failed', 'processing'])
        .order('payout_attempted_at', { ascending: false })
        .limit(20);

      if (failedError) console.error('Error fetching failed payouts:', failedError);

      const enrichedRequests = await enrichWithEmployeeData(withdrawalData || []);
      const enrichedFailed = await enrichWithEmployeeData(failedData || []);

      setRequests(enrichedRequests);
      setFailedPayouts(enrichedFailed);
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

    const channel = supabase
      .channel('withdrawal-finance-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        () => {
          console.log('Withdrawal request changed, refreshing...');
          fetchRequests();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchRequests();
    }, 30000); // 30s polling - not too aggressive

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const attemptPayout = async (request: WithdrawalRequest): Promise<{ success: boolean; ref: string; error?: string }> => {
    const phoneToNotify = request.disbursement_phone || request.phone_number || request.employee_phone;
    if (!phoneToNotify) return { success: false, ref: '', error: 'No phone number available' };

    let payoutPhone = phoneToNotify.replace(/\D/g, '');
    if (payoutPhone.startsWith('0')) payoutPhone = '256' + payoutPhone.slice(1);
    if (!payoutPhone.startsWith('256')) payoutPhone = '256' + payoutPhone;

    // Single attempt only — no retries to avoid rate limiting and duplicate charges
    try {
      console.log(`GosentePay payout: ${payoutPhone}, UGX ${request.amount}`);
      const { data: payoutData, error: payoutError } = await supabase.functions.invoke('gosentepay-payout', {
        body: {
          phone: payoutPhone,
          amount: request.amount,
          ref: request.request_ref || `WD-${request.id.slice(0, 8)}`,
          employeeName: request.employee_name
        }
      });

      if (payoutError) {
        return { success: false, ref: '', error: payoutError.message || 'Edge function error' };
      }
      
      if (payoutData?.status === 'success') {
        return { success: true, ref: payoutData.ref || request.request_ref };
      }
      
      return { success: false, ref: '', error: payoutData?.message || payoutData?.details?.data?.message || 'Transfer rejected by provider' };
    } catch (payoutErr: any) {
      return { success: false, ref: '', error: payoutErr.message || 'Unknown error' };
    }
  };

  const handleRetryPayout = async (request: WithdrawalRequest) => {
    setRetrying(request.id);
    try {
      // Mark as processing
      await supabase.from('withdrawal_requests').update({
        payout_status: 'processing',
        payout_attempted_at: new Date().toISOString(),
        payout_error: null
      }).eq('id', request.id);

      const result = await attemptPayout(request);

      if (result.success) {
        await supabase.from('withdrawal_requests').update({
          payout_status: 'sent',
          payout_ref: result.ref,
          payout_attempted_at: new Date().toISOString(),
          payout_error: null
        }).eq('id', request.id);

        // Deduct from tracked GosentePay balance
        const { data: currentBal } = await supabase
          .from('gosentepay_balance')
          .select('balance')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (currentBal) {
          const newBal = currentBal.balance - request.amount;
          await supabase.from('gosentepay_balance').update({
            balance: newBal,
            last_updated_by: employee?.name || 'Finance',
            last_transaction_ref: result.ref,
            last_transaction_type: 'payout_deduction',
            updated_at: new Date().toISOString()
          }).order('updated_at', { ascending: false }).limit(1);

          await supabase.from('gosentepay_balance_log').insert({
            previous_balance: currentBal.balance,
            new_balance: newBal,
            change_amount: -request.amount,
            change_type: 'payout_deduction',
            reference: result.ref,
            notes: `Retry payout to ${request.phone_number}`,
            created_by: employee?.name || 'Finance'
          });
        }

        toast({
          title: "Payout Sent!",
          description: `UGX ${request.amount.toLocaleString()} sent to ${request.phone_number}. Ref: ${result.ref}`,
        });
      } else {
        await supabase.from('withdrawal_requests').update({
          payout_status: 'failed',
          payout_error: result.error || 'Transfer failed',
          payout_attempted_at: new Date().toISOString()
        }).eq('id', request.id);

        toast({
          title: "Payout Failed Again",
          description: result.error || 'GosentePay rejected the transfer. Check provider balance.',
          variant: "destructive"
        });
      }

      fetchRequests();
    } catch (err: any) {
      console.error('Retry payout error:', err);
      // CRITICAL: Always reset to 'failed' if exception occurs, never leave as 'processing'
      await supabase.from('withdrawal_requests').update({
        payout_status: 'failed',
        payout_error: err?.message || 'Exception during retry',
        payout_attempted_at: new Date().toISOString()
      }).eq('id', request.id);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      fetchRequests();
    } finally {
      setRetrying(null);
    }
  };

  const handlePayCashInstead = async () => {
    if (!cashRequest) return;
    setProcessing(cashRequest.id);
    try {
      const financeName = employee?.name || employee?.email || 'Finance';
      const now = new Date().toISOString();
      
      // Update ALL relevant fields so the database accurately reflects cash disbursement
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'disbursed',              // Mark as fully disbursed
          channel: 'CASH',                   // Changed from MOBILE_MONEY to CASH
          payout_status: 'cash_paid',        // Clear status showing cash was given
          payout_error: null,                // Clear any previous errors
          payout_ref: cashVoucher ? `CASH-${cashVoucher}` : `CASH-${Date.now()}`,
          payment_voucher: cashVoucher || null,
          processed_at: now,                 // When money was actually handed out
          payout_attempted_at: now,
          updated_at: now
        })
        .eq('id', cashRequest.id);

      if (error) throw error;

      // Send SMS notification to employee
      const phoneToNotify = cashRequest.disbursement_phone || cashRequest.phone_number || cashRequest.employee_phone;
      if (phoneToNotify) {
        const voucherInfo = cashVoucher ? ` Voucher: ${cashVoucher}.` : '';
        const message = `Dear ${cashRequest.employee_name}, your withdrawal of UGX ${cashRequest.amount.toLocaleString()} has been PAID in CASH at the Finance office.${voucherInfo} Ref: ${cashRequest.request_ref}. Great Pearl Coffee.`;
        try {
          await supabase.functions.invoke('send-sms', {
            body: { phone: phoneToNotify, message }
          });
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
        }
      }

      toast({
        title: "Cash Payment Completed",
        description: `UGX ${cashRequest.amount.toLocaleString()} paid in cash to ${cashRequest.employee_name}. Record updated.`,
      });

      setShowPayCashDialog(false);
      setCashRequest(null);
      setCashVoucher('');
      fetchRequests();
    } catch (error: any) {
      console.error('Pay cash error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process cash payment",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
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
      const requiresThree = selectedRequest.requires_three_approvals;
      const updateData: any = {
        finance_approved_at: new Date().toISOString(),
        finance_approved_by: employee?.name || employee?.email || 'Finance',
        updated_at: new Date().toISOString(),
        // Finance is the first step - move to admin approval queue
        status: 'pending_approval',
      };

      if (paymentVoucher) {
        updateData.payment_voucher = paymentVoucher;
      }

      const { error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Send SMS to employee's SYSTEM phone
      let smsPhone = selectedRequest.employee_phone || selectedRequest.phone_number;
      if (selectedRequest.user_id) {
        const { data: emp } = await supabase
          .from('employees')
          .select('phone')
          .or(`auth_user_id.eq.${selectedRequest.user_id},email.eq.${selectedRequest.employee_email || ''}`)
          .maybeSingle();
        if (emp?.phone) smsPhone = emp.phone;
      }

      if (smsPhone) {
        const message = `Dear ${selectedRequest.employee_name}, your withdrawal of UGX ${selectedRequest.amount.toLocaleString()} has been approved by Finance and is now pending final Admin approval. Ref: ${selectedRequest.request_ref}. Great Pearl Coffee.`;
        try {
          await supabase.functions.invoke('send-sms', {
            body: { phone: smsPhone, message }
          });
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
        }
      }

      toast({
        title: "Finance Approved",
        description: `UGX ${selectedRequest.amount.toLocaleString()} approved by Finance. Now awaiting final Admin approval.`,
      });

      setShowApproveDialog(false);
      setPaymentVoucher('');
      fetchRequests();
    } catch (error: any) {
      console.error('Approval error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process approval",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;
    setProcessing(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      const phoneToNotify = selectedRequest.phone_number || selectedRequest.employee_phone;
      if (phoneToNotify) {
        const message = `Dear ${selectedRequest.employee_name}, your withdrawal of UGX ${selectedRequest.amount.toLocaleString()} has been REJECTED. Reason: ${rejectionReason}. Ref: ${selectedRequest.request_ref}. Great Pearl Coffee.`;
        try {
          await supabase.functions.invoke('send-sms', {
            body: { phone: phoneToNotify, message }
          });
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
        }
      }

      toast({
        title: "Withdrawal Rejected",
        description: `Withdrawal request from ${selectedRequest.employee_name} has been rejected.`,
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const openApproveDialog = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
    setPaymentVoucher('');
  };

  const openRejectDialog = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
    setRejectionReason('');
  };

  const printPaymentSlip = (request: WithdrawalRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head><title>Payment Slip - ${request.request_ref}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 4px 0; color: #666; font-size: 12px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .signatures { display: flex; justify-content: space-between; margin-top: 48px; }
        .signature-box { width: 45%; text-align: center; }
        .signature-line { border-top: 1px solid #333; padding-top: 8px; margin-top: 48px; font-size: 12px; }
        .muted { color: #999; font-size: 11px; }
      </style>
      </head>
      <body onload="window.print()">
        <div>
          <div class="header">
            <h1>GREAT PEARL COFFEE</h1>
            <p>PAYMENT SLIP</p>
            <p>Ref: ${request.request_ref}</p>
          </div>
          
          <div class="row"><div>Employee Name</div><div><strong>${request.employee_name}</strong></div></div>
          <div class="row"><div>Amount</div><div><strong>UGX ${request.amount.toLocaleString()}</strong></div></div>
          <div class="row"><div>Payment Method</div><div><strong>${request.channel === 'CASH' ? 'CASH' : 'MOBILE MONEY'}</strong></div></div>
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

  const getPayoutStatusBadge = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
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
    <div className="space-y-6">
      {/* Failed Payouts Section - Show prominently at top */}
      {failedPayouts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Failed Payouts — Action Required ({failedPayouts.length})
          </h2>
          <div className="space-y-3">
            {failedPayouts.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{request.employee_name}</h3>
                        {getPayoutStatusBadge(request.payout_status)}
                      </div>
                      <p className="text-sm text-muted-foreground">Ref: {request.request_ref}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-700">UGX {request.amount.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Error details */}
                  <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 p-3 rounded-lg mb-3">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                      Payout Error:
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {request.payout_error || 'Transfer rejected by provider (likely insufficient GosentePay balance)'}
                    </p>
                    {request.payout_attempted_at && (
                      <p className="text-xs text-red-500 mt-1">
                        Last attempted: {format(new Date(request.payout_attempted_at), 'dd MMM yyyy, HH:mm:ss')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{request.disbursement_phone || request.phone_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Approved By</p>
                      <p className="font-medium">{request.finance_approved_by || 'Finance'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Approved At</p>
                      <p className="font-medium">{request.finance_approved_at ? format(new Date(request.finance_approved_at), 'dd MMM HH:mm') : '-'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleRetryPayout(request)}
                      disabled={retrying === request.id || processing === request.id}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {retrying === request.id ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Retrying...</>
                      ) : (
                        <><RotateCcw className="h-4 w-4 mr-1" />Retry Payout</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCashRequest(request);
                        setCashVoucher('');
                        setShowPayCashDialog(true);
                      }}
                      disabled={retrying === request.id || processing === request.id}
                      className="border-amber-500 text-amber-700 hover:bg-amber-50"
                    >
                      <Banknote className="h-4 w-4 mr-1" />
                      Pay Cash Instead
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => printPaymentSlip(request)}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print Slip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Finance Approval Section */}
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

        {requests.length === 0 && failedPayouts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">All Clear!</h3>
              <p className="text-muted-foreground">No pending withdrawal requests to process.</p>
            </CardContent>
          </Card>
        ) : requests.length === 0 ? null : (
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
                    <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">Admin Approvals Complete</p>
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
                      <p className="text-xs text-green-600 mt-1">High-value withdrawal - required 3 admin approvals</p>
                    )}
                  </div>

                  <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Finance Caution:</strong> By approving, UGX {request.amount.toLocaleString()} will be deducted from the employee's wallet balance.
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
      </div>

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
                    {selectedRequest.channel === 'CASH' ? 'Cash' : 'Mobile Money'}
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

      {/* Pay Cash Instead Dialog */}
      <Dialog open={showPayCashDialog} onOpenChange={setShowPayCashDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-600" />
              Switch to Cash Payment
            </DialogTitle>
          </DialogHeader>
          
          {cashRequest && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                  <strong>Mobile Money payout failed.</strong> You are switching this withdrawal to cash payment. The employee will be notified via SMS to collect cash from the Finance office.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-medium">{cashRequest.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-lg">UGX {cashRequest.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Channel:</span>
                  <span className="font-medium line-through text-red-500">Mobile Money</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Channel:</span>
                  <span className="font-medium text-amber-700">Cash</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-medium">{cashRequest.request_ref}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cash-voucher">Payment Voucher Number (Optional)</Label>
                <Input
                  id="cash-voucher"
                  placeholder="e.g., PV-2024-001"
                  value={cashVoucher}
                  onChange={(e) => setCashVoucher(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Cash Payment:</strong> Ensure you verify the employee's identity before handing over cash. Get their signature on the payment slip.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPayCashDialog(false); setCashRequest(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={handlePayCashInstead} 
              disabled={processing !== null}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {processing ? 'Processing...' : 'Confirm Cash Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
