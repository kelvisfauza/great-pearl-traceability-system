import Layout from "@/components/Layout";
import SalesReportsList from "@/components/reports/SalesReportsList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalesReports = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Sales Reports" 
      subtitle="Sales performance and trends analysis"
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
        <SalesReportsList />
      </div>
    </Layout>
  );
};

export default SalesReports;
