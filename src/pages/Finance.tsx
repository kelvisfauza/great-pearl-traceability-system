import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, FileText, Receipt, Banknote, PlusCircle, Users, AlertTriangle, Clock, CheckCircle, Activity, Target, Wallet } from "lucide-react";
import { useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useDailyTasks } from "@/hooks/useDailyTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useToast } from "@/hooks/use-toast";
import PaymentProcessingCard from "@/components/finance/PaymentProcessingCard";
import SalaryRequestsCard from "@/components/finance/SalaryRequestsCard";
import DailyReportsCard from "@/components/finance/DailyReportsCard";
import CashManagementCard from "@/components/finance/CashManagementCard";
import ExpensesCard from "@/components/finance/ExpensesCard";

const Finance = () => {
  const {
    transactions,
    expenses,
    payments,
    stats,
    loading,
    addTransaction,
    addExpense,
    processPayment,
    handleModifyPayment,
    refetch
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

  const canManageFloat = hasRole('Supervisor') || hasRole('Operations Manager') || employee?.position === 'Supervisor' || employee?.position === 'Operations Manager';

  const handleExpenseSubmit = () => {
    if (!expenseAmount || !expenseDescription) return;
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
    if (!floatAmount) return;
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
    if (!receiptAmount || !receiptDescription) return;
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

  const handleProcessPayment = async (paymentId: string, method: 'Bank Transfer' | 'Cash', actualAmount?: number) => {
    console.log('Finance page - Processing payment:', paymentId, method, actualAmount ? `Actual amount: ${actualAmount}` : 'Full amount');
    try {
      await processPayment(paymentId, method, actualAmount);
      console.log('Finance page - Payment processed, refreshing data...');
      // The processPayment function now updates local state immediately, so no need to refetch
    } catch (error) {
      console.error('Finance page - Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleModifyPayment = async (paymentId: string, targetDepartment: string, reason: string, comments?: string) => {
    console.log('Finance page - Modifying payment:', paymentId, targetDepartment, reason);
    try {
      await handleModifyPayment(paymentId, targetDepartment, reason, comments);
    } catch (error) {
      console.error('Finance page - Error modifying payment:', error);
      toast({
        title: "Error",
        description: "Failed to send payment for modification. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Layout title="Finance Management" subtitle="Loading...">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const pendingPayments = payments.filter(payment => payment.status === 'Pending');
  const processingPayments = payments.filter(payment => payment.status === 'Processing');
  const completedPayments = payments.filter(payment => payment.status === 'Paid');
  const rejectedPayments = payments.filter(payment => payment.status === 'Rejected');
  const salaryPaymentRequests = approvalRequests.filter(req => req.type === 'Salary Payment');
  const pendingSalaryRequests = salaryPaymentRequests.filter(req => req.status === 'Pending');

  const handleApproveSalaryPayment = async (requestId: string) => {
    const success = await updateRequestStatus(requestId, 'Approved');
    if (success) {
      toast({
        title: "Salary Payment Approved",
        description: "The salary payment request has been approved and will be processed.",
      });
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
      title="Finance Dashboard" 
      subtitle="Comprehensive financial management and reporting"
    >
      <div className="space-y-8">
        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.monthlyRevenue)}</p>
                  <p className="text-xs text-green-600 mt-1">+12.5% from last month</p>
                </div>
                <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Pending Payments</p>
                  <p className="text-2xl font-bold text-amber-900">{formatCurrency(stats.pendingPayments)}</p>
                  <p className="text-xs text-amber-600 mt-1">{pendingPayments.length} transactions</p>
                </div>
                <div className="h-12 w-12 bg-amber-500 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Cash Flow</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.netCashFlow)}</p>
                  <p className="text-xs text-blue-600 mt-1">Net flow today</p>
                </div>
                <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Available Cash</p>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.cashOnHand)}</p>
                  <p className="text-xs text-purple-600 mt-1">Including float</p>
                </div>
                <div className="h-12 w-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Frequently used financial operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <Receipt className="h-6 w-6 mb-2" />
                Issue Receipt
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <CreditCard className="h-6 w-6 mb-2" />
                Process Payment
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                Add Expense
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Banknote className="h-6 w-6 mb-2" />
                Manage Float
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-12">
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="salary-requests" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              HR Requests
            </TabsTrigger>
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Daily Reports
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Cash Mgmt
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <PaymentProcessingCard 
              pendingPayments={pendingPayments}
              processingPayments={processingPayments}
              completedPayments={completedPayments}
              rejectedPayments={rejectedPayments}
              onProcessPayment={handleProcessPayment}
              onModifyPayment={handleModifyPayment}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="salary-requests">
            <SalaryRequestsCard 
              pendingSalaryRequests={pendingSalaryRequests}
              onApproveSalaryPayment={handleApproveSalaryPayment}
              onRejectSalaryPayment={handleRejectSalaryPayment}
            />
          </TabsContent>

          <TabsContent value="daily">
            <DailyReportsCard 
              transactions={transactions}
              dailyTasks={dailyTasks}
              tasksLoading={tasksLoading}
              stats={stats}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="cash">
            <CashManagementCard 
              canManageFloat={canManageFloat}
              floatAmount={floatAmount}
              setFloatAmount={setFloatAmount}
              receiptAmount={receiptAmount}
              setReceiptAmount={setReceiptAmount}
              receiptDescription={receiptDescription}
              setReceiptDescription={setReceiptDescription}
              onFloatSubmit={handleFloatSubmit}
              onReceiptIssue={handleReceiptIssue}
              stats={stats}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesCard 
              expenses={expenses}
              expenseAmount={expenseAmount}
              setExpenseAmount={setExpenseAmount}
              expenseDescription={expenseDescription}
              setExpenseDescription={setExpenseDescription}
              onExpenseSubmit={handleExpenseSubmit}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Performance</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="font-medium">Revenue Growth</span>
                    <span className="text-xl font-bold text-green-600">+12.5%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <span className="font-medium">Profit Margin</span>
                    <span className="text-xl font-bold text-blue-600">
                      {stats.monthlyRevenue > 0 ? ((stats.monthlyRevenue - stats.operatingCosts) / stats.monthlyRevenue * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                    <span className="font-medium">Efficiency Score</span>
                    <span className="text-xl font-bold text-purple-600">87%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Summary</CardTitle>
                  <CardDescription>Financial overview for this month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Total Transactions</span>
                    <span className="text-xl font-bold text-gray-600">{transactions.length + payments.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
                    <span className="font-medium">Pending Approvals</span>
                    <span className="text-xl font-bold text-amber-600">{pendingSalaryRequests.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
                    <span className="font-medium">Daily Tasks</span>
                    <span className="text-xl font-bold text-indigo-600">{dailyTasks.length}</span>
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
