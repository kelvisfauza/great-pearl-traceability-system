import Layout from "@/components/Layout";
import StoreReportForm from "@/components/reports/StoreReportForm";
import StorePrintReportGenerator from "@/components/reports/StorePrintReportGenerator";
import StoreReportsList from "@/components/reports/StoreReportsList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StoreReports = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Store Reports" 
      subtitle="Inventory and store management reports"
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
        <div className="grid gap-6">
          <StoreReportForm />
          <StorePrintReportGenerator />
          <StoreReportsList />
        </div>
      </div>
    </Layout>
  );
};

export default StoreReports;
