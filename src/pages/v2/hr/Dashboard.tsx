import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Users, Calendar, Award, Clock, MessageSquare, CreditCard, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import SalaryAnnouncementDialog from "@/components/v2/hr/SalaryAnnouncementDialog";

const HRDashboard = () => {
  const { employee } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["hr-v2-stats"],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [employees, attendance, pendingLeave] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "Active"),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", today).eq("status", "present"),
        supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("type", "leave").eq("status", "pending"),
      ]);

      return {
        totalEmployees: employees.count || 0,
        presentToday: attendance.count || 0,
        pendingLeave: pendingLeave.count || 0,
      };
    },
  });

  const quickStats = [
    { label: "Total Employees", value: stats?.totalEmployees || 0, icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Present Today", value: stats?.presentToday || 0, icon: Clock, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Pending Leave", value: stats?.pendingLeave || 0, icon: Calendar, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  ];

  const actions = [
    { title: "Employees", description: "Manage employee records", icon: Users, path: "/human-resources" },
    { title: "Attendance", description: "Track daily attendance", icon: Clock, path: "/v2/hr/attendance" },
    { title: "Leave Management", description: "Handle leave requests", icon: Calendar, path: "/v2/hr/leave" },
    { title: "Performance", description: "Employee performance tracking", icon: Award, path: "/v2/hr/performance" },
    { title: "Salary Advances", description: "Award & track advances", icon: CreditCard, path: "/v2/hr/salary-advances" },
    { title: "Time Deductions", description: "Deduct for missed hours (3,000/hr)", icon: AlertTriangle, path: "/v2/hr/time-deductions" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-indigo-600" />
              <h1 className="text-4xl font-bold text-foreground">HR Dashboard</h1>
            </div>
            <p className="text-muted-foreground text-lg">Employee management and HR operations</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Welcome, {employee?.name}</CardTitle>
                <p className="text-muted-foreground">{employee?.position} • {employee?.department}</p>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} to={action.path}>
                    <Card className="border-2 hover:shadow-lg transition-all cursor-pointer group h-full">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-indigo-500/10 group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{action.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Salary Notice Action */}
            <Card className="border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <MessageSquare className="h-5 w-5" />
                  Salary Announcement
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Send personalized salary SMS to selected employees with custom percentage
                </p>
              </CardHeader>
              <CardContent>
                <SalaryAnnouncementDialog />
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" asChild><Link to="/human-resources">Full HR Module</Link></Button>
                <Button variant="outline" asChild><Link to="/">V1 Dashboard</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
