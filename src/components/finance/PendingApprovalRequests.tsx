import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Calendar, 
  User, 
  Eye,
  Clock,
  FileText
} from 'lucide-react';
import { useFinanceApprovals } from '@/hooks/useFinanceApprovals';
import { RejectionModal } from '@/components/workflow/RejectionModal';

const PendingApprovalRequests = () => {
  const { requests, loading, handleFinanceApproval } = useFinanceApprovals();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    await handleFinanceApproval(requestId, true);
    setProcessing(null);
  };

  const handleRejectClick = (requestId: string) => {
    setRequestToReject(requestId);
    setRejectionModalOpen(true);
  };

  const handleConfirmRejection = async (reason: string, comments?: string) => {
    if (!requestToReject) return;
    
    setProcessing(requestToReject);
    await handleFinanceApproval(requestToReject, false, reason, comments);
    setProcessing(null);
    setRequestToReject(null);
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      'Expense': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Salary Payment': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'Money Request': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'Requisition': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading approval requests...</p>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Finance Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No requests pending finance approval</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pending Finance Approval</span>
            <Badge variant="outline" className="ml-2">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <Badge className={getTypeColor(request.type)}>
                          {request.type}
                        </Badge>
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {request.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Requested By</p>
                        <p className="font-medium">
                          {request.requestedby_name || request.requestedby}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium">{request.daterequested}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-medium">
                          UGX {request.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Admin Approved By</p>
                        <p className="font-medium text-xs">
                          {request.admin_approved_by || 'Admin'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(request)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectClick(request.id)}
                      disabled={processing === request.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {processing === request.id ? 'Processing...' : 'Approve'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-sm">{selectedRequest.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <p className="text-sm">{selectedRequest.priority}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-sm">UGX {selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-sm">{selectedRequest.department}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Requested By</p>
                  <p className="text-sm">
                    {selectedRequest.requestedby_name || selectedRequest.requestedby}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Requested</p>
                  <p className="text-sm">{selectedRequest.daterequested}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin Approved By</p>
                  <p className="text-sm">{selectedRequest.admin_approved_by}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin Approved At</p>
                  <p className="text-sm">
                    {selectedRequest.admin_approved_at
                      ? new Date(selectedRequest.admin_approved_at).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>
              {selectedRequest.details && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Additional Details
                  </p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(
                      typeof selectedRequest.details === 'string'
                        ? JSON.parse(selectedRequest.details)
                        : selectedRequest.details,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
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
        onConfirm={handleConfirmRejection}
        title="Reject Finance Approval"
        description="Please provide a reason for rejecting this request."
      />
    </>
  );
};

export default PendingApprovalRequests;
