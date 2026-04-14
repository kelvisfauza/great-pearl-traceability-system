import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { Wallet, Clock, CreditCard, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

const FinanceWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["finance-work-summary"],
    queryFn: async () => {
      const [readyForPayment, pendingApprovals, pendingBills, pendingLoans] = await Promise.all([
        supabase.from("finance_coffee_lots").select("*", { count: "exact", head: true }).eq("finance_status", "READY_FOR_FINANCE"),
        supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("bills").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("type", "quick_loan").eq("status", "pending"),
      ]);

      return {
        readyForPayment: readyForPayment.count || 0,
        pendingApprovals: pendingApprovals.count || 0,
        pendingBills: pendingBills.count || 0,
        pendingLoans: pendingLoans.count || 0,
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Ready for Payment", value: data?.readyForPayment ?? 0, icon: CreditCard, color: "text-green-600", bgColor: "bg-green-500/10", link: "/finance", urgent: true },
    { label: "Pending Approvals", value: data?.pendingApprovals ?? 0, icon: Clock, color: "text-orange-600", bgColor: "bg-orange-500/10", link: "/approvals", urgent: true },
    { label: "Unpaid Bills", value: data?.pendingBills ?? 0, icon: FileText, color: "text-red-600", bgColor: "bg-red-500/10", link: "/finance" },
    { label: "Loan Requests", value: data?.pendingLoans ?? 0, icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-500/10", urgent: true },
  ];

  return <WorkSummaryCard title="Finance" icon={Wallet} color="text-green-600" items={items} />;
};

export default FinanceWorkSummary;
