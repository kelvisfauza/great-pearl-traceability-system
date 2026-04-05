import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnifiedEmployees } from "@/hooks/useUnifiedEmployees";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { BarChart3 } from "lucide-react";

const PerformanceOverview = () => {
  const { employees } = useUnifiedEmployees();
  const { requests } = useApprovalRequests();

  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  const totalEmployees = employees.length;
  const approvedRequests = requests.filter(req => req.status === 'Approved' || req.status === 'Fully Approved').length;
  const totalRequests = requests.length;
  const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  const metrics = [
    { label: "Staff Active", value: activeEmployees, total: totalEmployees, color: 'chart-1' },
    { label: "Approval Rate", value: approvalRate, total: 100, suffix: '%', color: 'success' },
    { label: "Pending", value: pendingCount, total: totalRequests || 1, color: pendingCount > 0 ? 'destructive' : 'chart-4' },
  ];

  return (
    <Card className="border-border/30 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-chart-1 via-chart-4 to-chart-2" />
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-chart-1/10 rounded-lg">
            <BarChart3 className="h-4 w-4 text-chart-1" />
          </div>
          <CardTitle className="text-sm font-bold">Key Metrics</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        <div className="space-y-5">
          {metrics.map((m, i) => {
            const pct = m.suffix === '%' ? m.value : (m.total > 0 ? Math.round((m.value / m.total) * 100) : 0);
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground">{m.label}</span>
                  <span className={`text-sm font-black text-${m.color}`}>
                    {m.value}{m.suffix || ''} 
                    {!m.suffix && <span className="text-[10px] text-muted-foreground font-normal ml-1">/ {m.total}</span>}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-${m.color} rounded-full transition-all duration-700`} 
                    style={{ width: `${Math.min(pct, 100)}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick summary */}
        <div className="mt-5 pt-4 border-t border-border/30 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-black text-foreground">{totalRequests}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Requests</p>
          </div>
          <div>
            <p className="text-lg font-black text-success">{approvedRequests}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Approved</p>
          </div>
          <div>
            <p className="text-lg font-black text-destructive">{requests.filter(r => r.status === 'Rejected').length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Rejected</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceOverview;
