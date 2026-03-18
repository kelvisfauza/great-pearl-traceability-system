import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, CheckCircle2, Receipt, CreditCard } from "lucide-react";
import { Loader2 } from "lucide-react";

const FinanceOverviewTab = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["finance-overview-stats"],
    queryFn: async () => {
      const [readyPayment, pendingApprovals, cashBalance, totalPayments] = await Promise.all([
        supabase.from("finance_coffee_lots").select("*", { count: "exact", head: true }).eq("finance_status", "READY_FOR_FINANCE"),
        supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("status", "Pending Finance"),
        supabase.from("finance_cash_balance").select("current_balance").single(),
        supabase.from("supplier_payments").select("amount_paid_ugx"),
      ]);
      const totalPaid = totalPayments.data?.reduce((s, p) => s + (p.amount_paid_ugx || 0), 0) || 0;
      return {
        readyPayment: readyPayment.count || 0,
        pendingApprovals: pendingApprovals.count || 0,
        cashBalance: cashBalance.data?.current_balance || 0,
        totalPaid,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const cards = [
    { label: "Ready for Payment", value: stats?.readyPayment || 0, icon: CheckCircle2, color: "text-green-500" },
    { label: "Pending Approvals", value: stats?.pendingApprovals || 0, icon: Receipt, color: "text-orange-500" },
    { label: "Cash Balance", value: `UGX ${(stats?.cashBalance || 0).toLocaleString()}`, icon: Wallet, color: "text-blue-500" },
    { label: "Total Paid Out", value: `UGX ${(stats?.totalPaid || 0).toLocaleString()}`, icon: CreditCard, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label}><CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-8 w-8 ${c.color}`} />
            <div><p className="text-sm text-muted-foreground">{c.label}</p><p className="text-xl font-bold">{c.value}</p></div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
};

export default FinanceOverviewTab;
