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
    <Card className="bg-gradient-to-br from-white/95 via-slate-50/90 to-indigo-50/60 dark:from-slate-800/95 dark:via-slate-700/90 dark:to-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-600/40 hover:border-indigo-300/50 dark:hover:border-indigo-700/40 transition-all duration-500 hover:shadow-2xl min-h-[400px] group">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
          <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/80 to-secondary/60 text-secondary-foreground group-hover:scale-105 transition-transform duration-300 backdrop-blur-sm">
            <Clock className="h-5 w-5" />
          </div>
          Recent Activity
        </CardTitle>
        <CardDescription className="text-sm md:text-base">Latest activities you can view</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div 
                key={activity.id} 
                className="group/item flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <activity.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover/item:text-primary transition-colors" />
                <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                  {activity.title}
                </span>
                <span className="text-xs text-muted-foreground truncate flex-1 hidden sm:block">
                  {activity.description}
                </span>
                <Badge 
                  variant={getStatusColor(activity.status)} 
                  className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0"
                >
                  {activity.status}
                </Badge>
                <span className="text-xs text-muted-foreground/70 flex-shrink-0 w-20 text-right">
                  {activity.time}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No activities available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
