import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, DollarSign } from 'lucide-react';

interface CompanyEmployeesStatsProps {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    totalMonthlySalary: number;
  };
}

const CompanyEmployeesStats = ({ stats }: CompanyEmployeesStatsProps) => {
  const statCards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Active Employees',
      value: stats.activeEmployees,
      icon: UserCheck,
      color: 'text-green-600'
    },
    {
      title: 'Inactive Employees',
      value: stats.inactiveEmployees,
      icon: UserX,
      color: 'text-red-600'
    },
    {
      title: 'Monthly Payroll',
      value: `UGX ${stats.totalMonthlySalary.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CompanyEmployeesStats;