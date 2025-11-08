import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Calendar, User, Clock, CheckCircle, XCircle, FileText, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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

const MoneyRequestsManager = () => {
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MoneyRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);
  const { employee } = useAuth();
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('money_requests')
        .select('*')
        .eq('approval_stage', 'pending_finance')
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

  const handleFinanceApproval = async (requestId: string, approve: boolean, rejectionReason?: string) => {
    try {
      const updateData: any = {
        finance_approved_by: employee?.name || 'Finance Department',
        updated_at: new Date().toISOString()
      };

      if (approve) {
        updateData.finance_approved_at = new Date().toISOString();
        updateData.approval_stage = 'finance_approved';
        
        toast({
          title: "Request Approved",
          description: "Money request approved and sent to Admin for final approval",
        });
      } else {
        updateData.status = 'rejected';
        updateData.rejection_reason = rejectionReason || 'Rejected by Finance Department';
        
        toast({
          title: "Request Rejected",
          description: "Money request has been rejected",
        });
      }

      const { error } = await supabase
        .from('money_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      fetchRequests();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
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
    
    const fullReason = comments ? `${reason}\n\nComments: ${comments}` : reason;
    await handleFinanceApproval(requestToReject, false, fullReason);
    
    setRejectionModalOpen(false);
    setRequestToReject(null);
  };

  const getStatusBadge = (request: MoneyRequest) => {
    if (request.approval_stage === 'pending_finance') {
      return <Badge variant="secondary">Pending Finance Review</Badge>;
    } else if (request.approval_stage === 'finance_approved') {
      return <Badge className="bg-blue-100 text-blue-800">Awaiting Admin Approval</Badge>;
    }
    return <Badge variant="outline">{request.status}</Badge>;
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Loading money requests...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Money Requests - Finance Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No money requests pending finance review
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{request.request_type}</h3>
                        {getStatusBadge(request)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{request.reason}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{request.requested_by}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">UGX {request.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{request.approval_stage.replace('_', ' ')}</span>
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
                      
                      {request.approval_stage === 'pending_finance' && (
                        <>
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
                            onClick={() => handleFinanceApproval(request.id, true)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {request.finance_approved_at && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✓ Finance approved by {request.finance_approved_by} on {new Date(request.finance_approved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Money Request Details</DialogTitle>
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
                  <p className="text-sm font-semibold">UGX {selectedRequest.amount.toLocaleString()}</p>
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
                <label className="text-sm font-medium">Approval Status</label>
                <div className="space-y-2 mt-2">
                  <div className={`flex items-center gap-2 p-2 rounded ${selectedRequest.finance_approved_at ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    {selectedRequest.finance_approved_at ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm">
                      Finance: {selectedRequest.finance_approved_at 
                        ? `Approved by ${selectedRequest.finance_approved_by}` 
                        : 'Pending Review'}
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-2 p-2 rounded ${selectedRequest.admin_approved_at ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {selectedRequest.admin_approved_at ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm">
                      Admin: {selectedRequest.admin_approved_at 
                        ? `Approved by ${selectedRequest.admin_approved_by}` 
                        : 'Awaiting Finance Approval'}
                    </span>
                  </div>
                </div>
              </div>
              
              {selectedRequest.payment_slip_number && (
                <div>
                  <label className="text-sm font-medium">Payment Slip</label>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{selectedRequest.payment_slip_number}</p>
                </div>
              )}
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
        title="Reject Money Request"
        description="Please select a reason for rejecting this money request and provide any additional comments."
      />
    </div>
  );
};

export default MoneyRequestsManager;