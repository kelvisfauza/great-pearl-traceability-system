import Layout from "@/components/Layout";
import RiskAssessmentReport from "@/components/reports/RiskAssessmentReport";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RiskReport = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Risk Assessment" 
      subtitle="AI-powered risk analysis and insights"
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
        <RiskAssessmentReport />
      </div>
    </Layout>
  );
};

export default RiskReport;
