import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, Plus, Eye, FileText, ShieldAlert, Loader2 } from 'lucide-react';
import { useEnhancedExpenseManagement } from '@/hooks/useEnhancedExpenseManagement';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AddExpenseModal } from './AddExpenseModal';
import { FinanceReviewModal } from './FinanceReviewModal';
import { RejectionModal } from '@/components/workflow/RejectionModal';
import { useSeparationOfDuties } from '@/hooks/useSeparationOfDuties';
import { supabase } from '@/integrations/supabase/client';

const MoneyRequestsManager = lazy(() => import('./MoneyRequestsManager').then(m => ({ default: m.default })));

export const ExpenseManagement = () => {
  const { expenseRequests, loading, updateRequestApproval, refetch } = useEnhancedExpenseManagement();
  const { toast } = useToast();
  const { employee } = useAuth();
  const { checkExpenseRequestEligibility, showSoDViolationWarning } = useSeparationOfDuties();
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [moneyRequestsCount, setMoneyRequestsCount] = useState(0);

  // Filter different types of expense requests that need finance action
  const userExpenseRequests = expenseRequests.filter(
    req => {
      const isExpenseRequest = req.type === 'Employee Expense Request' || 
                              req.type === 'Requisition' ||
                              req.type === 'Field Financing Request' ||
                              req.department === 'Field Operations' ||
                              (req.type.includes('Expense') && req.type !== 'Employee Salary Request');
      
      const hasFinanceApproval = req.financeApprovedAt;
      const isRejected = req.status === 'Rejected' || req.status === 'rejected';
      
      // Only show if it's an expense request AND not rejected AND finance hasn't approved yet
      return isExpenseRequest && !isRejected && !hasFinanceApproval;
    }
  );

  const salaryRequests = expenseRequests.filter(
    req => {
      const isSalaryRequest = req.type === 'Employee Salary Request' || req.type === 'Salary Payment';
      
      const hasFinanceApproval = req.financeApprovedAt;
      const isRejected = req.status === 'Rejected' || req.status === 'rejected';
      
      // Only show if it's a salary request AND not rejected AND finance hasn't approved yet
      return isSalaryRequest && !isRejected && !hasFinanceApproval;
    }
  );

  // Fetch money_requests count
  useEffect(() => {
    const fetchMoneyRequestsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('money_requests')
          .select('*', { count: 'exact', head: true })
          .eq('approval_stage', 'pending_finance');
        
        if (error) throw error;
        setMoneyRequestsCount(count || 0);
      } catch (error) {
        console.error('Error fetching money requests count:', error);
      }
    };

    fetchMoneyRequestsCount();

    // Subscribe to changes in money_requests table
    const subscription = supabase
      .channel('money_requests_count')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'money_requests' },
        () => fetchMoneyRequestsCount()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Combined salary requests count
  const totalSalaryRequestsCount = salaryRequests.length + moneyRequestsCount;

  // Memoize handlers for better performance
  const handleReview = useCallback((request: any) => {
    setSelectedRequest(request);
    setReviewModalOpen(true);
  }, []);

  const handleApproveFromReview = useCallback(async () => {
    try {
      // ⚠️ CRITICAL: Check Separation of Duties
      const sodCheck = await checkExpenseRequestEligibility(selectedRequest.id);
      
      if (!sodCheck.canApprove) {
        showSoDViolationWarning(sodCheck.reason || 'Approval blocked by Separation of Duties policy');
        setReviewModalOpen(false);
        return;
      }

      // Additional check: user cannot approve their own expense request
      const currentUserEmail = employee?.email;
      const requestorEmail = selectedRequest.requestedby;
      
      if (currentUserEmail === requestorEmail) {
        showSoDViolationWarning(
          'You cannot approve your own expense request. Separation of Duties requires a different person to approve each request.'
        );
        setReviewModalOpen(false);
        return;
      }

      // ❌ Finance approval removed - will be handled in Finance portal
      // await updateRequestApproval(selectedRequest.id, 'finance', true, employee?.name || 'Finance Team');
      toast({
        title: "Notice",
        description: "Finance approvals are now handled in the separate Finance portal",
      });
      setReviewModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve the request",
        variant: "destructive"
      });
    }
  }, [selectedRequest, checkExpenseRequestEligibility, showSoDViolationWarning, employee, updateRequestApproval, toast, refetch]);

  const handleRejectFromReview = useCallback(() => {
    setReviewModalOpen(false);
    setRejectionModalOpen(true);
  }, []);

  const handleConfirmRejection = useCallback(async (reason: string, comments?: string) => {
    try {
      const fullReason = comments ? `${reason}\n\nComments: ${comments}` : reason;
      console.log('🔄 Starting rejection with reason:', fullReason);
      
      // ❌ Finance approval removed - will be handled in Finance portal
      // const success = await updateRequestApproval(
      //   selectedRequest.id, 
      //   'finance', 
      //   false, 
      //   employee?.name || 'Finance Team', 
      //   fullReason
      // );
      const success = true; // Placeholder
      
      if (success) {
        toast({
          title: "Request Rejected",
          description: "The expense request has been rejected successfully",
        });
        setRejectionModalOpen(false);
        setSelectedRequest(null);
        refetch();
      } else {
        // updateRequestApproval already showed an error toast
        console.error('❌ Rejection failed - updateRequestApproval returned false');
      }
    } catch (error) {
      console.error('❌ Error in handleConfirmRejection:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject the request",
        variant: "destructive"
      });
    }
  }, [selectedRequest, updateRequestApproval, employee, toast, refetch]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    // Check if the date string includes time info (ISO format with T)
    const hasTime = dateString.includes('T') || dateString.includes(':');
    
    if (hasTime) {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // Date only, no time
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  const getStatusBadgeColor = (request: any) => {
    if (request.status === 'Rejected') return 'bg-red-100 text-red-800';
    if (request.status === 'Approved') return 'bg-green-100 text-green-800';
    if (request.financeApproved && request.requiresThreeApprovals) {
      if (request.adminApproved1 && request.adminApproved2) return 'bg-green-100 text-green-800';
      if (request.adminApproved1) return 'bg-blue-100 text-blue-800';
      return 'bg-blue-100 text-blue-800';
    }
    if (request.financeApproved && !request.requiresThreeApprovals) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (request: any) => {
    if (request.status === 'Rejected') return 'Rejected';
    if (request.status === 'Approved') return 'Fully Approved';
    if (request.requiresThreeApprovals) {
      if (request.financeApproved && request.adminApproved1 && request.adminApproved2) return 'Fully Approved';
      if (request.financeApproved && request.adminApproved1) return 'Needs 2nd Admin';
      if (request.financeApproved) return 'Needs Admin Approval';
    } else {
      if (request.financeApproved) return 'Needs Admin Approval';
    }
    return 'Pending Finance';
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="border-amber-200 bg-amber-50">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Separation of Duties Policy:</strong> You cannot approve expense requests that you submitted yourself, or approve the same request at multiple stages. This security measure ensures proper accountability and prevents fraud.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Finance Approval Center
              </CardTitle>
              <CardDescription>
                Review and approve expense requests and salary payments
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowAddExpenseModal(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="expense-requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense-requests">
                Expense Requests ({userExpenseRequests.length})
              </TabsTrigger>
              <TabsTrigger value="salary-requests">
                Salary Requests ({totalSalaryRequestsCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense-requests" className="space-y-4">
              {userExpenseRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending expense requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Submission Time</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userExpenseRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-sm text-muted-foreground">{request.type}</p>
                            {request.department === 'Field Operations' && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Field Operations
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{request.requestedby}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            UGX {request.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDateTime(request.daterequested)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityBadgeColor(request.priority)}>
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(request)}>
                            {getStatusText(request)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReview(request)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="salary-requests" className="space-y-4">
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <MoneyRequestsManager />
              </Suspense>
              
              {salaryRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending salary requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Submission Time</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-sm text-muted-foreground">{request.type}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{request.requestedby}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            UGX {request.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDateTime(request.daterequested)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityBadgeColor(request.priority)}>
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(request)}>
                            {getStatusText(request)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReview(request)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddExpenseModal
        open={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onSuccess={() => {
          setShowAddExpenseModal(false);
          refetch();
        }}
      />
      
      <FinanceReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        request={selectedRequest}
        details={selectedRequest ? (typeof selectedRequest.details === 'string' ? JSON.parse(selectedRequest.details) : selectedRequest.details || {}) : {}}
        onApprove={handleApproveFromReview}
        onReject={handleRejectFromReview}
      />

      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        onConfirm={handleConfirmRejection}
        title="Reject Expense Request"
        description="Please select a reason for rejecting this expense request and provide any additional comments."
      />
    </div>
  );
};
