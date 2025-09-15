import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { AlertCircle, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RejectionModal } from '@/components/workflow/RejectionModal';

interface AdminExpenseRequestsManagerProps {
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason: string) => void;
}

const AdminExpenseRequestsManager: React.FC<AdminExpenseRequestsManagerProps> = ({ 
  onApprove, 
  onReject 
}) => {
  const { requests, loading, updateRequestStatus } = useApprovalRequests();
  const [rejectionModalOpen, setRejectionModalOpen] = React.useState(false);
  const [selectedRequestId, setSelectedRequestId] = React.useState<string>('');
  const [selectedRequestTitle, setSelectedRequestTitle] = React.useState<string>('');

  const expenseRequests = requests.filter(request => request.type === 'Expense Request');

  const handleApprove = async (requestId: string) => {
    const success = await updateRequestStatus(requestId, 'Approved', undefined, undefined, 'admin', 'Admin Team');
    if (success) {
      toast({
        title: "Admin Approval Recorded",
        description: "Expense request approved by Admin. Checking for full approval..."
      });
      onApprove?.(requestId);
    }
  };

  const handleReject = (requestId: string, requestTitle: string) => {
    setSelectedRequestId(requestId);
    setSelectedRequestTitle(requestTitle);
    setRejectionModalOpen(true);
  };

  const confirmRejection = async (reason: string, comments?: string) => {
    const success = await updateRequestStatus(
      selectedRequestId, 
      'Rejected', 
      reason, 
      comments, 
      'admin', 
      'Admin Team'
    );
    
    if (success) {
      toast({
        title: "Expense Rejected", 
        description: "Expense request has been rejected by Admin"
      });
      onReject?.(selectedRequestId, reason);
    }
    
    setRejectionModalOpen(false);
    setSelectedRequestId('');
    setSelectedRequestTitle('');
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'finance approved':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'admin approved':
        return <Clock className="h-4 w-4 text-purple-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'finance approved':
        return 'secondary';
      case 'admin approved':
        return 'secondary';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Expense Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter requests that need admin review or have been processed by admin
  const needsReviewCount = expenseRequests.filter(r => 
    (r.status === 'Pending' || r.status === 'Finance Approved') && !r.admin_approved_at
  ).length;
  
  const totalAmount = expenseRequests.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const fullyApprovedCount = expenseRequests.filter(r => r.status === 'Approved').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Expense Review
          </CardTitle>
          <CardDescription>
            Review and approve expense requests that have passed initial finance review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Needs Admin Review</p>
              <p className="text-2xl font-bold text-yellow-800">{needsReviewCount}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Amount</p>
              <p className="text-2xl font-bold text-blue-800">UGX {totalAmount.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Fully Approved</p>
              <p className="text-2xl font-bold text-green-800">{fullyApprovedCount}</p>
            </div>
          </div>

          <div className="space-y-4">
            {expenseRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No expense requests to review</p>
              </div>
            ) : (
              expenseRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-purple-400">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <p className="text-muted-foreground">{request.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">UGX {parseFloat(request.amount).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{request.requestedby}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(request.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{request.priority}</span>
                      </div>
                    </div>

                    {/* Approval Status Tracking */}
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Approval Progress:</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          {request.finance_approved_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className={`text-sm ${request.finance_approved_at ? 'text-green-700' : 'text-yellow-700'}`}>
                            Finance: {request.finance_approved_at ? 'Approved' : 'Pending'}
                          </span>
                          {request.finance_approved_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(request.finance_approved_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {request.admin_approved_at ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className={`text-sm ${request.admin_approved_at ? 'text-green-700' : 'text-yellow-700'}`}>
                            Admin: {request.admin_approved_at ? 'Approved' : 'Pending'}
                          </span>
                          {request.admin_approved_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(request.admin_approved_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Only show for requests that need admin approval */}
                    {(request.status === 'Pending' || request.status === 'Finance Approved') && !request.admin_approved_at && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          className="flex-1"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Admin Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id, request.title)}
                          variant="destructive"
                          className="flex-1" 
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {/* Status messages */}
                    {request.admin_approved_at && !request.finance_approved_at && (
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-purple-700 font-medium">
                          ✓ Admin Approved - Awaiting Finance Approval
                        </p>
                      </div>
                    )}

                    {request.status === 'Approved' && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 font-medium">
                          ✓ Fully Approved by Both Finance and Admin
                        </p>
                      </div>
                    )}

                    {request.rejection_reason && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <strong className="text-red-700">Rejection Reason:</strong>
                        <p className="text-red-600">{request.rejection_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setSelectedRequestId('');
          setSelectedRequestTitle('');
        }}
        onConfirm={confirmRejection}
        title={`Reject Expense Request`}
        description={`Please provide a reason for rejecting "${selectedRequestTitle}"`}
      />
    </div>
  );
};

export default AdminExpenseRequestsManager;