import DashboardLayout from '@/components/DashboardLayout';
import QuotationReviewPanel from '@/components/quotations/QuotationReviewPanel';

const Quotations = () => (
  <DashboardLayout
    title="Quotations"
    subtitle="Company quotations for procurement review and management approval"
  >
    <QuotationReviewPanel />
  </DashboardLayout>
);

export default Quotations;
