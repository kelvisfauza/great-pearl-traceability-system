import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Banknote, FileText, ShieldCheck, Wallet, Users, Landmark, HandCoins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AdminLoanTracker from "@/components/loans/AdminLoanTracker";

export default function TreasuryWorkflows({ area }: { area: "loans" | "staff" }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const actions = area === "loans" ? [
    { title: "Loan applications & approvals", path: "/quick-loans", icon: HandCoins },
    { title: "Loan portfolio report", path: "/reports/loans", icon: FileText },
    { title: "Overdraft accounts", path: "/admin/overdraft", icon: Landmark },
    { title: "Loan appeals", path: "/admin/loan-appeals", icon: ShieldCheck },
    ...(hasPermission("Human Resources") ? [{ title: "Employee registry & borrower registration", path: "/human-resources", icon: Users }] : []),
  ] : [
    { title: "Employee statements", path: "/admin/user-statement", icon: FileText },
    { title: "Wallet transactions & reversals", path: "/admin/system-transactions", icon: Wallet },
    { title: "Wallet withdrawals & deductions", path: "/admin/initiate-withdrawal", icon: Banknote },
    { title: "Wallet audit", path: "/admin/wallet-audit", icon: ShieldCheck },
    { title: "Historical balances", path: "/admin/point-in-time-balances", icon: Landmark },
    ...(hasPermission("Human Resources") ? [
      { title: "Payroll runs & payslips", path: "/v2/hr/payroll", icon: Users },
      { title: "Salary advances", path: "/v2/hr/salary-advances", icon: HandCoins },
      { title: "Attendance deductions", path: "/v2/hr/time-deductions", icon: Banknote },
    ] : []),
  ];
  return <div className="space-y-6">
    <div className="grid gap-x-6 sm:grid-cols-2">
      {actions.map(({ title, path, icon: Icon }) => <Button key={path} variant="ghost" className="h-14 justify-between rounded-none border-b px-2" onClick={() => navigate(path)}>
        <span className="flex items-center gap-3 text-left whitespace-normal"><Icon className="h-4 w-4 shrink-0 text-primary" />{title}</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>)}
    </div>
    {area === "loans" && <AdminLoanTracker />}
  </div>;
}