import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, FileText, Receipt, Banknote, PlusCircle, Users, AlertTriangle, Clock, CheckCircle, Activity, Target, Wallet } from "lucide-react";
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
import SupplierAdvanceModal from "@/components/finance/SupplierAdvanceModal";
import AdvanceClearingModal from "@/components/finance/AdvanceClearingModal";
import CustomerBalancesCard from "@/components/finance/CustomerBalancesCard";
import QualityAssessmentReports from "@/components/finance/QualityAssessmentReports";
import CashManagementDashboard from "@/components/finance/CashManagementDashboard";
import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Finance = () => {
  const {
    transactions,
    expenses,
    payments,
    stats,
    loading,
    supplierAdvances,
    addTransaction,
    addExpense,
    processPayment,
    handleModifyPayment: modifyPaymentFromHook,
    refetch
  } = useFinanceData();

  const { tasks: dailyTasks, loading: tasksLoading } = useDailyTasks();
  const { requests: approvalRequests, updateRequestStatus } = useApprovalRequests();
  const { employee, hasRole, hasPermission } = useAuth();
  const { toast } = useToast();

  const [currentSection, setCurrentSection] = useState("quality-reports");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [floatAmount, setFloatAmount] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptDescription, setReceiptDescription] = useState("");
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [clearingModalOpen, setClearingModalOpen] = useState(false);

  const canManageFloat = hasRole('Supervisor') || hasRole('Operations Manager') || employee?.position === 'Supervisor' || employee?.position === 'Operations Manager';

  if (!hasPermission('Finance')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <div className="mb-4">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access Finance management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    } catch (error) {
      console.error('Finance page - Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePaymentModification = async (paymentId: string, targetDepartment: string, reason: string, comments?: string) => {
    console.log('Finance page - Modifying payment:', paymentId, targetDepartment, reason);
    try {
      await modifyPaymentFromHook(paymentId, targetDepartment, reason, comments);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
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

  const renderMainContent = () => {
    switch (currentSection) {
      case "quality-reports":
        return (
          <QualityAssessmentReports
            onProcessPayment={(paymentData) => {
              console.log('Processing payment from quality report:', paymentData);
              handleProcessPayment(paymentData.id, paymentData.method, paymentData.paid_amount);
            }}
            formatCurrency={formatCurrency}
          />
        );

      case "payments":
        return (
          <PaymentProcessingCard 
            pendingPayments={pendingPayments}
            processingPayments={processingPayments}
            completedPayments={completedPayments}
            rejectedPayments={rejectedPayments}
            onProcessPayment={handleProcessPayment}
            onModifyPayment={handlePaymentModification}
            formatCurrency={formatCurrency}
          />
        );

      case "balances":
        return <CustomerBalancesCard formatCurrency={formatCurrency} />;

      case "salary-requests":
        return (
          <SalaryRequestsCard 
            pendingSalaryRequests={pendingSalaryRequests}
            onApproveSalaryPayment={handleApproveSalaryPayment}
            onRejectSalaryPayment={handleRejectSalaryPayment}
          />
        );

      case "advances":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Supplier Advances
              </CardTitle>
              <CardDescription>
                Manage advances given to suppliers for coffee purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-700">Total Advances Given</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(supplierAdvances?.filter(a => a.status === 'Active').reduce((sum, a) => sum + (a.amount || 0), 0) || 0)}</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm font-medium text-amber-700">Active Advances</p>
                    <p className="text-2xl font-bold text-amber-900">{supplierAdvances?.filter(a => a.status === 'Active').length || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-700">Completed</p>
                    <p className="text-2xl font-bold text-green-900">{supplierAdvances?.filter(a => a.status === 'Completed').length || 0}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setAdvanceModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Give Advance
                  </Button>
                  <Button 
                    onClick={() => setClearingModalOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Clear Advance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "daily":
        return (
          <DailyReportsCard 
            dailyTasks={dailyTasks}
            tasksLoading={tasksLoading}
            transactions={transactions}
            stats={stats}
            formatCurrency={formatCurrency}
          />
        );

      case "cash":
        return (
          <CashManagementDashboard 
            formatCurrency={formatCurrency}
            availableCash={stats.cashOnHand}
            onCashTransaction={(transaction) => {
              console.log('Cash transaction processed:', transaction);
              toast({
                title: "Transaction Processed",
                description: `${transaction.type} of ${formatCurrency(transaction.amount)} processed`
              });
            }}
          />
        );

      case "expenses":
        return (
          <ExpensesCard 
            expenses={expenses}
            expenseAmount={expenseAmount}
            setExpenseAmount={setExpenseAmount}
            expenseDescription={expenseDescription}
            setExpenseDescription={setExpenseDescription}
            onExpenseSubmit={handleExpenseSubmit}
            formatCurrency={formatCurrency}
          />
        );

      case "analytics":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Financial Analytics
                </CardTitle>
                <CardDescription>
                  Comprehensive financial performance insights and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Revenue Growth</p>
                        <p className="text-2xl font-bold text-green-900">+12.5%</p>
                        <p className="text-xs text-green-600">vs last month</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Payment Efficiency</p>
                        <p className="text-2xl font-bold text-blue-900">94.2%</p>
                        <p className="text-xs text-blue-600">on-time payments</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700">Cash Turnover</p>
                        <p className="text-2xl font-bold text-purple-900">8.3x</p>
                        <p className="text-xs text-purple-600">monthly rate</p>
                      </div>
                      <Activity className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-700">Cost Reduction</p>
                        <p className="text-2xl font-bold text-amber-900">-5.8%</p>
                        <p className="text-xs text-amber-600">operational costs</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-amber-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Select a section from the sidebar to begin</p>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <FinanceSidebar 
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
        />
        
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <div>
                <h1 className="text-2xl font-bold">Finance Dashboard</h1>
                <p className="text-sm text-muted-foreground">Comprehensive financial management and reporting</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                onClick={() => {
                  const issueReceiptButton = document.querySelector('[data-action="issue-receipt"]');
                  if (issueReceiptButton) {
                    (issueReceiptButton as HTMLElement).click();
                  }
                }}
                className="hidden md:flex items-center gap-2"
              >
                <Receipt className="h-4 w-4" />
                Issue Receipt
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdvanceModalOpen(true)}
                className="hidden md:flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Give Advance
              </Button>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 p-6">
            
            {/* Key Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            {/* Main Content */}
            <div className="space-y-6">
              {renderMainContent()}
            </div>
          </div>
        </main>

        {/* Modals */}
        <SupplierAdvanceModal 
          open={advanceModalOpen}
          onClose={() => setAdvanceModalOpen(false)}
        />
        
        <AdvanceClearingModal 
          open={clearingModalOpen}
          onClose={() => setClearingModalOpen(false)}
        />
      </div>
    </SidebarProvider>
  );
};

export default Finance;