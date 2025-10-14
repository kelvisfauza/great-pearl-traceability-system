import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, Plus } from 'lucide-react';
import { useEnhancedExpenseManagement } from '@/hooks/useEnhancedExpenseManagement';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AddExpenseModal } from './AddExpenseModal';

export const ExpenseManagement = () => {
  const { expenseRequests, loading, updateRequestApproval, refetch } = useEnhancedExpenseManagement();
  const { toast } = useToast();
  const { employee } = useAuth();
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // Filter different types of expense requests that need finance action
  const userExpenseRequests = expenseRequests.filter(
    req => {
      const isExpenseRequest = req.type === 'Employee Expense Request' || 
                              (req.type.includes('Expense') && req.type !== 'Employee Salary Request');
      
      // Use the same logic as admin section - check for actual approval timestamps
      const hasFinanceApproval = req.financeApprovedAt; // finance_approved_at timestamp
      const hasAdminApproval = req.adminApprovedAt; // admin_approved_at timestamp
      const isRejected = req.status === 'Rejected' || req.status === 'rejected';
      
      console.log('Filtering expense request:', {
        id: req.id,
        title: req.title,
        type: req.type,
        status: req.status,
        financeApprovedAt: req.financeApprovedAt,
        adminApprovedAt: req.adminApprovedAt,
        hasFinanceApproval,
        hasAdminApproval,
        isExpenseRequest,
        isRejected,
        shouldShow: isExpenseRequest && !isRejected && !(hasFinanceApproval && hasAdminApproval)
      });
      
      // Only show if it's an expense request AND not rejected AND finance hasn't approved yet
      return isExpenseRequest && !isRejected && !hasFinanceApproval;
    }
  );

  const salaryRequests = expenseRequests.filter(
    req => {
      const isSalaryRequest = req.type === 'Employee Salary Request' || req.type === 'Salary Payment';
      
      // Use the same logic as admin section - check for actual approval timestamps
      const hasFinanceApproval = req.financeApprovedAt; // finance_approved_at timestamp
      const hasAdminApproval = req.adminApprovedAt; // admin_approved_at timestamp
      const isRejected = req.status === 'Rejected' || req.status === 'rejected';
      
      console.log('Filtering salary request:', {
        id: req.id,
        title: req.title,
        type: req.type,
        status: req.status,
        financeApprovedAt: req.financeApprovedAt,
        adminApprovedAt: req.adminApprovedAt,
        hasFinanceApproval,
        hasAdminApproval,
        isSalaryRequest,
        isRejected,
        shouldShow: isSalaryRequest && !isRejected && !(hasFinanceApproval && hasAdminApproval)
      });
      
      // Only show if it's a salary request AND not rejected AND finance hasn't approved yet
      return isSalaryRequest && !isRejected && !hasFinanceApproval;
    }
  );

  const handleApprove = async (requestId: string) => {
    try {
      await updateRequestApproval(requestId, 'finance', true, employee?.name || 'Finance Team');
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) {
      toast({
        title: "Rejection Cancelled",
        description: "Rejection reason is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await updateRequestApproval(requestId, 'finance', false, employee?.name || 'Finance Team', reason);
      toast({
        title: "Request Rejected",
        description: "The expense request has been rejected successfully",
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject the request",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  const getStatusBadgeColor = (request: any) => {
    if (request.status === 'Rejected') return 'bg-red-100 text-red-800';
    if (request.financeApproved && request.adminApproved) return 'bg-green-100 text-green-800';
    if (request.financeApproved && !request.adminApproved) return 'bg-blue-100 text-blue-800';
    if (!request.financeApproved && request.adminApproved) return 'bg-purple-100 text-purple-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (request: any) => {
    if (request.status === 'Rejected') return 'Rejected';
    if (request.financeApproved && request.adminApproved) return 'Fully Approved';
    if (request.financeApproved && !request.adminApproved) return 'Finance Approved - Awaiting Admin';
    if (!request.financeApproved && request.adminApproved) return 'Admin Approved - Awaiting Finance';
    return 'Pending Review';
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
                Salary Requests ({salaryRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expense-requests" className="space-y-4">
              <div className="space-y-4">
                {userExpenseRequests.map((request) => {
                  const details = typeof request.details === 'string' ? JSON.parse(request.details) : request.details || {};
                  const phoneNumber = details.phoneNumber || 'Not provided';
                  const reason = details.reason || request.description || 'No reason provided';
                  const expenseCategory = details.expenseCategory || details.expenseType || 'Not specified';
                  
                  return (
                    <Card key={request.id} className="border-l-4 border-l-blue-400">
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
                                  <p className="text-sm text-blue-700 mt-1">{reason}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-blue-800">Payment Phone Number:</span>
                                  <p className="text-sm text-blue-700 font-mono">{phoneNumber}</p>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-blue-800">Expense Category:</span>
                                  <p className="text-sm text-blue-700">{expenseCategory}</p>
                                </div>
                                {details.urgency && (
                                  <div>
                                    <span className="text-sm font-medium text-blue-800">Urgency:</span>
                                    <p className="text-sm text-blue-700">{details.urgency}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <Badge className={getStatusBadgeColor(request)}>
                              {getStatusText(request)}
                            </Badge>
                            <Badge className={getPriorityBadgeColor(request.priority)}>
                              {request.priority}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-green-600">UGX {request.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{request.requestedby}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{phoneNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{new Date(request.daterequested).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Approval Status */}
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                          <div className="text-sm font-medium mb-2">Approval Status:</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              {request.financeApproved ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className={`text-sm ${request.financeApproved ? 'text-green-700' : 'text-yellow-700'}`}>
                                Finance: {request.financeApproved ? 'Approved' : 'Pending Review'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {request.adminApproved ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className={`text-sm ${request.adminApproved ? 'text-green-700' : 'text-yellow-700'}`}>
                                Admin: {request.adminApproved ? 'Approved' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                          {!request.financeApproved && request.status !== 'Rejected' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(request.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {request.financeApproved && !request.adminApproved && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Clock className="h-4 w-4 mr-1" />
                              Awaiting Admin Approval
                            </Badge>
                          )}
                          {request.financeApproved && request.adminApproved && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Fully Approved
                            </Badge>
                          )}
                          {request.status === 'Rejected' && (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {userExpenseRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No expense requests pending review</p>
                  <p className="text-sm mt-2">Use "Add Expense" button above to record direct expenses</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="salary-requests" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Approval Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {request.details?.employee_name || request.requestedby}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        {formatCurrency(request.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.details?.payment_type === 'mid-month' ? 'Mid-Month' : 'Full Salary'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(request.daterequested).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge 
                            variant="outline" 
                            className={request.financeApproved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                          >
                            Finance: {request.financeApproved ? 'Approved' : 'Pending'}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={request.adminApproved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                          >
                            Admin: {request.adminApproved ? 'Approved' : 'Pending'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {!request.financeApproved && request.status !== 'Rejected' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(request.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {request.financeApproved && request.adminApproved && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Ready for Payment
                          </Badge>
                        )}
                        {request.financeApproved && !request.adminApproved && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Clock className="h-4 w-4 mr-1" />
                            Awaiting Admin
                          </Badge>
                        )}
                        {request.status === 'Rejected' && (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejected
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {salaryRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No salary requests pending review</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <AddExpenseModal 
        open={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
};