import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Printer } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { printWholeBusinessReport } from "@/utils/printWholeBusinessReport";

const getMonthOptions = () => {
  const options: { label: string; value: string; start: string; end: string }[] = [
    { label: "All Time", value: "all", start: "", end: "" },
  ];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    const start = format(startOfMonth(d), "yyyy-MM-dd");
    const end = format(endOfMonth(d), "yyyy-MM-dd");
    options.push({
      label: format(d, "MMMM yyyy"),
      value: start,
      start,
      end,
    });
  }
  return options;
};

const WholeBusinessReport = () => {
  const navigate = useNavigate();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState("all");

  const selected = monthOptions.find(m => m.value === selectedMonth);
  const dateRange = selected && selected.value !== "all"
    ? { start: selected.start, end: selected.end }
    : undefined;

  const { data, loading, refetch } = useWholeBusinessReport(dateRange);

  const periodLabel = selected && selected.value !== "all" ? selected.label : "All Time";

  const handlePrint = () => {
    if (data) {
      printWholeBusinessReport(data, periodLabel);
    }
  };

  return (
    <Layout
      title="Whole Business Report"
      subtitle="Comprehensive business intelligence across all departments"
    >
      <div className="space-y-6 print:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button variant="outline" onClick={() => navigate("/reports")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : data ? (
          <>
            <BusinessOverviewSection data={data} periodLabel={periodLabel} />
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
        ) : null}
      </div>
    </Layout>
  );
};

export default WholeBusinessReport;
