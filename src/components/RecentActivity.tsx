
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
    <Card className="bg-gradient-to-br from-white/95 via-slate-50/90 to-indigo-50/60 dark:from-slate-800/95 dark:via-slate-700/90 dark:to-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-600/40 hover:border-indigo-300/50 dark:hover:border-indigo-700/40 transition-all duration-500 hover:shadow-2xl h-fit group">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
          <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/80 to-secondary/60 text-secondary-foreground group-hover:scale-105 transition-transform duration-300 backdrop-blur-sm">
            <Clock className="h-5 w-5" />
          </div>
          Recent Activity
        </CardTitle>
        <CardDescription className="text-sm md:text-base">Latest activities you can view</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div 
                key={activity.id} 
                className="group/item flex items-start space-x-4 p-4 rounded-xl border border-border/30 bg-gradient-to-r from-background/80 to-muted/10 hover:border-primary/40 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-muted/30 group-hover/item:bg-primary/10 group-hover/item:scale-105 transition-all duration-300 backdrop-blur-sm">
                  <activity.icon className="h-5 w-5 text-muted-foreground group-hover/item:text-primary transition-colors duration-300" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground truncate group-hover/item:text-primary transition-colors duration-300">
                      {activity.title}
                    </p>
                    <Badge 
                      variant={getStatusColor(activity.status)} 
                      className="ml-2 group-hover/item:scale-105 transition-transform duration-300 text-xs"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <div className="p-4 rounded-full bg-gradient-to-br from-muted/30 to-muted/50 w-fit mx-auto mb-4 backdrop-blur-sm">
                <Shield className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-muted-foreground">No activities available for your role</p>
              <p className="text-sm text-muted-foreground/80 mt-2">Check back later for updates</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
