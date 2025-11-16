import React, { useState, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTabs } from '@/components/ui/responsive-tabs';
import { Button } from '@/components/ui/button';
import { DollarSign, Wallet, Receipt, Users, TrendingUp, Coffee, CheckCircle, HandCoins, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceStats } from '@/components/finance/FinanceStats';
import { PendingCashDeposits } from '@/components/finance/PendingCashDeposits';

// Lazy load heavy components
const PendingApprovalRequests = lazy(() => import('@/components/finance/PendingApprovalRequests'));
const PendingCoffeePayments = lazy(() => import('@/components/finance/PendingCoffeePayments').then(m => ({ default: m.PendingCoffeePayments })));
const CompletedTransactions = lazy(() => import('@/components/finance/CompletedTransactions').then(m => ({ default: m.CompletedTransactions })));
const SupplierAdvancesPage = lazy(() => import('@/components/finance/SupplierAdvancesPage').then(m => ({ default: m.SupplierAdvancesPage })));
const PaymentHistory = lazy(() => import('@/components/finance/PaymentHistory').then(m => ({ default: m.PaymentHistory })));
const ExpenseManagement = lazy(() => import('@/components/finance/ExpenseManagement').then(m => ({ default: m.ExpenseManagement })));
const HRPayments = lazy(() => import('@/components/finance/HRPayments').then(m => ({ default: m.HRPayments })));
const MoneyRequestsManager = lazy(() => import('@/components/finance/MoneyRequestsManager').then(m => ({ default: m.default })));
const DayBook = lazy(() => import('@/components/reports/DayBook'));
const FinanceReports = lazy(() => import('@/components/finance/FinanceReports').then(m => ({ default: m.FinanceReports })));
const SupplierAdvanceModal = lazy(() => import('@/components/finance/SupplierAdvanceModal'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const Finance = () => {
  const { hasPermission } = useAuth();
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  if (!hasPermission('Finance')) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-4 animate-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 hidden sm:block"></div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Wallet className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gradient">
                  Finance Department
                </h1>
              </div>
              <div className="flex-1 flex justify-center sm:justify-end">
                <Button 
                  onClick={() => setShowAdvanceModal(true)}
                  className="btn-glow bg-warning hover:bg-warning/90 text-warning-foreground shadow-md hover:shadow-lg transition-all"
                  size="sm"
                >
                  <HandCoins className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Give Supplier Advance</span>
                  <span className="sm:hidden">Advance</span>
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">Manage coffee payments, expenses, and financial operations</p>
          </div>

          {/* Finance Statistics */}
          <div className="animate-in-delay">
            <FinanceStats />
          </div>
          
          {/* Pending Cash Deposits for Finance Confirmation */}
          <div className="animate-in-delay">
            <PendingCashDeposits />
          </div>

          {/* Main Finance Tabs */}
          <Card className="card-modern animate-in-delay">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <TrendingUp className="h-5 w-5 text-primary" />
                Financial Management
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Complete financial operations management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveTabs
                defaultValue="pending-approvals"
                visibleTabsCount={4}
                tabs={[
                  {
                    value: "pending-approvals",
                    icon: <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />,
                    label: <><span className="hidden sm:inline">Pending Approvals</span><span className="sm:hidden">Approvals</span></>,
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <PendingApprovalRequests />
                      </Suspense>
                    )
                  },
                  {
                    value: "pending-coffee",
                    icon: <Coffee className="h-3 w-3 md:h-4 md:w-4" />,
                    label: <><span className="hidden sm:inline">Pending Coffee</span><span className="sm:hidden">Coffee</span></>,
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <PendingCoffeePayments />
                      </Suspense>
                    )
                  },
                  {
                    value: "completed",
                    icon: <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />,
                    label: <><span className="hidden sm:inline">Completed</span><span className="sm:hidden">Done</span></>,
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <CompletedTransactions />
                      </Suspense>
                    )
                  },
                  {
                    value: "advances",
                    icon: <HandCoins className="h-3 w-3 md:h-4 md:w-4" />,
                    label: "Advances",
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <SupplierAdvancesPage />
                      </Suspense>
                    )
                  },
                  {
                    value: "payments",
                    icon: <Receipt className="h-3 w-3 md:h-4 md:w-4" />,
                    label: "Payments",
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <PaymentHistory />
                      </Suspense>
                    )
                  },
                  {
                    value: "expenses",
                    icon: <DollarSign className="h-3 w-3 md:h-4 md:w-4" />,
                    label: "Expenses",
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <ExpenseManagement />
                      </Suspense>
                    )
                  },
                  {
                    value: "hr-payments",
                    icon: <Users className="h-3 w-3 md:h-4 md:w-4" />,
                    label: <><span className="hidden sm:inline">HR Payments</span><span className="sm:hidden">HR</span></>,
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <HRPayments />
                      </Suspense>
                    )
                  },
                  {
                    value: "daybook",
                    icon: <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />,
                    label: <><span className="hidden sm:inline">Day Book</span><span className="sm:hidden">Book</span></>,
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <DayBook />
                      </Suspense>
                    )
                  },
                  {
                    value: "reports",
                    icon: <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />,
                    label: "Reports",
                    content: (
                      <Suspense fallback={<LoadingSpinner />}>
                        <FinanceReports />
                      </Suspense>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Suspense fallback={null}>
        <SupplierAdvanceModal 
          open={showAdvanceModal}
          onClose={() => setShowAdvanceModal(false)}
        />
      </Suspense>
    </Layout>
  );
};

export default Finance;