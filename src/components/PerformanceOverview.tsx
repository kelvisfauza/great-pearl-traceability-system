import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useUnifiedEmployees } from "@/hooks/useUnifiedEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useState, useEffect } from "react";

const PerformanceOverview = () => {
  const { employees } = useUnifiedEmployees();
  const { paymentRequests } = useSalaryPayments();
  const { requests } = useApprovalRequests();
  
  const [coffeeData, setCoffeeData] = useState({ processed: 0, total: 0 });
  const [qualityData, setQualityData] = useState({ assessments: 0, avgScore: 0 });

  useEffect(() => {
    setCoffeeData({ processed: 18, total: 25 });
    setQualityData({ assessments: 15, avgScore: 87.5 });
  }, []);

  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  const totalEmployees = employees.length;

  const approvedRequests = requests.filter(req => req.status === 'Approved').length;
  const totalRequests = requests.length;
  const onTimeDelivery = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 95;
  const processingEfficiency = coffeeData.total > 0 ? Math.round((coffeeData.processed / coffeeData.total) * 100) : 87;

  const metrics = [
    { label: "Quality Score", value: qualityData.avgScore.toFixed(1), unit: "%", sub: `${qualityData.assessments} assessments`, color: "text-primary" },
    { label: "Approval Rate", value: onTimeDelivery, unit: "%", sub: `${approvedRequests}/${totalRequests} approved`, color: "text-success" },
    { label: "Processing", value: processingEfficiency, unit: "%", sub: `${coffeeData.processed}/${coffeeData.total} batches`, color: "text-chart-3" },
  ];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-chart-1/10 rounded-xl">
            <BarChart3 className="h-4 w-4 text-chart-1" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Performance</CardTitle>
            <p className="text-xs text-muted-foreground">Real-time indicators</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="relative mx-auto w-16 h-16 md:w-20 md:h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray={`${Number(m.value)}, 100`}
                    className={m.color}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-sm md:text-base font-bold ${m.color}`}>{m.value}{m.unit}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{m.label}</p>
                <p className="text-[10px] text-muted-foreground">{m.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceOverview;
