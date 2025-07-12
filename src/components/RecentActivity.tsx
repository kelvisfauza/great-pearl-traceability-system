
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, DollarSign, UserPlus, Shield } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const RecentActivity = () => {
  const { employees } = useEmployees();
  const { paymentRequests } = useSalaryPayments();
  const { hasRole, hasPermission } = useAuth();

  // Check if user should see sensitive activities
  const canViewFinancialActivities = hasRole("Administrator") || hasRole("Manager") || 
    hasPermission("Finance") || hasPermission("Human Resources");

  const canViewHRActivities = hasRole("Administrator") || hasRole("Manager") || 
    hasPermission("Human Resources");

  // Filter activities based on permissions
  const getFilteredActivities = () => {
    const activities = [];

    // Add HR activities if user has permission
    if (canViewHRActivities) {
      const employeeActivities = employees
        .filter(emp => emp.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2)
        .map(emp => ({
          id: `emp-${emp.id}`,
          type: "employee",
          title: "New Employee Added",
          description: `${emp.name} joined as ${emp.position}`,
          time: format(new Date(emp.created_at), "MMM dd, yyyy"),
          icon: UserPlus,
          status: "completed"
        }));
      
      activities.push(...employeeActivities);
    }

    // Add financial activities if user has permission
    if (canViewFinancialActivities) {
      const paymentActivities = paymentRequests
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2)
        .map(request => ({
          id: `payment-${request.id}`,
          type: "payment",
          title: "Salary Payment Request",
          description: `${request.title} - ${request.amount}`,
          time: format(new Date(request.created_at), "MMM dd, yyyy"),
          icon: DollarSign,
          status: request.status.toLowerCase()
        }));
      
      activities.push(...paymentActivities);
    }

    // If no specific permissions, show general activities
    if (!canViewHRActivities && !canViewFinancialActivities) {
      activities.push({
        id: 'general-1',
        type: 'general',
        title: 'System Access',
        description: 'You have accessed the dashboard',
        time: format(new Date(), "MMM dd, yyyy"),
        icon: User,
        status: 'completed'
      });
    }

    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 4);
  };

  const recentActivities = getFilteredActivities();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
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
        <CardDescription>Latest activities you can view</CardDescription>
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
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No activities available for your role</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
