import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Download, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useWholeBusinessReport } from "@/hooks/useWholeBusinessReport";
import BusinessOverviewSection from "@/components/reports/business/BusinessOverviewSection";
import DepartmentRankingSection from "@/components/reports/business/DepartmentRankingSection";
import FinanceSummarySection from "@/components/reports/business/FinanceSummarySection";
import ProcurementSummarySection from "@/components/reports/business/ProcurementSummarySection";
import SalesSummarySection from "@/components/reports/business/SalesSummarySection";
import InventorySummarySection from "@/components/reports/business/InventorySummarySection";
import QualitySummarySection from "@/components/reports/business/QualitySummarySection";
import HRSummarySection from "@/components/reports/business/HRSummarySection";
import FieldOpsSummarySection from "@/components/reports/business/FieldOpsSummarySection";
import RecommendationsSection from "@/components/reports/business/RecommendationsSection";
import { Skeleton } from "@/components/ui/skeleton";

const WholeBusinessReport = () => {
  const navigate = useNavigate();
  const { data, loading, refetch } = useWholeBusinessReport();

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout title="Whole Business Report" subtitle="Loading comprehensive report...">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Whole Business Report"
      subtitle="Comprehensive business intelligence across all departments"
    >
      <div className="space-y-6 print:space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" onClick={() => navigate("/reports")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {data && (
          <>
            <BusinessOverviewSection data={data} />
            <DepartmentRankingSection data={data} />
            <FinanceSummarySection data={data.finance} />
            <ProcurementSummarySection data={data.procurement} />
            <SalesSummarySection data={data.sales} />
            <InventorySummarySection data={data.inventory} />
            <QualitySummarySection data={data.quality} />
            <HRSummarySection data={data.hr} />
            <FieldOpsSummarySection data={data.fieldOps} />
            <RecommendationsSection data={data} />
          </>
        )}
      </div>
    </Layout>
  );
};

export default WholeBusinessReport;
