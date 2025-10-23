import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, DollarSign, UserPlus, Shield, FileText, Truck, FlaskConical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RecentActivity = () => {
  const { hasRole, hasPermission } = useAuth();

  // Check if user should see sensitive activities
  const canViewFinancialActivities = hasRole("Administrator") || hasRole("Manager") || 
    hasPermission("Finance") || hasPermission("Human Resources");

  const canViewHRActivities = hasRole("Administrator") || hasRole("Manager") || 
    hasPermission("Human Resources");

  // Fetch real system activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const allActivities: any[] = [];

      // Fetch approval requests (approvals made)
      if (canViewFinancialActivities) {
        const { data: approvals } = await supabase
          .from('approval_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (approvals) {
          approvals.forEach(approval => {
            allActivities.push({
              id: `approval-${approval.id}`,
              type: "approval",
              title: `Approval: ${approval.title}`,
              description: `${approval.requestedby} | ${approval.amount} UGX`,
              timestamp: approval.created_at,
              time: format(new Date(approval.created_at), "MMM dd, HH:mm"),
              icon: CheckCircle,
              status: approval.status.toLowerCase()
            });
          });
        }
      }

      // Fetch payment records (coffee payments)
      if (canViewFinancialActivities) {
        const { data: payments } = await supabase
          .from('payment_records')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (payments) {
          payments.forEach(payment => {
            allActivities.push({
              id: `payment-${payment.id}`,
              type: "payment",
              title: "Coffee Payment Made",
              description: `${payment.supplier} | ${payment.amount} UGX`,
              timestamp: payment.created_at,
              time: format(new Date(payment.created_at), "MMM dd, HH:mm"),
              icon: DollarSign,
              status: payment.status.toLowerCase()
            });
          });
        }
      }

      // Fetch daily tasks (completed activities)
      const { data: tasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (tasks) {
        tasks.forEach(task => {
          allActivities.push({
            id: `task-${task.id}`,
            type: "task",
            title: task.task_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: `${task.description} | ${task.completed_by}`,
            timestamp: task.completed_at,
            time: format(new Date(task.completed_at), "MMM dd, HH:mm"),
            icon: FileText,
            status: "completed"
          });
        });
      }

      // Fetch sales transactions
      const { data: sales } = await supabase
        .from('sales_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (sales) {
        sales.forEach(sale => {
          allActivities.push({
            id: `sale-${sale.id}`,
            type: "sale",
            title: "Coffee Sale",
            description: `${sale.customer} | ${sale.weight}kg @ ${sale.unit_price} UGX/kg`,
            timestamp: sale.created_at,
            time: format(new Date(sale.created_at), "MMM dd, HH:mm"),
            icon: Truck,
            status: sale.status.toLowerCase()
          });
        });
      }

      // Fetch new employees
      if (canViewHRActivities) {
        const { data: employees } = await supabase
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (employees) {
          employees.forEach(emp => {
            allActivities.push({
              id: `emp-${emp.id}`,
              type: "employee",
              title: "New Employee Added",
              description: `${emp.name} joined as ${emp.position}`,
              timestamp: emp.created_at,
              time: format(new Date(emp.created_at), "MMM dd, HH:mm"),
              icon: UserPlus,
              status: "completed"
            });
          });
        }
      }

      // Fetch workflow steps (various system actions)
      const { data: workflows } = await supabase
        .from('workflow_steps')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (workflows) {
        workflows.forEach(workflow => {
          allActivities.push({
            id: `workflow-${workflow.id}`,
            type: "workflow",
            title: `${workflow.action}: ${workflow.from_department} → ${workflow.to_department}`,
            description: `${workflow.processed_by}`,
            timestamp: workflow.timestamp,
            time: format(new Date(workflow.timestamp), "MMM dd, HH:mm"),
            icon: FlaskConical,
            status: workflow.status
          });
        });
      }

      // Sort all activities by timestamp and return top 8
      return allActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const recentActivities = activities;

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
