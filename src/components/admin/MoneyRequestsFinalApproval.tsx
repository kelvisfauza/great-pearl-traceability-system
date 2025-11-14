import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Calendar, User, CheckCircle, XCircle, FileText, Eye, Download, Clock, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSeparationOfDuties } from '@/hooks/useSeparationOfDuties';
import { useSMSNotifications } from '@/hooks/useSMSNotifications';
import { RejectionModal } from '@/components/workflow/RejectionModal';

interface MoneyRequest {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  request_type: string;
  status: string;
  approval_stage: string;
  finance_approved_at: string | null;
  finance_approved_by: string | null;
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  created_at: string;
  requested_by: string;
  payment_slip_number: string | null;
  payment_slip_generated: boolean;
}

const MoneyRequestsFinalApproval = () => {
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MoneyRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPaymentSlip, setShowPaymentSlip] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);
  const { employee } = useAuth();
  const { toast } = useToast();
  const { checkMoneyRequestEligibility, showSoDViolationWarning } = useSeparationOfDuties();
  const { sendApprovalRequestSMS } = useSMSNotifications();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('money_requests')
        .select('*')
        .eq('approval_stage', 'finance_approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching money requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch money requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalApproval = async (requestId: string, approve: boolean, rejectionReason?: string, rejectionComments?: string) => {
    try {
      // ⚠️ CRITICAL: Check Separation of Duties before approving
      if (approve) {
        const sodCheck = await checkMoneyRequestEligibility(requestId);
        
        if (!sodCheck.canApprove) {
          showSoDViolationWarning(sodCheck.reason || 'Approval blocked by Separation of Duties policy');
          return;
        }
      }

      const updateData: any = {
        admin_approved_by: employee?.name || 'Administrator',
        updated_at: new Date().toISOString()
      };

      if (approve) {
        updateData.admin_approved_at = new Date().toISOString();
        updateData.status = 'approved';
        updateData.approval_stage = 'completed';
      } else {
        updateData.status = 'rejected';
        updateData.rejection_reason = rejectionReason || 'Rejected by Administrator';
        if (rejectionComments) {
          updateData.rejection_comments = rejectionComments;
        }
      }

      const { data, error } = await supabase
        .from('money_requests')
        .update(updateData)
        .eq('id', requestId)
        .select();

      if (error) throw error;

      // Show immediate feedback
      toast({
        title: approve ? "✓ Request Approved" : "Request Rejected",
        description: approve 
          ? "Final approval granted. Payment can now be processed."
          : "Request has been rejected.",
        variant: approve ? "default" : "destructive"
      });

      // Refresh list immediately
      setShowDetails(false);
      await fetchRequests();

      // Send SMS notification in background (non-blocking)
      if (data && data.length > 0) {
        const request = data[0];
        
        // Fire and forget - don't block the UI
        (async () => {
          try {
            const { data: requesterData } = await supabase
              .from('employees')
              .select('name, phone')
              .eq('auth_user_id', request.user_id)
              .single();
            
            if (requesterData?.phone) {
              const message = approve
                ? `Dear ${requesterData.name}, your money request of UGX ${request.amount.toLocaleString()} has been APPROVED by Admin. Payment will be processed shortly.`
                : `Dear ${requesterData.name}, your money request of UGX ${request.amount.toLocaleString()} has been rejected by Admin.`;
              
              await supabase.functions.invoke('send-sms', {
                body: {
                  phone: requesterData.phone,
                  message,
                  userName: requesterData.name,
                  messageType: approve ? 'money_request_final_approval' : 'money_request_rejection'
                }
              });
            }
          } catch (err) {
            console.error('Background SMS error:', err);
          }
        })();
      }
    } catch (error: any) {
      console.error('Error processing final approval:', error);
      toast({
        title: "Error",
        description: "Failed to process final approval",
        variant: "destructive"
      });
    }
  };

  const handleRejectClick = (requestId: string) => {
    setRequestToReject(requestId);
    setRejectionModalOpen(true);
  };

  const handleConfirmRejection = async (reason: string, comments?: string) => {
    if (!requestToReject) return;
    
    await handleFinalApproval(requestToReject, false, reason, comments);
    setRejectionModalOpen(false);
    setRequestToReject(null);
  };

  const generatePaymentSlip = (request: MoneyRequest) => {
    const slipContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">PAYMENT SLIP</h1>
          <p style="margin: 5px 0; color: #666;">Company Finance Department</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Payment Details</h3>
          <p><strong>Slip Number:</strong> ${request.payment_slip_number}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Recipient Information</h3>
          <p><strong>Name:</strong> ${request.requested_by}</p>
          <p><strong>Request Type:</strong> ${request.request_type}</p>
          <p><strong>Reason:</strong> ${request.reason}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Payment Information</h3>
          <p><strong>Amount:</strong> UGX ${request.amount.toLocaleString()}</p>
          <p><strong>Payment Method:</strong> Bank Transfer</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">Approval Chain</h3>
          <p><strong>Finance Approved By:</strong> ${request.finance_approved_by}</p>
          <p><strong>Finance Approval Date:</strong> ${new Date(request.finance_approved_at!).toLocaleString()}</p>
          <p><strong>Final Approved By:</strong> ${request.admin_approved_by}</p>
          <p><strong>Final Approval Date:</strong> ${new Date(request.admin_approved_at!).toLocaleString()}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc;">
          <p style="margin: 0; color: #666; font-size: 12px;">This is an official payment slip. Please retain for your records.</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Payment Slip - ${request.payment_slip_number}</title></head>
          <body>${slipContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Loading requests for final approval...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Separation of Duties Policy:</strong> You cannot approve requests that you have already approved at the Finance stage. The system will automatically prevent duplicate approvals to maintain security and accountability.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Money Requests - Final Admin Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No money requests pending final approval
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{request.request_type}</h3>
                        <Badge className="bg-blue-100 text-blue-800">Finance Approved</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{request.reason}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{request.requested_by}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-green-600">UGX {request.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">Ready for Final Approval</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectClick(request.id)}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleFinalApproval(request.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Final Approve
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    ✓ Finance approved by {request.finance_approved_by} on {new Date(request.finance_approved_at!).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Money Request - Final Approval</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Request Type</label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.request_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm font-semibold text-green-600">UGX {selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Requested By</label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.requested_by}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date Requested</label>
                  <p className="text-sm text-muted-foreground">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Reason</label>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{selectedRequest.reason}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Approval History</label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2 p-2 rounded bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      Finance: Approved by {selectedRequest.finance_approved_by} on {new Date(selectedRequest.finance_approved_at!).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 rounded bg-yellow-50">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">Admin: Pending Final Approval</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleRejectClick(selectedRequest.id)}
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject Request
                </Button>
                <Button
                  onClick={() => handleFinalApproval(selectedRequest.id, true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve & Process Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setRequestToReject(null);
        }}
        onConfirm={handleConfirmRejection}
        title="Reject Salary Request"
        description="Please select a reason for rejecting this salary request and provide any additional comments."
      />
    </div>
  );
};

export default MoneyRequestsFinalApproval;