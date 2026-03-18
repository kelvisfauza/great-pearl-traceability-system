import { useAuth } from "@/contexts/AuthContext";
import AdminWorkSummary from "./work-summaries/AdminWorkSummary";
import QualityWorkSummary from "./work-summaries/QualityWorkSummary";
import StoreWorkSummary from "./work-summaries/StoreWorkSummary";
import FinanceWorkSummary from "./work-summaries/FinanceWorkSummary";
import EUDRWorkSummary from "./work-summaries/EUDRWorkSummary";
import FieldOpsWorkSummary from "./work-summaries/FieldOpsWorkSummary";
import HRWorkSummary from "./work-summaries/HRWorkSummary";
import ProcurementWorkSummary from "./work-summaries/ProcurementWorkSummary";
import LogisticsWorkSummary from "./work-summaries/LogisticsWorkSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

const WorkSummaryPanel = () => {
  const { employee } = useAuth();
  if (!employee) return null;

  const isAdmin = employee.role === 'Administrator' || employee.role === 'Super Admin' || employee.role === 'Managing Director';
  const department = employee.department;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Your Work Summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Here's what needs your attention today
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Admin always sees admin summary */}
      {isAdmin && <AdminWorkSummary />}

      {/* Department-specific summaries */}
      {(department === 'Quality' || isAdmin) && <QualityWorkSummary />}
      {(department === 'Store' || isAdmin) && <StoreWorkSummary />}
      {(department === 'Finance' || isAdmin) && <FinanceWorkSummary />}
      {(department === 'EUDR' || isAdmin) && <EUDRWorkSummary />}
      {(department === 'Field Operations' || department === 'Field Ops') && <FieldOpsWorkSummary />}
      {(department === 'Human Resource' || department === 'HR') && <HRWorkSummary />}
      {(department === 'Procurement' || isAdmin) && <ProcurementWorkSummary />}
      {(department === 'Logistics') && <LogisticsWorkSummary />}
    </div>
  );
};

export default WorkSummaryPanel;
