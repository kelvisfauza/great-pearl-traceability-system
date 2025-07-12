import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, FileText, Receipt, Banknote, PlusCircle, CheckCircle2, Scale, Clock, Shield, AlertTriangle, Users, XCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useToast } from "@/hooks/use-toast";

const Finance = () => {
  const {
    transactions,
    expenses,
    payments,
    stats,
    loading,
    addTransaction,
    addExpense,
    processPayment
  } = useFinanceData();

  const { tasks: dailyTasks, loading: tasksLoading } = useDailyTasks();
  const { requests: approvalRequests, updateRequestStatus } = useApprovalRequests();
  const { employee, hasRole } = useAuth();
  const { toast } = useToast();

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [floatAmount, setFloatAmount] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptDescription, setReceiptDescription] = useState("");

  // Check if user can manage float (supervisor or operations manager)
  const canManageFloat = hasRole('Supervisor') || hasRole('Operations Manager') || employee?.position === 'Supervisor' || employee?.position === 'Operations Manager';

  const handleExpenseSubmit = () => {
    if (!expenseAmount || !expenseDescription) {
      return;
    }
    addExpense({
      description: expenseDescription,
      amount: parseInt(expenseAmount),
      date: new Date().toLocaleDateString(),
      category: "Operations",
      status: "Pending"
    });
    setExpenseAmount("");
    setExpenseDescription("");
  };

  const handleFloatSubmit = () => {
    if (!floatAmount) {
      return;
    }
    addTransaction({
      type: "Float",
      description: "Daily Float Received",
      amount: parseInt(floatAmount),
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString()
    });
    setFloatAmount("");
  };

  const handleReceiptIssue = () => {
    if (!receiptAmount || !receiptDescription) {
      return;
    }
    addTransaction({
      type: "Receipt",
      description: receiptDescription,
      amount: parseInt(receiptAmount),
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString()
    });
    setReceiptAmount("");
    setReceiptDescription("");
  };

  const handleProcessPayment = (paymentId: string, method: 'Bank Transfer' | 'Cash') => {
    processPayment(paymentId, method);
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Layout title="Finance Management" subtitle="Loading...">
        <div>Loading finance data...</div>
      </Layout>
    );
  }

  // Filter for salary payment requests
  const salaryPaymentRequests = approvalRequests.filter(req => req.type === 'Salary Payment');
  const pendingSalaryRequests = salaryPaymentRequests.filter(req => req.status === 'Pending');

  const handleApproveSalaryPayment = async (requestId: string) => {
    const success = await updateRequestStatus(requestId, 'Approved');
    if (success) {
      toast({
        title: "Salary Payment Approved",
        description: "The salary payment request has been approved and will be processed.",
      });
      // Here you could also create the actual payment record
    }
  };

  const handleRejectSalaryPayment = async (requestId: string) => {
    const success = await updateRequestStatus(requestId, 'Rejected');
    if (success) {
      toast({
        title: "Salary Payment Rejected",
        description: "The salary payment request has been rejected.",
      });
    }
  };

  return (
    <Layout 
      title="Finance Management" 
      subtitle="Process payments from quality assessments, manage cash flow, and generate financial reports"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.pendingPayments)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Operating Costs</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.operatingCosts)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cash on Hand</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.cashOnHand)}</p>
                </div>
                <Banknote className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="payments">Payment Processing</TabsTrigger>
            <TabsTrigger value="salary-requests">HR Salary Requests</TabsTrigger>
            <TabsTrigger value="daily">Daily Reports</TabsTrigger>
            <TabsTrigger value="cash">Cash Management</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Processing</CardTitle>
                <CardDescription>Process payments for quality assessed coffee batches (Price × Kilograms)</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No payments to process</p>
                    <p className="text-sm text-gray-400 mt-2">Quality assessed batches will appear here for payment</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Kilograms</TableHead>
                        <TableHead>Price/Kg</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.batchNumber}</TableCell>
                          <TableCell>{payment.supplier}</TableCell>
                          <TableCell>
                            {payment.kilograms ? (
                              <div className="flex items-center gap-1">
                                <Scale className="h-3 w-3 text-gray-500" />
                                {payment.kilograms.toLocaleString()} kg
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {payment.pricePerKg ? formatCurrency(payment.pricePerKg) : '-'}
                          </TableCell>
                          <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              payment.status === "Paid" ? "default" :
                              payment.status === "Processing" ? "secondary" : "destructive"
                            }>
                              {payment.status === "Processing" ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Awaiting Approval
                                </div>
                              ) : (
                                payment.status
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell>
                            {payment.status === "Paid" ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Processed
                              </Badge>
                            ) : payment.status === "Processing" ? (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pending Approval
                              </Badge>
                            ) : (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleProcessPayment(payment.id, 'Bank Transfer')}
                                >
                                  Bank Transfer
                                  <span className="text-xs ml-1">(Requires Approval)</span>
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleProcessPayment(payment.id, 'Cash')}
                                >
                                  Cash
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  HR Salary Payment Requests
                </CardTitle>
                <CardDescription>
                  Review and approve salary payment requests from HR department
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingSalaryRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No pending salary payment requests</p>
                    <p className="text-sm text-gray-400 mt-2">HR salary requests will appear here for approval</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingSalaryRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{request.title}</h4>
                              <Badge variant="secondary">{request.priority}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{request.description}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Requested by:</span>
                                <span className="ml-2 font-medium">{request.requestedby}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <span className="ml-2 font-medium">{new Date(request.daterequested).toLocaleDateString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Amount:</span>
                                <span className="ml-2 font-medium text-green-600">{request.amount}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Employees:</span>
                                <span className="ml-2 font-medium">{request.details?.employee_count || 0}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectSalaryPayment(request.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleApproveSalaryPayment(request.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                        
                        {request.details && (
                          <div className="bg-gray-50 rounded p-3">
                            <h5 className="font-medium text-sm mb-2">Payment Details:</h5>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500">Month:</span>
                                <span className="ml-1 font-medium">{request.details.month}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Base Salary:</span>  
                                <span className="ml-1 font-medium">UGX {request.details.total_salary?.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Payment Method:</span>
                                <span className="ml-1 font-medium">{request.details.payment_method}</span>
                              </div>
                              {request.details.bonuses > 0 && (
                                <div>
                                  <span className="text-gray-500">Bonuses:</span>
                                  <span className="ml-1 font-medium text-green-600">+UGX {request.details.bonuses.toLocaleString()}</span>
                                </div>
                              )}
                              {request.details.deductions > 0 && (
                                <div>
                                  <span className="text-gray-500">Deductions:</span>
                                  <span className="ml-1 font-medium text-red-600">-UGX {request.details.deductions.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                            
                            {request.details.employee_details && request.details.employee_details.length > 0 && (
                              <div className="mt-3">
                                <h6 className="font-medium text-xs mb-2">Employees ({request.details.employee_details.length}):</h6>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {request.details.employee_details.map((emp: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs bg-white p-2 rounded">
                                      <span>{emp.name} - {emp.position}</span>
                                      <span className="font-medium">UGX {emp.salary?.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {request.details.notes && (
                              <div className="mt-3">
                                <span className="text-gray-500 text-xs">Notes:</span>
                                <p className="text-xs mt-1">{request.details.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Transaction Report</CardTitle>
                  <CardDescription>Today's financial activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No transactions recorded today</p>
                    ) : (
                      transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {transaction.type === "Receipt" && <Receipt className="h-5 w-5 text-green-600" />}
                            {transaction.type === "Payment" && <CreditCard className="h-5 w-5 text-red-600" />}
                            {transaction.type === "Expense" && <FileText className="h-5 w-5 text-orange-600" />}
                            {transaction.type === "Float" && <Banknote className="h-5 w-5 text-blue-600" />}
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-gray-500">{transaction.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${transaction.type === 'Receipt' || transaction.type === 'Float' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'Receipt' || transaction.type === 'Float' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Tasks Completed</CardTitle>
                  <CardDescription>All tasks completed today</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tasksLoading ? (
                      <p className="text-gray-500 text-center py-4">Loading tasks...</p>
                    ) : dailyTasks.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No tasks completed today</p>
                    ) : (
                      dailyTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {task.task_type === "Payment" && <CreditCard className="h-4 w-4 text-red-600" />}
                            {task.task_type === "Receipt" && <Receipt className="h-4 w-4 text-green-600" />}
                            {task.task_type === "Float" && <Banknote className="h-4 w-4 text-blue-600" />}
                            {task.task_type === "Expense" && <FileText className="h-4 w-4 text-orange-600" />}
                            {task.task_type === "Quality Assessment" && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                            {task.task_type === "Employee Payment" && <DollarSign className="h-4 w-4 text-indigo-600" />}
                            <div>
                              <p className="font-medium text-sm">{task.description}</p>
                              <p className="text-xs text-gray-500">
                                {task.completed_by} • {task.completed_at}
                                {task.batch_number && ` • Batch: ${task.batch_number}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {task.amount && (
                              <p className="font-bold text-sm">{formatCurrency(task.amount)}</p>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {task.task_type}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Daily Balance</CardTitle>
                <CardDescription>Cash flow summary for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="font-medium">Total Receipts</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(stats.totalReceipts)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <span className="font-medium">Total Payments</span>
                    <span className="text-xl font-bold text-red-600">{formatCurrency(stats.totalPayments)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <span className="font-medium">Net Cash Flow</span>
                    <span className="text-xl font-bold text-blue-600">{formatCurrency(stats.netCashFlow)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Tasks Completed</span>
                    <span className="text-xl font-bold text-gray-600">{dailyTasks.length}</span>
                  </div>
                  <Button className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Daily Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cash" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Float Management</CardTitle>
                  <CardDescription>
                    Record daily money received as float
                    {!canManageFloat && (
                      <div className="flex items-center gap-2 mt-2 text-amber-600">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm">Restricted to Supervisors and Operations Managers</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canManageFloat ? (
                    <>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Float amount (UGX)"
                          value={floatAmount}
                          onChange={(e) => setFloatAmount(e.target.value)}
                        />
                        <Button onClick={handleFloatSubmit}>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Record Float
                        </Button>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Current Float Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(stats.currentFloat)}</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                      <p className="text-gray-500">Access Restricted</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Only Supervisors and Operations Managers can manage float
                      </p>
                      <div className="p-4 bg-gray-50 rounded-lg mt-4">
                        <p className="text-sm text-gray-600">Current Float Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(stats.currentFloat)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Issue Receipts</CardTitle>
                  <CardDescription>Generate receipts for transactions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Amount (UGX)"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Description"
                    value={receiptDescription}
                    onChange={(e) => setReceiptDescription(e.target.value)}
                  />
                  <Button onClick={handleReceiptIssue} className="w-full">
                    <Receipt className="h-4 w-4 mr-2" />
                    Issue Receipt
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Record New Expense</CardTitle>
                  <CardDescription>Add expenses and payouts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Expense description"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                  />
                  <Input
                    placeholder="Amount (UGX)"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                  <Button onClick={handleExpenseSubmit} className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Record Expense
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Recent expense transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenses.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No expenses recorded</p>
                    ) : (
                      expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-gray-500">{expense.category} • {expense.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(expense.amount)}</p>
                            <Badge variant={expense.status === "Approved" ? "default" : "secondary"}>
                              {expense.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Payments</CardTitle>
                      <CardDescription>Latest supplier payments</CardDescription>
                    </div>
                    <Button>
                      <DollarSign className="h-4 w-4 mr-2" />
                      New Payment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payments.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No payments recorded</p>
                    ) : (
                      payments.slice(0, 5).map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{payment.supplier}</p>
                            <p className="text-sm text-gray-500">{payment.method} • {payment.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(payment.amount)}</p>
                            <Badge variant={
                              payment.status === "Paid" ? "default" : 
                              payment.status === "Pending" ? "destructive" : "secondary"
                            }>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enhanced Monthly Summary</CardTitle>
                  <CardDescription>Comprehensive financial overview for this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                      <span className="font-medium">Total Revenue</span>
                      <span className="text-xl font-bold text-green-600">{formatCurrency(stats.monthlyRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                      <span className="font-medium">Total Expenses</span>
                      <span className="text-xl font-bold text-red-600">{formatCurrency(stats.operatingCosts)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                      <span className="font-medium">Net Profit</span>
                      <span className="text-xl font-bold text-blue-600">{formatCurrency(stats.monthlyRevenue - stats.operatingCosts)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                      <span className="font-medium">Pending Approvals</span>
                      <span className="text-xl font-bold text-purple-600">
                        {payments.filter(p => p.status === 'Processing').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
                      <span className="font-medium">Daily Tasks Today</span>
                      <span className="text-xl font-bold text-amber-600">{dailyTasks.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">Profit Margin</span>
                      <span className="text-xl font-bold text-gray-600">
                        {stats.monthlyRevenue > 0 ? ((stats.monthlyRevenue - stats.operatingCosts) / stats.monthlyRevenue * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Finance;
