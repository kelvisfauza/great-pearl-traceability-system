import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ApprovalCenter from '@/components/ApprovalCenter';
import ApprovedRequestsHistory from '@/components/admin/ApprovedRequestsHistory';
import AdminQualityPricingReview from '@/components/admin/AdminQualityPricingReview';
import ContractRenewalApprovals from '@/components/admin/ContractRenewalApprovals';
import MealDisbursementSection from '@/components/admin/MealDisbursementSection';
import ServiceProviderPayments from '@/components/admin/ServiceProviderPayments';
import ProviderSubmissionApprovals from '@/components/admin/ProviderSubmissionApprovals';
import QuickLoans from '@/pages/QuickLoans';
import SupportStaffPerDiemSection from '@/components/admin/SupportStaffPerDiemSection';
import AdminWalletOperations from '@/components/admin/AdminWalletOperations';
import BankDepositApprovals from '@/components/admin/BankDepositApprovals';
import QuotationApprovals from '@/components/quotations/QuotationApprovals';
import DeviceLoginApprovals from '@/components/admin/DeviceLoginApprovals';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useUnifiedApprovalRequests } from '@/hooks/useUnifiedApprovalRequests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Inbox, Wallet, ClipboardList, ShieldCheck, History } from 'lucide-react';

const Section = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-baseline justify-between gap-2 border-b border-l-4 border-l-primary pl-3 pb-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">{title}</h3>
      <p className="text-xs text-muted-foreground hidden sm:block">{hint}</p>
    </div>
    {children}
  </section>
);

const Approvals = () => {
  const { isAdmin } = useAuth();
  const { requests } = useUnifiedApprovalRequests();

  if (!isAdmin()) return <Navigate to="/" replace />;

  const total = requests.reduce((s, r) => {
    const n = typeof r.amount === 'string' ? parseFloat(String(r.amount).replace(/[^\d.-]/g, '')) : Number(r.amount);
    return s + (isNaN(n) ? 0 : n);
  }, 0);
  const secondAdmin = requests.filter((r) => r.status === 'Pending Admin 2').length;
  const failed = requests.filter((r) => r.details?.is_failed_payout).length;

  const stats = [
    { label: 'Requests waiting', value: requests.length.toLocaleString(), icon: Inbox, box: 'bg-primary/10 border-primary/30', text: 'text-primary' },
    { label: 'Value waiting', value: `UGX ${total.toLocaleString()}`, icon: Wallet, box: 'bg-accent/15 border-accent/40', text: 'text-accent-foreground' },
    { label: 'Need 2nd admin', value: secondAdmin.toLocaleString(), icon: ShieldCheck, box: 'bg-secondary border-secondary-foreground/20', text: 'text-secondary-foreground' },
    { label: 'Failed payouts', value: failed.toLocaleString(), icon: History, alert: failed > 0, box: failed > 0 ? 'bg-destructive/10 border-destructive/40' : 'bg-muted border-border', text: failed > 0 ? 'text-destructive' : 'text-muted-foreground' },
  ];

  const tabs = [
    { value: 'requests', label: 'Requests', icon: Inbox, badge: requests.length, active: 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground' },
    { value: 'payments', label: 'Payments', icon: Wallet, active: 'data-[state=active]:bg-accent data-[state=active]:text-accent-foreground' },
    { value: 'operations', label: 'Procurement & quality', icon: ClipboardList, active: 'data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground' },
    { value: 'security', label: 'Security', icon: ShieldCheck, active: 'data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground' },
    { value: 'history', label: 'History', icon: History, active: 'data-[state=active]:bg-muted-foreground data-[state=active]:text-background' },
  ];

  return (
    <DashboardLayout title="Approvals" subtitle="Admin decision desk">
      <div className="space-y-6">
        {/* Page header */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b bg-gradient-to-r from-primary/15 via-accent/10 to-transparent">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Administration</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Approval desk</h2>
            <p className="text-sm text-muted-foreground">Every item that needs an administrator's decision, grouped by type.</p>
          </div>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-xl border p-4 ${s.box}`}>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <s.icon className={`h-3.5 w-3.5 ${s.text}`} />
                  {s.label}
                </dt>
                <dd className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums truncate ${s.text}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Tabs defaultValue="requests" className="space-y-5">
          <TabsList className="h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-xl border bg-card p-1.5">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}
                className={`gap-2 rounded-lg px-3 py-2 shrink-0 transition-colors data-[state=active]:shadow-md ${t.active}`}>
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.badge ? <span className="rounded-full bg-background/25 px-1.5 text-[11px] font-semibold">{t.badge}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="requests" className="mt-0 space-y-5">
            <QuickLoans approvalDesk />
            <ProviderSubmissionApprovals />
            <ApprovalCenter />
          </TabsContent>

          <TabsContent value="payments" className="mt-0 space-y-8">
            <Section title="Wallet operations" hint="Admin-started wallet credits and deductions">
              <AdminWalletOperations />
            </Section>
            <Section title="Bank deposit withdrawals" hint="Admin review before final payment">
              <BankDepositApprovals />
            </Section>
            <Section title="Service providers" hint="Provider payments and self-submitted requests">
              <ServiceProviderPayments />
            </Section>
            <Section title="Meals and per diem" hint="Meal plans and support staff per diem">
              <MealDisbursementSection />
              <SupportStaffPerDiemSection />
            </Section>
          </TabsContent>

          <TabsContent value="operations" className="mt-0 space-y-8">
            <Section title="Quotations" hint="Recommended by Procurement">
              <QuotationApprovals />
            </Section>
            <Section title="Quality pricing" hint="Assessments waiting for a price">
              <AdminQualityPricingReview />
            </Section>
            <Section title="Contract renewals" hint="Staff contract renewal requests">
              <ContractRenewalApprovals />
            </Section>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <Section title="New device sign-ins" hint="Authorise or block unrecognised devices">
              <DeviceLoginApprovals />
            </Section>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <ApprovedRequestsHistory />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Approvals;
