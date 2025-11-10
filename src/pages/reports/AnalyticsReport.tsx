import Layout from "@/components/Layout";
import PerformanceDashboard from "@/components/reports/PerformanceDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AnalyticsReport = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Performance Analytics" 
      subtitle="Business performance metrics and trends"
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
        <PerformanceDashboard />
      </div>
    </Layout>
  );
};

export default AnalyticsReport;
