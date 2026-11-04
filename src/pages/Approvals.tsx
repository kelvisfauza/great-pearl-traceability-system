import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ApprovalCenter from '@/components/ApprovalCenter';
import ApprovedRequestsHistory from '@/components/admin/ApprovedRequestsHistory';
import AdminQualityPricingReview from '@/components/admin/AdminQualityPricingReview';
import ContractRenewalApprovals from '@/components/admin/ContractRenewalApprovals';
import MealDisbursementSection from '@/components/admin/MealDisbursementSection';
import ServiceProviderPayments from '@/components/admin/ServiceProviderPayments';
import ProviderSubmissionApprovals from '@/components/admin/ProviderSubmissionApprovals';
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
    <div className="flex items-baseline justify-between gap-2 border-b pb-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
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
    { label: 'Requests waiting', value: requests.length.toLocaleString() },
    { label: 'Value waiting', value: `UGX ${total.toLocaleString()}` },
    { label: 'Need 2nd admin', value: secondAdmin.toLocaleString() },
    { label: 'Failed payouts', value: failed.toLocaleString(), alert: failed > 0 },
  ];

  const tabs = [
    { value: 'requests', label: 'Requests', icon: Inbox, badge: requests.length },
    { value: 'payments', label: 'Payments', icon: Wallet },
    { value: 'operations', label: 'Procurement & quality', icon: ClipboardList },
    { value: 'security', label: 'Security', icon: ShieldCheck },
    { value: 'history', label: 'History', icon: History },
  ];

  return (
    <DashboardLayout title="Approvals" subtitle="Admin decision desk">
      <div className="space-y-6">
        {/* Page header */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 sm:p-6 border-b">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Administration</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Approval desk</h2>
            <p className="text-sm text-muted-foreground">Every item that needs an administrator's decision, grouped by type.</p>
          </div>
          <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0">
            {stats.map((s) => (
              <div key={s.label} className="p-4 sm:p-5">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums truncate ${s.alert ? 'text-destructive' : 'text-foreground'}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Tabs defaultValue="requests" className="space-y-5">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border bg-card p-1">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}
                className="gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shrink-0">
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.badge ? <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-foreground">{t.badge}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="requests" className="mt-0">
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
              <ProviderSubmissionApprovals />
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
