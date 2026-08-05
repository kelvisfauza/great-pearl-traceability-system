import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, TrendingUp, Scale, Users } from "lucide-react";

const MillingAnalyticsTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['milling-analytics-v2'],
    queryFn: async () => {
      const [txRes, custRes, expRes] = await Promise.all([
        supabase.from('milling_transactions').select('kgs_hulled, total_amount, amount_paid, balance, transaction_type, date'),
        supabase.from('milling_customers').select('id, current_balance, status'),
        supabase.from('milling_expenses').select('amount, date'),
      ]);
      if (txRes.error) throw txRes.error;

      const tx = txRes.data || [];
      const customers = custRes.data || [];
      const expenses = expRes.data || [];

      const totalKgs = tx.reduce((s: number, t: any) => s + Number(t.kgs_hulled || 0), 0);
      const totalRevenue = tx.reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0);
      const totalPaid = tx.reduce((s: number, t: any) => s + Number(t.amount_paid || 0), 0);
      const outstanding = customers.reduce((s: number, c: any) => s + Number(c.current_balance || 0), 0);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      return {
        totalKgs,
        totalRevenue,
        totalPaid,
        outstanding,
        totalExpenses,
        netRevenue: totalRevenue - totalExpenses,
        avgRate: totalKgs > 0 ? Math.round(totalRevenue / totalKgs) : 0,
        collectionRate: totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : '0',
        totalTransactions: tx.length,
        activeCustomers: customers.filter((c: any) => c.status === 'active').length,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Milling Analytics</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Scale className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Total Hulled</p><p className="text-xl font-bold">{data?.totalKgs.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Avg Rate</p><p className="text-xl font-bold">UGX {data?.avgRate.toLocaleString()}/kg</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 mx-auto mb-2 text-orange-500" /><p className="text-sm text-muted-foreground">Collection Rate</p><p className="text-xl font-bold">{data?.collectionRate}%</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Users className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">Active Customers</p><p className="text-xl font-bold">{data?.activeCustomers}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Profitability Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• Total revenue: <strong>UGX {data?.totalRevenue.toLocaleString()}</strong></p>
          <p>• Collected: <strong>UGX {data?.totalPaid.toLocaleString()}</strong> ({data?.collectionRate}%)</p>
          <p>• Outstanding debts: <strong>UGX {data?.outstanding.toLocaleString()}</strong></p>
          <p>• Expenses: <strong>UGX {data?.totalExpenses.toLocaleString()}</strong></p>
          <p>• Net revenue: <strong>UGX {data?.netRevenue.toLocaleString()}</strong></p>
          <p>• <strong>{data?.totalTransactions}</strong> hulling transactions recorded</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MillingAnalyticsTab;
