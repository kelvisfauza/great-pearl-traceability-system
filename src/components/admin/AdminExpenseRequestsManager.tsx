import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { useRiskAssessment } from '@/hooks/useRiskAssessment';
import { AlertCircle, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText, Shield, Phone, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RejectionModal } from '@/components/workflow/RejectionModal';
import { AdminApprovalModal } from './AdminApprovalModal';
import { PaymentSlipModal } from './PaymentSlipModal';
import { supabase } from '@/integrations/supabase/client';

interface AdminExpenseRequestsManagerProps {
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason: string) => void;
}

const AdminExpenseRequestsManager: React.FC<AdminExpenseRequestsManagerProps> = ({ 
  onApprove, 
  onReject 
}) => {
  const { requests, loading, updateRequestStatus } = useApprovalRequests();
  const { assessExpenseRisk } = useRiskAssessment();
  const [rejectionModalOpen, setRejectionModalOpen] = React.useState(false);
  const [selectedRequestId, setSelectedRequestId] = React.useState<string>('');
  const [selectedRequestTitle, setSelectedRequestTitle] = React.useState<string>('');
  const [userProfiles, setUserProfiles] = useState<Record<string, { name?: string; phone?: string }>>({});
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [paymentSlipModalOpen, setPaymentSlipModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const expenseRequests = requests.filter(request => request.type === 'Expense Request');

  // Fetch user profiles to get names and phone numbers
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const emails = [...new Set(expenseRequests.map(r => r.requestedby))];
      const profiles: Record<string, { name?: string; phone?: string }> = {};

      for (const email of emails) {
        try {
          // First try to get from employees table
          const { data: employee } = await supabase
            .from('employees')
            .select('name, phone')
            .eq('email', email)
            .single();

          if (employee) {
            profiles[email] = { name: employee.name, phone: employee.phone };
          } else {
            // Fallback to profiles table
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, phone')
              .eq('user_id', email)
              .single();

            if (profile) {
              profiles[email] = { name: profile.name, phone: profile.phone };
            }
          }
        } catch (error) {
          console.error('Error fetching profile for', email, error);
        }
      }

      setUserProfiles(profiles);
    };

    if (expenseRequests.length > 0) {
      fetchUserProfiles();
    }
  }, [expenseRequests]);

  const handleApprove = (request: any) => {
    setSelectedRequest(request);
    setSelectedRequestId(request.id);
    setSelectedRequestTitle(request.title);
    setApprovalModalOpen(true);
  };

  const confirmApproval = async (paymentMethod: 'cash' | 'transfer', comments?: string) => {
    const success = await updateRequestStatus(
      selectedRequestId, 
      'Approved', 
      undefined, 
      comments, 
      'admin', 
      'Admin Team'
    );
    
    if (success) {
      // Update the request with payment method
      await supabase
        .from('approval_requests')
        .update({ 
          payment_method: paymentMethod,
          admin_comments: comments 
        })
        .eq('id', selectedRequestId);

      toast({
        title: "Admin Approval Recorded",
        description: `Expense request approved for ${paymentMethod} payment`
      });
      
      onApprove?.(selectedRequestId);
      
      // Show payment slip for transfers
      if (paymentMethod === 'transfer') {
        const updatedRequest = {
          ...selectedRequest,
          paymentMethod: 'Bank Transfer',
          adminApprovedBy: 'Admin Team',
          adminApprovedAt: new Date().toISOString(),
          phoneNumber: selectedRequest.details?.phoneNumber || userProfiles[selectedRequest.requestedby]?.phone,
          reason: selectedRequest.details?.reason
        };
        setSelectedRequest(updatedRequest);
        setPaymentSlipModalOpen(true);
      }
    }
    
    setApprovalModalOpen(false);
    setSelectedRequestId('');
    setSelectedRequestTitle('');
    setSelectedRequest(null);
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

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <AlertCircle className="h-4 w-4" />;
      case 'LOW':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
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
              expenseRequests.map((request) => {
                const riskAssessment = assessExpenseRisk(request);
                const paymentPhone = request.details?.phoneNumber || userProfiles[request.requestedby]?.phone || 'Not provided';
                const expenseReason = request.details?.reason || 'No reason provided';
                
                return (
                <Card key={request.id} className="border-l-4 border-l-purple-400">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <p className="text-muted-foreground">{request.description}</p>
                        
                        {/* Expense Details */}
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-medium text-blue-800">Reason for Expense:</span>
                              <p className="text-sm text-blue-700 mt-1">{expenseReason}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-blue-800">Payment Phone Number:</span>
                              <p className="text-sm text-blue-700 font-mono">{paymentPhone}</p>
                            </div>
                            {request.details?.expenseCategory && (
                              <div>
                                <span className="text-sm font-medium text-blue-800">Expense Category:</span>
                                <p className="text-sm text-blue-700">{request.details.expenseCategory}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {getStatusIcon(request.status)}
                        <Badge variant={getStatusBadgeVariant(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Risk Assessment Panel */}
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-3">
                        {getRiskIcon(riskAssessment.riskLevel)}
                        <span className="font-medium">Risk Assessment</span>
                        <Badge variant={getRiskBadgeColor(riskAssessment.riskLevel)}>
                          {riskAssessment.riskLevel} RISK
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          (Score: {riskAssessment.riskScore}/100)
                        </span>
                      </div>
                      
                      {riskAssessment.flaggedReasons.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-orange-700 mb-1">Risk Factors:</p>
                          <ul className="text-sm text-orange-600 space-y-1">
                            {riskAssessment.flaggedReasons.map((reason, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span className="text-orange-500">•</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-1">Recommendations:</p>
                        <ul className="text-sm text-green-600 space-y-1">
                          {riskAssessment.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-green-500">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="mt-3 p-2 bg-white rounded border">
                        <p className="text-sm">
                          <span className="font-medium">Approval Required:</span>
                          <span className={`ml-2 ${riskAssessment.requiresApproval ? 'text-red-600' : 'text-green-600'}`}>
                            {riskAssessment.requiresApproval ? 'YES - Manual review needed' : 'NO - Can be fast-tracked'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">UGX {parseFloat(request.amount).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {userProfiles[request.requestedby]?.name || request.requestedby.split('@')[0]}
                        </span>
                        <span className="text-xs text-muted-foreground">({request.requestedby})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {userProfiles[request.requestedby]?.phone || 
                           request.phone || 
                           request.details?.phoneNumber || 
                           'Not provided'}
                        </span>
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
                            Finance: {request.finance_approved_at ? 
                              `Approved by ${request.finance_approved_by || 'Finance Team'}` : 
                              'Pending'
                            }
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
                            Admin: {request.admin_approved_at ? 
                              `Approved by ${request.admin_approved_by || 'Admin Team'}` : 
                              'Pending'
                            }
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
                );
              })
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