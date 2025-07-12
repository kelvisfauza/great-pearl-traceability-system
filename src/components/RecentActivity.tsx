
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, DollarSign, UserPlus } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";
import { format } from "date-fns";

const RecentActivity = () => {
  const { employees } = useEmployees();
  const { payments } = useSalaryPayments();

  // Combine recent activities from employees and payments
  const recentActivities = [
    // Recent employee additions
    ...employees
      .filter(emp => emp.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map(emp => ({
        id: `emp-${emp.id}`,
        type: "employee",
        title: "New Employee Added",
        description: `${emp.name} joined as ${emp.position}`,
        time: format(new Date(emp.created_at), "MMM dd, yyyy"),
        icon: UserPlus,
        status: "completed"
      })),
    
    // Recent salary payments
    ...payments
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map(payment => ({
        id: `payment-${payment.id}`,
        type: "payment",
        title: "Salary Payment Processed",
        description: `${payment.month} - UGX ${(Number(payment.total_pay) / 1000000).toFixed(1)}M for ${payment.employee_count} employees`,
        time: format(new Date(payment.created_at), "MMM dd, yyyy"),
        icon: DollarSign,
        status: payment.status.toLowerCase()
      }))
  ]
  .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'processed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest system activities and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg border">
                <div className="flex-shrink-0">
                  <activity.icon className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <Badge variant={getStatusColor(activity.status)}>
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No recent activities</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
