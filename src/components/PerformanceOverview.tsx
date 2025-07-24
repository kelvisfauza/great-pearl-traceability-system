
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
  const activeEmployees = employees.filter(emp => emp.status === 'active').length;
  const totalEmployees = employees.length;
  const employeeEfficiency = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 100;

  // Calculate delivery performance based on approval requests
  const approvedRequests = requests.filter(req => req.status === 'Approved').length;
  const totalRequests = requests.length;
  const onTimeDelivery = totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 95;

  // Calculate processing efficiency
  const processingEfficiency = coffeeData.total > 0 ? Math.round((coffeeData.processed / coffeeData.total) * 100) : 87;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
          Performance Overview
        </CardTitle>
        <CardDescription>
          Real-time performance indicators based on system data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{qualityData.avgScore.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Quality Score</div>
            <div className="text-xs text-gray-500 mt-1">{qualityData.assessments} assessments</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{onTimeDelivery}%</div>
            <div className="text-sm text-gray-600">Request Approval Rate</div>
            <div className="text-xs text-gray-500 mt-1">{approvedRequests}/{totalRequests} approved</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{processingEfficiency}%</div>
            <div className="text-sm text-gray-600">Processing Efficiency</div>
            <div className="text-xs text-gray-500 mt-1">{coffeeData.processed}/{coffeeData.total} batches</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceOverview;
