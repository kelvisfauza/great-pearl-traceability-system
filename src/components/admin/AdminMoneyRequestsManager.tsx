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
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  created_at: string;
  requested_by: string;
}

const AdminMoneyRequestsManager = () => {
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
        .eq('approval_stage', 'pending_admin')
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

  useEffect(() => {
    fetchRequests();

    // Subscribe to changes
    const channel = supabase
      .channel('admin_money_requests')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'money_requests', filter: 'approval_stage=eq.pending_admin' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAdminApproval = async (requestId: string, approve: boolean, rejectionReason?: string) => {
    try {
      const updateData: any = {
        admin_approved_by: employee?.name || 'Admin',
        admin_approved: approve,
        updated_at: new Date().toISOString()
      };

      if (approve) {
        updateData.admin_approved_at = new Date().toISOString();
        updateData.approval_stage = 'pending_finance'; // Move to finance for final approval
        updateData.status = 'pending';
      } else {
        updateData.status = 'rejected';
        updateData.approval_stage = 'rejected';
        updateData.rejection_reason = rejectionReason || 'Rejected by Admin';
      }

      const { error } = await supabase
        .from('money_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: approve ? "Request Approved" : "Request Rejected",
        description: approve 
          ? "Request moved to Finance for final approval" 
          : "Request has been rejected"
      });

      fetchRequests();
      setShowDetails(false);
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin mr-2" />
            <span>Loading money requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Admin Money Requests ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No money requests pending admin approval</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50">
                          {request.request_type}
                        </Badge>
                        <Badge variant="secondary">Pending Admin</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.requested_by}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-lg">{formatCurrency(request.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Reason:</span> {request.reason}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Money Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Request Type</p>
                  <p className="font-medium">{selectedRequest.request_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">{formatCurrency(selectedRequest.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested By</p>
                  <p className="font-medium">{selectedRequest.requested_by}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date Requested</p>
                  <p className="font-medium">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Reason</p>
                <p className="font-medium bg-muted p-3 rounded-md">{selectedRequest.reason}</p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleAdminApproval(selectedRequest.id, true)}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Send to Finance
                </Button>
                <Button
                  onClick={() => {
                    setRequestToReject(selectedRequest.id);
                    setRejectionModalOpen(true);
                  }}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setRequestToReject(null);
        }}
        onConfirm={(reason, comments) => {
          if (requestToReject) {
            handleAdminApproval(requestToReject, false, reason);
          }
          setRejectionModalOpen(false);
          setRequestToReject(null);
        }}
        title="Reject Money Request"
        description="Please provide a reason for rejecting this money request."
      />
    </>
  );
};

export default AdminMoneyRequestsManager;
