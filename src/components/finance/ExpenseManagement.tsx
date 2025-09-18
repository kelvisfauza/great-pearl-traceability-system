import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, PlusCircle, CheckCircle, XCircle, Clock, DollarSign, User, Calendar, AlertTriangle } from 'lucide-react';
import { useExpenseManagement } from '@/hooks/useExpenseManagement';
import { useToast } from '@/hooks/use-toast';

export const ExpenseManagement = () => {
  const { 
    userExpenseRequests, 
    companyExpenses, 
    loading, 
    approveExpenseRequest, 
    rejectExpenseRequest,
    createCompanyExpense 
  } = useExpenseManagement();
  const { toast } = useToast();

  const [showCreateExpenseDialog, setShowCreateExpenseDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  
  // Company Expense Form State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePriority, setExpensePriority] = useState('Medium');
  const [expenseCategory, setExpenseCategory] = useState('Operations');

  // Rejection Form State
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApproveRequest = async (requestId: string) => {
    try {
      await approveExpenseRequest(requestId);
      toast({
        title: "Request Approved",
        description: "Expense request approved by Finance. Awaiting Admin approval."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve expense request",
        variant: "destructive"
      });
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason) return;

    try {
      await rejectExpenseRequest(selectedRequest.id, rejectionReason);
      toast({
        title: "Request Rejected",
        description: "Expense request has been rejected"
      });
      setShowRejectionDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to reject expense request",
        variant: "destructive"
      });
    }
  };

  const handleCreateCompanyExpense = async () => {
    if (!expenseTitle || !expenseDescription || !expenseAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await createCompanyExpense({
        title: expenseTitle,
        description: expenseDescription,
        amount: parseFloat(expenseAmount),
        priority: expensePriority,
        category: expenseCategory
      });

      toast({
        title: "Company Expense Created",
        description: "Company expense submitted for dual approval (Finance & Admin)"
      });

      // Reset form
      setExpenseTitle('');
      setExpenseDescription('');
      setExpenseAmount('');
      setExpensePriority('Medium');
      setExpenseCategory('Operations');
      setShowCreateExpenseDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create company expense",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'finance approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
            Expense Management
          </CardTitle>
          <CardDescription>
            Approve user expense requests and create company expenses (requires dual approval)
          </CardDescription>
          
          <div className="pt-4">
            <Dialog open={showCreateExpenseDialog} onOpenChange={setShowCreateExpenseDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create Company Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Company Expense</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expense-title">Title *</Label>
                    <Input
                      id="expense-title"
                      value={expenseTitle}
                      onChange={(e) => setExpenseTitle(e.target.value)}
                      placeholder="Expense title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expense-description">Description *</Label>
                    <Textarea
                      id="expense-description"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      placeholder="Detailed description of the expense"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="expense-amount">Amount (UGX) *</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Priority</Label>
                      <Select value={expensePriority} onValueChange={setExpensePriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Category</Label>
                      <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Company expenses require approval from both Finance and Admin departments.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateExpenseDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCompanyExpense} className="flex-1">
                      Create Expense
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="user-requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="user-requests">
                User Expense Requests ({userExpenseRequests.length})
              </TabsTrigger>
              <TabsTrigger value="company-expenses">
                Company Expenses ({companyExpenses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user-requests" className="space-y-4">
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
                          {request.requestedBy}
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
                          {request.dateRequested}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === 'Pending' && !request.financeApproved && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectionDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {request.financeApproved && !request.adminApproved && (
                          <Badge className="bg-blue-100 text-blue-800">Awaiting Admin</Badge>
                        )}
                        {request.status === 'Approved' && (
                          <Badge className="bg-green-100 text-green-800">Fully Approved</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {userExpenseRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No user expense requests</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="company-expenses" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Finance Status</TableHead>
                    <TableHead>Admin Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell className="font-bold text-purple-600">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadgeColor(expense.priority)}>
                          {expense.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {expense.dateCreated}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expense.financeApproved ? (
                          <Badge className="bg-green-100 text-green-800">Approved</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.adminApproved ? (
                          <Badge className="bg-green-100 text-green-800">Approved</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {companyExpenses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No company expenses created</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rejection Modal */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Expense Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this expense request.
            </p>
            
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this expense is being rejected..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowRejectionDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleRejectRequest}
                className="flex-1"
              >
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};