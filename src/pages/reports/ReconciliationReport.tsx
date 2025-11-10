import Layout from "@/components/Layout";
import MonthlyReconciliation from "@/components/reports/MonthlyReconciliation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ReconciliationReport = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Monthly Reconciliation" 
      subtitle="Account reconciliation and balance verification"
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
        <MonthlyReconciliation />
      </div>
    </Layout>
  );
};

export default ReconciliationReport;
