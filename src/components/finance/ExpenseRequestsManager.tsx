import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { useRiskAssessment } from '@/hooks/useRiskAssessment';
import { AlertCircle, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText, TrendingUp, Shield, Phone, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RejectionModal } from '@/components/workflow/RejectionModal';

interface ExpenseRequestsManagerProps {
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason: string) => void;
}

export const ExpenseRequestsManager: React.FC<ExpenseRequestsManagerProps> = ({ onApprove, onReject }) => {
  const { requests, loading, updateRequestStatus } = useApprovalRequests();
  const { assessExpenseRisk } = useRiskAssessment();
  const [rejectionModalOpen, setRejectionModalOpen] = React.useState(false);
  const [selectedRequestId, setSelectedRequestId] = React.useState<string>('');
  const [selectedRequestTitle, setSelectedRequestTitle] = React.useState<string>('');

  const expenseRequests = requests.filter(request => request.type === 'Expense Request');

  const handleApprove = async (requestId: string) => {
    const success = await updateRequestStatus(requestId, 'Approved', undefined, undefined, 'finance', 'Finance Team');
    if (success) {
      toast({
        title: "Finance Approval Recorded", 
        description: "Expense request approved by Finance. Awaiting Admin approval."
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
      'finance', 
      'Finance Team'
    );
    
    if (success) {
      toast({
        title: "Expense Rejected", 
        description: "Expense request has been rejected by Finance"
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

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return <Shield className="h-3 w-3" />;
      case 'MEDIUM': return <AlertCircle className="h-3 w-3" />;
      case 'HIGH': return <AlertTriangle className="h-3 w-3" />;
      case 'CRITICAL': return <AlertTriangle className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Finance Expense Review
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

  // Filter requests that need finance review or have been processed by finance
  const needsReviewCount = expenseRequests.filter(r => r.status === 'Pending' && !r.finance_approved_at).length;
  const totalAmount = expenseRequests.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const thisMonthCount = expenseRequests.filter(r => {
    const requestDate = new Date(r.daterequested);
    const now = new Date();
    return requestDate.getMonth() === now.getMonth() && requestDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Finance Expense Review
          </CardTitle>
          <CardDescription>
            Review and approve expense requests before they go to Admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Pending Finance Review</p>
              <p className="text-2xl font-bold text-yellow-800">{needsReviewCount}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Amount</p>
              <p className="text-2xl font-bold text-blue-800">UGX {totalAmount.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">This Month</p>
              <p className="text-2xl font-bold text-green-800">{thisMonthCount}</p>
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
                <Card key={request.id} className="border-l-4 border-l-blue-400">
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
                        <span className="text-sm">{formatDate(request.daterequested)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{request.priority}</span>
                      </div>
                    </div>

                    {/* Risk Assessment Section */}
                    {(() => {
                      const riskAssessment = assessExpenseRisk(request);
                      return (
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Risk Assessment:</span>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRiskBadgeColor(riskAssessment.riskLevel)}`}>
                              {getRiskIcon(riskAssessment.riskLevel)}
                              {riskAssessment.riskLevel} RISK
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground mb-2">
                            Risk Score: {riskAssessment.riskScore}/100 | 
                            Requires Approval: {riskAssessment.requiresApproval ? 'Yes' : 'No'}
                          </div>
                          
                          {request.details && request.details.reason && (
                            <div className="mb-2">
                              <span className="text-xs font-medium">Reason:</span>
                              <p className="text-xs text-muted-foreground">{request.details.reason}</p>
                            </div>
                          )}
                          
                          {request.details && request.details.phoneNumber && (
                            <div className="mb-2 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">Payment Phone:</span>
                              <span className="text-xs text-muted-foreground">{request.details.phoneNumber}</span>
                            </div>
                          )}
                          
                          {riskAssessment.flaggedReasons.length > 0 && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-red-600">Flagged Issues:</span>
                              <ul className="text-xs text-red-600 list-disc list-inside">
                                {riskAssessment.flaggedReasons.map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {riskAssessment.recommendations.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-blue-600">Recommendations:</span>
                              <ul className="text-xs text-blue-600 list-disc list-inside">
                                {riskAssessment.recommendations.map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}

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

                    {/* Action Buttons - Only show for requests that need finance approval */}
                    {request.status === 'Pending' && !request.finance_approved_at && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          size="sm"
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Finance Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id, request.title)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {/* Status messages */}
                    {request.finance_approved_at && !request.admin_approved_at && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-700 font-medium">
                          ✓ Finance Approved - Awaiting Admin Approval
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

export default ExpenseRequestsManager;