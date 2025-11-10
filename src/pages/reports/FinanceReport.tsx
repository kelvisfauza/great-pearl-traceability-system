import Layout from "@/components/Layout";
import FinanceMonthlyReport from "@/components/reports/FinanceMonthlyReport";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FinanceReport = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Finance Report" 
      subtitle="Monthly financial overview and analysis"
    >
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/reports")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>
        <FinanceMonthlyReport />
      </div>
    </Layout>
  );
};

export default FinanceReport;
