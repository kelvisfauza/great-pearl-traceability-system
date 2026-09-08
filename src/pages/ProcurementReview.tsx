import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ProcurementReviewPanel from '@/components/procurement/ProcurementReviewPanel';

const ProcurementReview = () => (
  <DashboardLayout
    title="Procurement Review"
    subtitle="First-stage review of money requests before administration approves"
  >
    <ProcurementReviewPanel />
  </DashboardLayout>
);

export default ProcurementReview;
