import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { Users } from "lucide-react";

const HRSummarySection = ({ data }: { data: WholeBusinessData["hr"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5 text-amber-600" /> Human Resources
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Active Employees</p>
          <p className="text-xl font-bold">{data.activeEmployees} / {data.totalEmployees}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10">
          <p className="text-sm text-muted-foreground">Present Rate (30d)</p>
          <p className="text-xl font-bold text-green-600">{data.presentRate.toFixed(1)}%</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10">
          <p className="text-sm text-muted-foreground">Late Rate (30d)</p>
          <p className="text-xl font-bold text-red-600">{data.lateRate.toFixed(1)}%</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Logins Today</p>
          <p className="text-xl font-bold">{data.totalLoginToday}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Bonuses Issued</p>
          <p className="text-xl font-bold">{data.totalBonuses}</p>
          <p className="text-sm text-muted-foreground">UGX {data.totalBonusAmount.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Active Advances</p>
          <p className="text-xl font-bold">{data.activeAdvances} / {data.totalAdvances}</p>
        </div>
      </div>

      {data.departments.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Staff Distribution by Department</h4>
          <div className="grid gap-2 md:grid-cols-2">
            {data.departments.map(d => (
              <div key={d.name} className="flex justify-between text-sm p-2 rounded bg-muted/30">
                <span>{d.name}</span>
                <span className="font-medium">{d.count} staff</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

export default HRSummarySection;
