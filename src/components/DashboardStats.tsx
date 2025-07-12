
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Package, DollarSign } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";

const DashboardStats = () => {
  const { employees, loading: employeesLoading } = useEmployees();
  const { payments, loading: paymentsLoading } = useSalaryPayments();

  // Calculate total salary from employees
  const totalSalary = employees.reduce((sum, emp) => sum + Number(emp.salary), 0);
  
  // Calculate active employees
  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  
  // Calculate total payments this month
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const currentMonthPayments = payments.filter(payment => payment.month === currentMonth);
  const totalPayments = currentMonthPayments.reduce((sum, payment) => sum + Number(payment.total_pay), 0);

  const stats = [
    {
      title: "Total Employees",
      value: employeesLoading ? "Loading..." : activeEmployees.toString(),
      description: "Active workforce",
      icon: Users,
      trend: "+2.5%"
    },
    {
      title: "Monthly Salary Budget",
      value: employeesLoading ? "Loading..." : `UGX ${(totalSalary / 1000000).toFixed(1)}M`,
      description: "Total monthly payroll",
      icon: DollarSign,
      trend: "+8.2%"
    },
    {
      title: "This Month Payments",
      value: paymentsLoading ? "Loading..." : `UGX ${(totalPayments / 1000000).toFixed(1)}M`,
      description: "Payments processed",
      icon: TrendingUp,
      trend: "+12.3%"
    },
    {
      title: "Departments",
      value: employeesLoading ? "Loading..." : new Set(employees.map(emp => emp.department)).size.toString(),
      description: "Active departments",
      icon: Package,
      trend: "Stable"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
            <div className="flex items-center pt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">{stat.trend}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
