import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, CheckCircle, XCircle, Clock, DollarSign, User, Calendar } from 'lucide-react';
import { useEnhancedExpenseManagement } from '@/hooks/useEnhancedExpenseManagement';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const ExpenseManagement = () => {
  const { expenseRequests, loading, updateRequestApproval } = useEnhancedExpenseManagement();
  const { toast } = useToast();
  const { employee } = useAuth();

  // Filter different types of expense requests
  const userExpenseRequests = expenseRequests.filter(
    req => req.type === 'Employee Expense Request' || 
           (req.type.includes('Expense') && req.type !== 'Employee Salary Request')
  );

  const salaryRequests = expenseRequests.filter(
    req => req.type === 'Employee Salary Request' || req.type === 'Salary Payment'
  );

  const handleApprove = async (requestId: string) => {
    try {
      await updateRequestApproval(requestId, 'finance', true, employee?.name || 'Finance Team');
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await updateRequestApproval(requestId, 'finance', false, employee?.name || 'Finance Team');
    } catch (error) {
      console.error('Error rejecting request:', error);
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
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Finance Approval Center
          </CardTitle>
          <CardDescription>
            Review and approve expense requests and salary payments
          </CardDescription>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userExpenseRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {request.requestedby}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">
                        {formatCurrency(request.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadgeColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(request.daterequested).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(request)}>
                          {getStatusText(request)}
                        </Badge>
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
                        {request.financeApproved && !request.adminApproved && (
                          <Badge className="bg-blue-100 text-blue-800">Awaiting Admin</Badge>
                        )}
                        {request.financeApproved && request.adminApproved && (
                          <Badge className="bg-green-100 text-green-800">Fully Approved</Badge>
                        )}
                        {request.status === 'Rejected' && (
                          <Badge className="bg-red-100 text-red-800">Rejected</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {userExpenseRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No expense requests pending review</p>
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
    </div>
  );
};