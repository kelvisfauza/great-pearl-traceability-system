import { FinanceWalletOpsAndBalances } from '@/components/finance/FinanceWalletOpsAndBalances';
import FinanceProviderReleases from '@/components/finance/FinanceProviderReleases';
import FinancePaymentHistory from '@/components/finance/FinancePaymentHistory';
import { FinanceOvertimePayments } from '@/components/finance/FinanceOvertimePayments';
import { FinanceInitiateWithdrawal } from '@/components/finance/FinanceInitiateWithdrawal';
import FinanceQuotationPayments from '@/components/finance/FinanceQuotationPayments';
import FinanceSamplingOrderPayments from '@/components/finance/FinanceSamplingOrderPayments';
import React, { useState, lazy, Suspense } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign, Wallet, Receipt, Users, Coffee, HandCoins, Loader2, Zap, History,
  BookOpen, BarChart3, ArrowRight, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsGrnInputOnly } from '@/hooks/useGrnInputRole';
import { FinanceStats } from '@/components/finance/FinanceStats';
import { PendingCashDeposits } from '@/components/finance/PendingCashDeposits';
import { AwaitingDisbursementPanel } from '@/components/approval/AwaitingDisbursementPanel';
import { cn } from '@/lib/utils';
import heroImg from '@/assets/finance-hero.jpg';

const PendingApprovalRequests = lazy(() => import('@/components/finance/PendingApprovalRequests'));
const PendingCoffeePayments = lazy(() => import('@/components/finance/PendingCoffeePayments').then(m => ({ default: m.PendingCoffeePayments })));
const CompletedTransactions = lazy(() => import('@/components/finance/CompletedTransactions').then(m => ({ default: m.CompletedTransactions })));
const SupplierAdvancesPage = lazy(() => import('@/components/finance/SupplierAdvancesPage').then(m => ({ default: m.SupplierAdvancesPage })));
const PaymentHistory = lazy(() => import('@/components/finance/PaymentHistory').then(m => ({ default: m.PaymentHistory })));
const ExpenseManagement = lazy(() => import('@/components/finance/ExpenseManagement').then(m => ({ default: m.ExpenseManagement })));
const HRPayments = lazy(() => import('@/components/finance/HRPayments').then(m => ({ default: m.HRPayments })));
const WithdrawalRequestsManager = lazy(() => import('@/components/finance/WithdrawalRequestsManager').then(m => ({ default: m.WithdrawalRequestsManager })));
const DayBook = lazy(() => import('@/components/reports/DayBook'));
const FinanceReports = lazy(() => import('@/components/finance/FinanceReports').then(m => ({ default: m.FinanceReports })));
const SupplierAdvanceModal = lazy(() => import('@/components/finance/SupplierAdvanceModal'));
const InstantWithdrawalHistory = lazy(() => import('@/components/finance/InstantWithdrawalHistory'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

type Section = {
  value: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  tone: string; // tailwind token classes for the icon chip
};

const SECTIONS: Section[] = [
  { value: 'action', label: 'Action needed', hint: 'Payouts waiting for you', icon: Zap, tone: 'bg-destructive/10 text-destructive' },
  { value: 'coffee', label: 'Coffee payments', hint: 'Supplier lots to pay', icon: Coffee, tone: 'bg-primary/10 text-primary' },
  { value: 'withdrawals', label: 'Withdrawals', hint: 'Staff wallet requests', icon: Wallet, tone: 'bg-accent/15 text-accent-foreground' },
  { value: 'advances', label: 'Advances', hint: 'Supplier advances', icon: HandCoins, tone: 'bg-warning/15 text-warning' },
  { value: 'expenses', label: 'Expenses', hint: 'Company spending', icon: DollarSign, tone: 'bg-secondary text-secondary-foreground' },
  { value: 'hr', label: 'HR payments', hint: 'Salaries & staff pay', icon: Users, tone: 'bg-primary/10 text-primary' },
  { value: 'history', label: 'History', hint: 'Paid & completed', icon: History, tone: 'bg-muted text-muted-foreground' },
  { value: 'daybook', label: 'Day book', hint: 'Daily cash record', icon: BookOpen, tone: 'bg-accent/15 text-accent-foreground' },
  { value: 'reports', label: 'Reports', hint: 'Print & analyse', icon: BarChart3, tone: 'bg-secondary text-secondary-foreground' },
];

const HISTORY_VIEWS = [
  { value: 'completed', label: 'Completed' },
  { value: 'payments', label: 'Coffee payments' },
  { value: 'releases', label: 'Released payouts' },
  { value: 'instant', label: 'Instant withdrawals' },
];

const Finance = () => {
  const { hasPermission, employee } = useAuth() as any;
  const scanOnly = useIsGrnInputOnly();
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [active, setActive] = useState(scanOnly ? 'history' : 'action');
  const [historyView, setHistoryView] = useState(scanOnly ? 'payments' : 'completed');

  if (!hasPermission('Finance')) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access Finance management.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const sections = scanOnly ? SECTIONS.filter(s => s.value === 'history') : SECTIONS;
  const historyViews = scanOnly ? HISTORY_VIEWS.filter(v => v.value === 'payments') : HISTORY_VIEWS;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (employee?.name || '').split(' ')[0];
  const current = sections.find(s => s.value === active) || sections[0];

  const renderSection = () => {
    switch (current.value) {
      case 'action':
        return (
          <div className="space-y-6">
            <PendingCashDeposits />
            <AwaitingDisbursementPanel />
            <PendingApprovalRequests />
            <FinanceWalletOpsAndBalances />
            <FinanceProviderReleases />
            <FinanceOvertimePayments />
            <FinanceQuotationPayments />
            <FinanceSamplingOrderPayments />
            <FinanceInitiateWithdrawal />
          </div>
        );
      case 'coffee': return <PendingCoffeePayments />;
      case 'withdrawals': return <div className="space-y-6"><WithdrawalRequestsManager /><InstantWithdrawalHistory /></div>;
      case 'advances': return <SupplierAdvancesPage />;
      case 'expenses': return <ExpenseManagement />;
      case 'hr': return <HRPayments />;
      case 'daybook': return <DayBook />;
      case 'reports': return <FinanceReports />;
      case 'history':
        return (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {historyViews.map(v => (
                <Button
                  variant="ghost"
                  key={v.value}
                  onClick={() => setHistoryView(v.value)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-all',
                    historyView === v.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {v.label}
                </Button>
              ))}
            </div>
            {historyView === 'completed' && <CompletedTransactions />}
            {historyView === 'payments' && <PaymentHistory />}
            {historyView === 'releases' && <FinancePaymentHistory />}
            {historyView === 'instant' && <InstantWithdrawalHistory />}
          </div>
        );
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-5 sm:space-y-7">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-xl animate-in">
            <img
              src={heroImg}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/10" />
            <div className="relative px-5 py-7 sm:px-10 sm:py-10 max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Finance workspace
              </span>
              <h1 className="font-display text-3xl sm:text-5xl leading-tight">
                {greet}{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="text-sm sm:text-base text-primary-foreground/80">
                Pay suppliers, release staff money and keep the books balanced — everything that needs you is one tap away.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {!scanOnly && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setActive('action')}
                      className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-full"
                    >
                      <Zap className="h-4 w-4 mr-1.5" /> What needs paying
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAdvanceModal(true)}
                      className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    >
                      <HandCoins className="h-4 w-4 mr-1.5" /> Give supplier advance
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>

          {!scanOnly && (
            <div className="animate-in-delay">
              <FinanceStats />
            </div>
          )}

          {/* Section tiles */}
          <nav className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {sections.map(s => {
              const Icon = s.icon;
              const on = s.value === current.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setActive(s.value)}
                  className={cn(
                    'group snap-start shrink-0 w-40 sm:w-44 text-left rounded-2xl border p-3.5 transition-all duration-300',
                    on
                      ? 'border-primary bg-card shadow-lg ring-2 ring-primary/20 -translate-y-0.5'
                      : 'border-border bg-card/70 hover:bg-card hover:shadow-md hover:-translate-y-0.5'
                  )}
                >
                  <div className={cn('mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl', s.tone)}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="font-semibold text-sm leading-tight">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    {s.hint}
                    <ArrowRight className={cn('h-3 w-3 transition-transform', on ? 'translate-x-0.5 text-primary' : 'opacity-0 group-hover:opacity-100')} />
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Active section */}
          <Card className="rounded-3xl border-border/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b bg-muted/30 px-4 sm:px-6 py-4">
              <div className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl', current.tone)}>
                <current.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl sm:text-2xl leading-none">{current.label}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{current.hint}</p>
              </div>
            </div>
            <CardContent className="p-3 sm:p-6">
              <Suspense fallback={<LoadingSpinner />}>
                <div key={current.value} className="animate-fade-in">{renderSection()}</div>
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>

      <Suspense fallback={null}>
        <SupplierAdvanceModal open={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} />
      </Suspense>
    </Layout>
  );
};

export default Finance;
