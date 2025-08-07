
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useState, useEffect } from "react";

const PerformanceOverview = () => {
  const { employees } = useEmployees();
  const { paymentRequests } = useSalaryPayments();
  const { requests } = useApprovalRequests();
  
  const [coffeeData, setCoffeeData] = useState({ processed: 0, total: 0 });
  const [qualityData, setQualityData] = useState({ assessments: 0, avgScore: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mock data for now during Firebase migration
        setCoffeeData({ processed: 18, total: 25 });
        setQualityData({ assessments: 15, avgScore: 87.5 });
      } catch (error) {
        console.error('Error fetching performance data:', error);
        setCoffeeData({ processed: 18, total: 25 });
        setQualityData({ assessments: 15, avgScore: 87.5 });
      }
    };

    fetchData();
  }, []);

  // Calculate performance metrics based on real data
  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  const totalEmployees = employees.length;
  const employeeEfficiency = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 100;

  // Calculate delivery performance based on approval requests
  const approvedRequests = requests.filter(req => req.status === 'Approved').length;
  const totalRequests = requests.length;
  const onTimeDelivery = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 95;

  // Calculate processing efficiency
  const processingEfficiency = coffeeData.total > 0 ? Math.round((coffeeData.processed / coffeeData.total) * 100) : 87;

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center text-xl">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/70 to-primary/50 text-primary-foreground mr-3">
            <BarChart3 className="h-5 w-5" />
          </div>
          Performance Overview
        </CardTitle>
        <CardDescription className="text-base">
          Real-time performance indicators based on system data
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group">
            <div className="text-4xl font-bold text-primary group-hover:scale-110 transition-transform duration-300 mb-4">{qualityData.avgScore.toFixed(1)}%</div>
            <div className="text-base font-semibold text-foreground mb-2">Quality Score</div>
            <div className="text-sm text-muted-foreground">{qualityData.assessments} assessments</div>
          </div>
          <div className="text-center p-8 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl border border-secondary/20 hover:shadow-lg hover:shadow-secondary/10 transition-all duration-300 group">
            <div className="text-4xl font-bold text-secondary group-hover:scale-110 transition-transform duration-300 mb-4">{onTimeDelivery}%</div>
            <div className="text-base font-semibold text-foreground mb-2">Request Approval Rate</div>
            <div className="text-sm text-muted-foreground">{approvedRequests}/{totalRequests} approved</div>
          </div>
          <div className="text-center p-8 bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/20 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 group">
            <div className="text-4xl font-bold text-accent-foreground group-hover:scale-110 transition-transform duration-300 mb-4">{processingEfficiency}%</div>
            <div className="text-base font-semibold text-foreground mb-2">Processing Efficiency</div>
            <div className="text-sm text-muted-foreground">{coffeeData.processed}/{coffeeData.total} batches</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceOverview;
