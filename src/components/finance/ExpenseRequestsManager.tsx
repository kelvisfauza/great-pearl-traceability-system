import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { AlertCircle, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ExpenseRequestsManagerProps {
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason: string) => void;
}

const ExpenseRequestsManager: React.FC<ExpenseRequestsManagerProps> = ({ 
  onApprove, 
  onReject 
}) => {
  const { requests, loading, updateRequestStatus } = useApprovalRequests();

  const expenseRequests = requests.filter(request => request.type === 'Expense Request');

  const handleApprove = async (requestId: string) => {
    const success = await updateRequestStatus(requestId, 'Approved');
    if (success) {
      toast({
        title: "Expense Approved",
        description: "Expense request has been approved successfully"
      });
      onApprove?.(requestId);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;
    
    const success = await updateRequestStatus(requestId, 'Rejected', reason);
    if (success) {
      toast({
        title: "Expense Rejected", 
        description: "Expense request has been rejected"
      });
      onReject?.(requestId, reason);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
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
            <DollarSign className="h-5 w-5" />
            Expense Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading expense requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Expense Requests Review
          </CardTitle>
          <CardDescription>
            Review and approve employee expense requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-yellow-700">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-900">
                {expenseRequests.filter(r => r.status === 'Pending').length}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700">Total Amount</p>
              <p className="text-2xl font-bold text-blue-900">
                UGX {expenseRequests
                  .filter(r => r.status === 'Pending')
                  .reduce((sum, r) => sum + parseFloat(r.amount), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-700">This Month</p>
              <p className="text-2xl font-bold text-green-900">
                {expenseRequests.filter(r => {
                  const requestDate = new Date(r.created_at);
                  const now = new Date();
                  return requestDate.getMonth() === now.getMonth() && 
                         requestDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {expenseRequests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No expense requests to review</p>
              </div>
            ) : (
              expenseRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{request.title}</h3>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(request.status)}
                            <Badge variant={getStatusBadgeVariant(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3">{request.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{request.requestedby}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>UGX {parseFloat(request.amount).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(request.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            <span>{request.priority}</span>
                          </div>
                        </div>

                        {request.details?.expenseCategory && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div>
                                <strong>Category:</strong> {request.details.expenseCategory}
                              </div>
                              <div>
                                <strong>Department:</strong> {request.details.department}
                              </div>
                            </div>
                            {request.details.reason && (
                              <div className="mt-2">
                                <strong>Business Reason:</strong>
                                <p className="text-muted-foreground">{request.details.reason}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {request.status === 'Pending' && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          className="flex-1"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id)}
                          variant="destructive"
                          className="flex-1" 
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
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
    </div>
  );
};

export default ExpenseRequestsManager;