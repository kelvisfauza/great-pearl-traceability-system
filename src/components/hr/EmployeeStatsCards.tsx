
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, UserCheck, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Employee {
  id: string;
  status: string;
  salary: number;
  join_date: string;
  [key: string]: any;
}

interface EmployeeStatsCardsProps {
  employees: Employee[];
}

const EmployeeStatsCards = ({ employees }: EmployeeStatsCardsProps) => {
  const [salaryRequestsTotal, setSalaryRequestsTotal] = useState(0);

  useEffect(() => {
    const fetchSalaryRequests = async () => {
      try {
        console.log('Fetching salary payment requests for stats...');
        const salaryQuery = query(
          collection(db, 'approval_requests'),
          where('type', '==', 'Salary Payment'),
          where('status', '==', 'Pending')
        );
        
        const snapshot = await getDocs(salaryQuery);
        let total = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          const amount = typeof data.amount === 'string' 
            ? parseFloat(data.amount.replace(/[^\d.]/g, '')) 
            : Number(data.amount) || 0;
          total += amount;
        });
        
        setSalaryRequestsTotal(total);
        console.log('Salary requests total calculated:', total);
      } catch (error) {
        console.error('Error fetching salary requests:', error);
      }
    };

    fetchSalaryRequests();
  }, []);

  // Calculate real stats from actual employee data
  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  const totalSalary = employees.reduce((sum, emp) => sum + Number(emp.salary || 0), 0);
  const avgSalary = employees.length > 0 ? totalSalary / employees.length : 0;
  
  // Calculate new employees this month from actual data
  const newThisMonth = employees.filter(emp => {
    if (!emp.join_date) return false;
    try {
      const joinDate = new Date(emp.join_date);
      const now = new Date();
      return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
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
      title: "Monthly Payroll",
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
                {stat.title === "Monthly Payroll" && salaryRequestsTotal > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    UGX {(salaryRequestsTotal / 1000000).toFixed(1)}M pending
                  </p>
                )}
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
