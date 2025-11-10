import Layout from "@/components/Layout";
import { ExpensesReport as ExpensesComponent } from "@/components/reports/ExpensesReport";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ExpensesReport = () => {
  const navigate = useNavigate();

  return (
    <Layout 
      title="Expenses Report" 
      subtitle="Track and analyze business expenses"
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
        <ExpensesComponent />
      </div>
    </Layout>
  );
};

export default ExpensesReport;
