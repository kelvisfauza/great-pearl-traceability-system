import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';
import { useRiskAssessment } from '@/hooks/useRiskAssessment';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, FileText, Shield, Phone, AlertTriangle, Printer, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RejectionModal } from '@/components/workflow/RejectionModal';
import { AdminApprovalModal } from './AdminApprovalModal';
import { PaymentSlipModal } from './PaymentSlipModal';
import { RecentPaymentSlipsModal } from './RecentPaymentSlipsModal';
import { AdminExpenseReviewModal } from './AdminExpenseReviewModal';
import { supabase } from '@/integrations/supabase/client';

interface AdminExpenseRequestsManagerProps {
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason: string) => void;
}

const AdminExpenseRequestsManager: React.FC<AdminExpenseRequestsManagerProps> = ({ 
  onApprove, 
  onReject 
}) => {
  const { requests, loading, updateRequestStatus, fetchRequests } = useApprovalRequests();
  const { assessExpenseRisk } = useRiskAssessment();
  const { employee } = useAuth();
  const [rejectionModalOpen, setRejectionModalOpen] = React.useState(false);
  const [selectedRequestId, setSelectedRequestId] = React.useState<string>('');
  const [selectedRequestTitle, setSelectedRequestTitle] = React.useState<string>('');
  const [userProfiles, setUserProfiles] = useState<Record<string, { name?: string; phone?: string }>>({});
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [paymentSlipModalOpen, setPaymentSlipModalOpen] = useState(false);
  const [recentSlipsModalOpen, setRecentSlipsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Include all expense-related requests (Expense Request, Employee Salary Request, category-specific requests)
  const expenseRequests = requests.filter(request => 
    request.type === 'Expense Request' || 
    request.type === 'Employee Salary Request' ||
    request.type === 'Employee Expense Request' ||
    request.type.includes('Request') && (
      request.type.includes('Expense') || 
      request.type.includes('Airtime') ||
      request.type.includes('Meals') ||
      request.type.includes('Refreshments') ||
      request.type.includes('Transport') ||
      request.type.includes('Salary')
    )
  );

  // Log for debugging
  console.log('📋 All requests:', requests.length);
  console.log('📋 Expense requests after type filter:', expenseRequests.length);
  console.log('📋 Expense requests:', expenseRequests.map(r => ({
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    finance_approved_at: r.finance_approved_at,
    admin_approved_at: r.admin_approved_at
  })));

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

  const handleReview = (request: any) => {
    console.log('🔵 handleReview called with request:', request?.id, request?.title);
    console.log('🔵 Current reviewModalOpen state:', reviewModalOpen);
    setSelectedRequest(request);
    console.log('🔵 Setting reviewModalOpen to TRUE');
    // Force close first then open
    setReviewModalOpen(false);
    setTimeout(() => {
      setReviewModalOpen(true);
      console.log('🔵 reviewModalOpen should now be TRUE');
    }, 50);
  };

  const handleApproveFromReview = () => {
    console.log('🎯 handleApproveFromReview called');
    console.log('🎯 selectedRequest:', selectedRequest);
    setReviewModalOpen(false);
    // Add delay to ensure review modal closes before opening approval modal
    setTimeout(() => {
      setApprovalModalOpen(true);
      console.log('🎯 Approval modal should now be opening');
    }, 100);
  };

  const handleRejectFromReview = () => {
    setReviewModalOpen(false);
    setSelectedRequestId(selectedRequest.id);
    setSelectedRequestTitle(selectedRequest.title);
    setRejectionModalOpen(true);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const confirmApproval = async (paymentMethod: 'cash' | 'transfer', comments?: string) => {
    try {
      alert('🚀 CONFIRM APPROVAL CALLED! Payment: ' + paymentMethod);
      console.log('🚀 confirmApproval STARTED');
      console.log('🚀 selectedRequest:', selectedRequest);
      
      if (!selectedRequest || !selectedRequest.id) {
        alert('ERROR: No request selected!');
        console.error('No request selected for approval');
        return;
      }
      
      const requestId = selectedRequest.id;
      const approverName = employee?.name || 'Admin Team';
      
      alert('🎯 About to update status for: ' + requestId);
      console.log('🎯 Starting approval for ID:', requestId);
      
      // Determine which admin approval slot to use
      let approvalType: 'admin' | 'admin1' | 'admin2' = 'admin';
      
      if (selectedRequest.requiresThreeApprovals) {
        if (!selectedRequest.admin_approved_1_at) {
          approvalType = 'admin1';
        } else if (!selectedRequest.admin_approved_2_at) {
          approvalType = 'admin2';
        }
      } else {
        approvalType = 'admin';
      }
      
      console.log('🎯 Approval type:', approvalType);
      alert('📝 Calling updateRequestStatus with type: ' + approvalType);
      
      const success = await updateRequestStatus(
        requestId, 
        'Pending',
        undefined, 
        comments, 
        approvalType, 
        approverName
      );
      
      alert('✅ Update result: ' + (success ? 'SUCCESS' : 'FAILED'));
      console.log('🎯 Update success:', success);
      
      if (success) {
        // Update the request with payment method and comments
        try {
          const { error: commentError } = await supabase
            .from('approval_requests')
            .update({ 
              admin_comments: comments 
            })
            .eq('id', requestId);
            
          if (commentError) {
            console.error('Error updating comments:', commentError);
          }
        } catch (error) {
          console.log('Admin comments update error:', error);
        }

        const isFullyApproved = approvalType === 'admin2' || (approvalType === 'admin' && !selectedRequest?.requiresThreeApprovals);
        
        console.log('🎯 Is fully approved:', isFullyApproved);
        
        toast({
          title: "Admin Approval Recorded",
          description: isFullyApproved ? 
            `Expense request fully approved for ${paymentMethod} payment` :
            `Admin ${approvalType === 'admin1' ? '1' : ''} approval recorded - awaiting second admin approval`
        });
        
        onApprove?.(requestId);
        
        // Refresh the requests list
        await fetchRequests();
        
        // Show payment slip for both cash and transfer if fully approved
        if (isFullyApproved) {
          const updatedRequest = {
            ...selectedRequest,
            id: requestId,
            title: selectedRequest.title,
            amount: parseFloat(selectedRequest.amount || '0'),
            requestedby: selectedRequest.requestedby,
            paymentMethod: paymentMethod === 'transfer' ? 'Bank Transfer' : 'Cash Payment',
            financeApprovedBy: selectedRequest.finance_approved_by,
            adminApprovedBy: approverName,
            financeApprovedAt: selectedRequest.finance_approved_at,
            adminApprovedAt: new Date().toISOString(),
            phoneNumber: selectedRequest.details?.phoneNumber || userProfiles[selectedRequest.requestedby]?.phone,
            reason: selectedRequest.details?.reason
          };
          
          console.log('🎯 Opening payment slip with data:', updatedRequest);
          setSelectedRequest(updatedRequest);
          
          setTimeout(() => {
            setPaymentSlipModalOpen(true);
          }, 100);
        } else {
          setSelectedRequest(null);
        }
      } else {
        console.error('❌ FAILED to update request status!');
      }
      
      setApprovalModalOpen(false);
    } catch (error) {
      console.error('❌ Approval error:', error);
    }
  };

  const handleReject = (requestId: string, requestTitle: string) => {
    setSelectedRequestId(requestId);
    setSelectedRequestTitle(requestTitle);
    setRejectionModalOpen(true);
  };

  const confirmRejection = async (reason: string, comments?: string) => {
    const approverName = employee?.name || 'Admin Team';
    const success = await updateRequestStatus(
      selectedRequestId, 
      'Rejected', 
      reason, 
      comments, 
      'admin', 
      approverName
    );
    
    if (success) {
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

  // Filter requests that need admin review (must have Finance approval first)
  const needsAdminReview = expenseRequests.filter(r => {
    if (!r.finance_approved_at) return false;
    
    if (r.requiresThreeApprovals) {
      // For three-tier: needs review if either admin1 or admin2 not approved
      return !r.admin_approved_1_at || !r.admin_approved_2_at;
    } else {
      // For two-tier: needs review if admin not approved
      return !r.admin_approved_at;
    }
  });
  
  const needsReviewCount = needsAdminReview.length;
  
  const totalAmount = expenseRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
  const fullyApprovedCount = expenseRequests.filter(r => r.status === 'Approved').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Approval Center
          </CardTitle>
          <CardDescription>
            Review and approve expense requests and salary payments that have passed finance review
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

          {/* Print Payment Slip Button */}
          <div className="mb-6">
            <Button 
              onClick={() => setRecentSlipsModalOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Payment Slip
            </Button>
          </div>

          {/* Compact Table View */}
          {needsAdminReview.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No requests pending admin approval</p>
              <p className="text-sm text-muted-foreground mt-2">
                Requests must be approved by Finance before Admin review
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Approval Status</TableHead>
                  <TableHead>Finance Approval</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needsAdminReview.map((request) => {
                    const riskAssessment = assessExpenseRisk(request);
                    const getRiskColor = (level: string) => {
                      switch (level) {
                        case 'CRITICAL': return 'text-red-700 bg-red-50';
                        case 'HIGH': return 'text-red-600 bg-red-50';
                        case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
                        case 'LOW': return 'text-green-600 bg-green-50';
                        default: return 'text-gray-600 bg-gray-50';
                      }
                    };
                    
                    const getApprovalStatus = () => {
                      if (request.requiresThreeApprovals) {
                        if (request.admin_approved_1_at && !request.admin_approved_2_at) {
                          return { text: 'Needs 2nd Admin', color: 'text-blue-600 bg-blue-50' };
                        }
                        return { text: 'Needs 1st Admin', color: 'text-yellow-600 bg-yellow-50' };
                      }
                      return { text: 'Needs Admin', color: 'text-yellow-600 bg-yellow-50' };
                    };
                    
                    const approvalStatus = getApprovalStatus();
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-sm text-muted-foreground">{request.type}</p>
                            {request.requiresThreeApprovals && (
                              <Badge variant="outline" className="mt-1 text-xs">3-Tier Approval</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{userProfiles[request.requestedby]?.name || request.requestedby.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground">{request.requestedby}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            UGX {request.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={approvalStatus.color}>
                            {approvalStatus.text}
                          </Badge>
                          {request.admin_approved_1_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Admin 1: {request.admin_approved_1_by}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p className="font-medium text-green-700">{request.finance_approved_by}</p>
                            <p className="text-muted-foreground">{formatDateTime(request.finance_approved_at)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(riskAssessment.riskLevel)}>
                            {riskAssessment.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleReview(request);
                            }}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
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
      

      {/* Admin Approval Modal */}
      <AdminApprovalModal
        open={approvalModalOpen}
        onOpenChange={setApprovalModalOpen}
        onApprove={confirmApproval}
        requestTitle={selectedRequest?.title || selectedRequestTitle}
        amount={selectedRequest ? parseFloat(selectedRequest.amount) : 0}
      />
      
      {/* Recent Payment Slips Modal */}
      <RecentPaymentSlipsModal
        open={recentSlipsModalOpen}
        onOpenChange={setRecentSlipsModalOpen}
      />

      {/* Payment Slip Modal */}
      <PaymentSlipModal
        open={paymentSlipModalOpen}
        onOpenChange={(open) => {
          setPaymentSlipModalOpen(open);
          // Clear selected request when modal closes
          if (!open) {
            setSelectedRequest(null);
          }
        }}
        request={selectedRequest}
        recipientName={selectedRequest ? userProfiles[selectedRequest.requestedby]?.name : undefined}
      />
      
      <AdminExpenseReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        request={selectedRequest}
        riskAssessment={selectedRequest ? assessExpenseRisk(selectedRequest) : null}
        userProfile={selectedRequest ? userProfiles[selectedRequest.requestedby] : undefined}
        onApprove={handleApproveFromReview}
        onReject={handleRejectFromReview}
      />
    </div>
  );
};

export default AdminExpenseRequestsManager;