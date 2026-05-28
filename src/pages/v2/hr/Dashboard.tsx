import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Users, Calendar, Award, Clock, MessageSquare, CreditCard, AlertTriangle, Gift, Ban, ShieldAlert, Calculator, Gauge } from "lucide-react";
import AllocateBonusDialog from "@/components/v2/hr/AllocateBonusDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import SalaryAnnouncementDialog from "@/components/v2/hr/SalaryAnnouncementDialog";
import ProcessPayrollDialog from "@/components/v2/hr/ProcessPayrollDialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useWithdrawalControl } from "@/hooks/useWithdrawalControl";
import { useWithdrawalLimits } from "@/hooks/useWithdrawalLimits";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSMSNotifications } from "@/hooks/useSMSNotifications";

const HRDashboard = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const { control, loading: controlLoading, updateControl } = useWithdrawalControl();
  const { limits, updateLimits } = useWithdrawalLimits();
  const { sendWithdrawalEnabledSMS } = useSMSNotifications();
  const [withdrawDisabled, setWithdrawDisabled] = useState(false);
  const [withdrawUntil, setWithdrawUntil] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [perTxnLimit, setPerTxnLimit] = useState<string>("");
  const [dailyLimit, setDailyLimit] = useState<string>("");

  useEffect(() => {
    if (control) {
      setWithdrawDisabled(control.disabled);
      setWithdrawUntil(control.disabled_until || "");
      setWithdrawReason(control.disabled_reason || "");
    }
  }, [control]);

  useEffect(() => {
    if (limits) {
      setPerTxnLimit(limits.per_transaction != null ? String(limits.per_transaction) : "");
      setDailyLimit(limits.daily != null ? String(limits.daily) : "");
    }
  }, [limits]);

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
    { title: "Absence Appeals", description: "Review and manage absence deduction appeals", icon: ShieldAlert, path: "/v2/hr/absence-appeals" },
    { title: "Per Diem", description: "Award per diem allowances to employees", icon: CreditCard, path: "/v2/hr/per-diem" },
    { title: "Payroll & Statutory", description: "NSSF & PAYE deductions, payroll runs", icon: Calculator, path: "/v2/hr/payroll" },
    { title: "Loyalty Balances", description: "Track employee loyalty reward balances", icon: Gift, path: "/v2/hr/loyalty-balances" },
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

            {/* Process Payroll Action */}
            <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CreditCard className="h-5 w-5" />
                  Process Employee Salary
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select an employee, input salary amount, month and payment method. Mark as paid when complete.
                </p>
              </CardHeader>
              <CardContent>
                <ProcessPayrollDialog />
              </CardContent>
            </Card>

            {/* Bonus Allocation */}
            <Card className="border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <Gift className="h-5 w-5" />
                  Employee Bonuses
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Allocate bonuses to employees. They'll see a popup on login to claim it instantly.
                </p>
              </CardHeader>
              <CardContent>
                <AllocateBonusDialog />
              </CardContent>
            </Card>

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

            {/* Withdrawal Control */}
            <Card className="border-2 border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <Ban className="h-5 w-5" />
                  Withdrawal Control
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enable or disable employee withdrawal requests. You can set a specific date/time when withdrawals will be re-enabled.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="withdraw-toggle" className="font-medium">
                    Disable Withdrawals
                  </Label>
                  <Switch
                    id="withdraw-toggle"
                    checked={withdrawDisabled}
                    onCheckedChange={setWithdrawDisabled}
                  />
                </div>

                {withdrawDisabled && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="withdraw-until">Re-enable withdrawals at (optional)</Label>
                      <Input
                        id="withdraw-until"
                        type="datetime-local"
                        value={withdrawUntil}
                        onChange={(e) => setWithdrawUntil(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="withdraw-reason">Reason (shown to employees)</Label>
                      <Input
                        id="withdraw-reason"
                        value={withdrawReason}
                        onChange={(e) => setWithdrawReason(e.target.value)}
                        placeholder="e.g. Month-end processing in progress"
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    updateControl.mutate({
                      disabled: withdrawDisabled,
                      disabled_until: withdrawUntil || null,
                      disabled_reason: withdrawReason,
                    }, {
                      onSuccess: async () => {
                        toast({
                          title: withdrawDisabled ? "Withdrawals Disabled" : "Withdrawals Enabled",
                          description: withdrawDisabled
                            ? `Withdrawals are now disabled${withdrawUntil ? ` until ${new Date(withdrawUntil).toLocaleString()}` : ''}.`
                            : "Employees can now make withdrawal requests. Sending SMS notifications...",
                        });

                        // When enabling withdrawals, notify employees with available balance
                        if (!withdrawDisabled) {
                          try {
                            const { data: employeesWithBalance } = await supabase
                              .from('employees')
                              .select('name, phone, auth_user_id')
                              .eq('status', 'Active')
                              .not('phone', 'is', null)
                              .not('auth_user_id', 'is', null);

                            if (employeesWithBalance) {
                              let smsSentCount = 0;
                              for (const emp of employeesWithBalance) {
                                if (!emp.phone || !emp.auth_user_id) continue;
                                
                                // Check if employee has positive balance
                                const { data: ledger } = await supabase
                                  .from('ledger_entries')
                                  .select('amount')
                                  .eq('user_id', emp.auth_user_id);
                                
                                const balance = ledger?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
                                if (balance > 0) {
                                  await sendWithdrawalEnabledSMS(emp.name, emp.phone);
                                  smsSentCount++;
                                }
                              }
                              
                              if (smsSentCount > 0) {
                                toast({
                                  title: "SMS Sent",
                                  description: `Withdrawal notifications sent to ${smsSentCount} employee(s) with available balance.`,
                                });
                              }
                            }
                          } catch (err) {
                            console.error('Error sending withdrawal SMS notifications:', err);
                          }
                        }
                      },
                    });
                  }}
                  disabled={updateControl.isPending}
                  variant={withdrawDisabled ? "destructive" : "default"}
                >
                  {updateControl.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </CardContent>
            </Card>

            {/* Withdrawal Limits */}
            <Card className="border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Gauge className="h-5 w-5" />
                  Withdrawal Limits
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Company-wide caps applied to every employee withdrawal. Leave a field blank to disable that limit.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="limit-per-txn">Per-transaction limit (UGX)</Label>
                  <Input
                    id="limit-per-txn"
                    type="number"
                    min={0}
                    step={500}
                    value={perTxnLimit}
                    onChange={(e) => setPerTxnLimit(e.target.value)}
                    placeholder="e.g. 500000"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximum amount allowed in a single withdrawal.</p>
                </div>
                <div>
                  <Label htmlFor="limit-daily">Daily limit (UGX)</Label>
                  <Input
                    id="limit-daily"
                    type="number"
                    min={0}
                    step={1000}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="e.g. 1000000"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Total amount one employee can withdraw across all requests in a single day.</p>
                </div>
                <Button
                  onClick={() => {
                    const per = perTxnLimit.trim() === "" ? null : Math.max(0, Number(perTxnLimit));
                    const daily = dailyLimit.trim() === "" ? null : Math.max(0, Number(dailyLimit));
                    if ((per !== null && Number.isNaN(per)) || (daily !== null && Number.isNaN(daily))) {
                      toast({ title: "Invalid number", description: "Please enter valid numeric amounts.", variant: "destructive" });
                      return;
                    }
                    updateLimits.mutate(
                      { per_transaction: per, daily },
                      {
                        onSuccess: () => toast({ title: "Limits saved", description: "New withdrawal limits are now active for all employees." }),
                        onError: (err: any) => toast({ title: "Save failed", description: String(err?.message || err), variant: "destructive" }),
                      },
                    );
                  }}
                  disabled={updateLimits.isPending}
                >
                  {updateLimits.isPending ? "Saving..." : "Save Limits"}
                </Button>
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
