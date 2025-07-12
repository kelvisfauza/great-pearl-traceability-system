
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, UserCheck, TrendingUp } from "lucide-react";

interface EmployeeStatsCardsProps {
  employees: any[];
}

const EmployeeStatsCards = ({ employees }: EmployeeStatsCardsProps) => {
  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  const totalSalary = employees.reduce((sum, emp) => sum + Number(emp.salary), 0);
  const avgSalary = employees.length > 0 ? totalSalary / employees.length : 0;
  const newThisMonth = employees.filter(emp => {
    const joinDate = new Date(emp.join_date);
    const now = new Date();
    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    {
      title: "Total Employees",
      value: employees.length,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Active Employees",
      value: activeEmployees,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Payroll",
      value: `UGX ${(totalSalary / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "New This Month",
      value: newThisMonth,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EmployeeStatsCards;
