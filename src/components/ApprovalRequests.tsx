
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Clock, User, Calendar, DollarSign, Eye } from 'lucide-react';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { useToast } from '@/hooks/use-toast';
import { RejectionModal } from './workflow/RejectionModal';
import { WorkflowTracker } from './workflow/WorkflowTracker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ApprovalRequests = () => {
  const { requests, loading, updateRequestStatus, fetchRequests } = useApprovalRequests();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleApproval = async (id: string) => {
    setProcessingId(id);
    try {
      const success = await updateRequestStatus(id, 'Approved');
      if (success) {
        toast({
          title: "Request Approved",
          description: "The approval request has been approved successfully.",
        });
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: 'Error',
        description: 'Failed to process the approval request.',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejection = (id: string) => {
    setSelectedRequestId(id);
    setRejectionModalOpen(true);
  };

  const handleRejectionConfirm = async (reason: string, comments?: string) => {
    if (!selectedRequestId) return;
    
    setProcessingId(selectedRequestId);
    try {
      const success = await updateRequestStatus(selectedRequestId, 'Rejected', reason, comments);
      if (success) {
        toast({
          title: "Request Rejected",
          description: "The approval request has been rejected and sent back for modification.",
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error processing rejection:', error);
      toast({
        title: 'Error',
        description: 'Failed to process the rejection.',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
      setSelectedRequestId(null);
    }
  };

  const handleViewWorkflow = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setWorkflowModalOpen(true);
  };

  const handleRefresh = async () => {
    await fetchRequests();
    toast({
      title: "Refreshed",
      description: "Approval requests have been refreshed"
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: string | number) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
    
    if (isNaN(numericAmount)) {
      return amount;
    }
    
    return `UGX ${numericAmount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Approval Requests</h2>
          <p className="text-muted-foreground">
            Review and approve pending requests from various departments
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
            <p className="text-muted-foreground">All approval requests have been processed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="transition-all hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <CardDescription>{request.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(request.priority)}>
                      {request.priority}
                    </Badge>
                    {request.details?.paymentId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewWorkflow(request.details?.paymentId || '')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Workflow
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{request.requestedby}</p>
                      <p className="text-xs text-muted-foreground">{request.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{request.daterequested}</p>
                      <p className="text-xs text-muted-foreground">Requested</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{formatAmount(request.amount)}</p>
                      <p className="text-xs text-muted-foreground">Amount</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{request.type}</p>
                      <p className="text-xs text-muted-foreground">Type</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleApproval(request.id)}
                    disabled={processingId === request.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleRejection(request.id)}
                    disabled={processingId === request.id}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  {processingId === request.id && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Processing...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setSelectedRequestId(null);
        }}
        onConfirm={handleRejectionConfirm}
        title="Reject Approval Request"
        description="Please provide a reason for rejecting this request. This will help the requesting department understand what needs to be modified."
      />

      <Dialog open={workflowModalOpen} onOpenChange={setWorkflowModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Workflow History</DialogTitle>
          </DialogHeader>
          {selectedPaymentId && (
            <WorkflowTracker paymentId={selectedPaymentId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalRequests;
