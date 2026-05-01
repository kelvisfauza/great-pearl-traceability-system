import Layout from "@/components/Layout";
import CoffeeAuditTrailReport from "@/components/reports/CoffeeAuditTrailReport";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CoffeeAuditTrailReportPage = () => {
  const navigate = useNavigate();
  return (
    <Layout title="Coffee Audit Trail" subtitle="End-to-end traceability: Store → Inventory → Sales">
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate("/reports")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Button>
        <CoffeeAuditTrailReport />
      </div>
    </Layout>
  );
};

export default CoffeeAuditTrailReportPage;