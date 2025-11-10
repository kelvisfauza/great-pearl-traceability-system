import Layout from "@/components/Layout";
import { FieldOperationsManagement } from "@/components/admin/FieldOperationsManagement";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FieldOperationsReport = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Field Operations" 
      subtitle="Manage field operations and reports"
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
        <FieldOperationsManagement />
      </div>
    </Layout>
  );
};

export default FieldOperationsReport;
