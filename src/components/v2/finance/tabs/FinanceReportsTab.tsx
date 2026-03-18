import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

const FinanceReportsTab = () => {
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['finance-daily-report'],
    queryFn: async () => {
      const [todayPayments, weekPayments, cashTx] = await Promise.all([
        supabase.from('supplier_payments').select('amount_ugx, created_at')
          .gte('created_at', startOfDay(today).toISOString()).lte('created_at', endOfDay(today).toISOString()),
        supabase.from('supplier_payments').select('amount_ugx, created_at')
          .gte('created_at', startOfWeek(today).toISOString()).lte('created_at', endOfWeek(today).toISOString()),
        supabase.from('finance_cash_balance').select('current_balance').single(),
      ]);

      const todayTotal = todayPayments.data?.reduce((s, p) => s + (p.amount_ugx || 0), 0) || 0;
      const weekTotal = weekPayments.data?.reduce((s, p) => s + (p.amount_ugx || 0), 0) || 0;

      return {
        todayPaymentCount: todayPayments.data?.length || 0,
        todayTotal,
        weekTotal,
        weekPaymentCount: weekPayments.data?.length || 0,
        cashBalance: cashTx.data?.current_balance || 0,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Finance Reports — {format(today, 'PPP')}</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><TrendingDown className="h-6 w-6 mx-auto mb-2 text-red-500" /><p className="text-sm text-muted-foreground">Today Paid Out</p><p className="text-xl font-bold">UGX {data?.todayTotal.toLocaleString()}</p><p className="text-xs text-muted-foreground">{data?.todayPaymentCount} payments</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">This Week</p><p className="text-xl font-bold">UGX {data?.weekTotal.toLocaleString()}</p><p className="text-xs text-muted-foreground">{data?.weekPaymentCount} payments</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Wallet className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Cash Balance</p><p className="text-xl font-bold">UGX {data?.cashBalance.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>{data?.todayPaymentCount}</strong> supplier payments processed today</p>
          <p>• Total outflow: <strong>UGX {data?.todayTotal.toLocaleString()}</strong></p>
          <p>• Week-to-date: <strong>UGX {data?.weekTotal.toLocaleString()}</strong> across {data?.weekPaymentCount} payments</p>
          <p>• Current cash balance: <strong>UGX {data?.cashBalance.toLocaleString()}</strong></p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceReportsTab;
