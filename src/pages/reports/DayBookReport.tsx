import Layout from "@/components/Layout";
import DayBook from "@/components/reports/DayBook";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DayBookReport = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Day Book" 
      subtitle="Daily transaction records"
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
        <DayBook />
      </div>
    </Layout>
  );
};

export default DayBookReport;
