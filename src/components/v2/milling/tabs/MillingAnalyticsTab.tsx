import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, TrendingUp, Scale } from "lucide-react";

const MillingAnalyticsTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['milling-analytics'],
    queryFn: async () => {
      const { data: jobs, error } = await supabase.from('milling_jobs').select('input_weight_kg, output_weight_kg, total_cost, amount_paid, coffee_type, status');
      if (error) throw error;

      const totalInput = jobs?.reduce((s, j) => s + Number(j.input_weight_kg || 0), 0) || 0;
      const totalOutput = jobs?.reduce((s, j) => s + Number(j.output_weight_kg || 0), 0) || 0;
      const totalRevenue = jobs?.reduce((s, j) => s + Number(j.total_cost || 0), 0) || 0;
      const totalPaid = jobs?.reduce((s, j) => s + Number(j.amount_paid || 0), 0) || 0;
      const completedJobs = jobs?.filter(j => j.status === 'completed') || [];

      return {
        totalInput, totalOutput, totalRevenue, totalPaid,
        lossRate: totalInput > 0 ? (((totalInput - totalOutput) / totalInput) * 100).toFixed(1) : '0',
        collectionRate: totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : '0',
        totalJobs: jobs?.length || 0,
        completedJobs: completedJobs.length,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Milling Analytics</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Scale className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Total Input</p><p className="text-xl font-bold">{data?.totalInput.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Scale className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Total Output</p><p className="text-xl font-bold">{data?.totalOutput.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">Loss Rate</p><p className="text-xl font-bold">{data?.lossRate}%</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 mx-auto mb-2 text-orange-500" /><p className="text-sm text-muted-foreground">Collection Rate</p><p className="text-xl font-bold">{data?.collectionRate}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Profitability Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• Total revenue: <strong>UGX {data?.totalRevenue.toLocaleString()}</strong></p>
          <p>• Collected: <strong>UGX {data?.totalPaid.toLocaleString()}</strong> ({data?.collectionRate}%)</p>
          <p>• Outstanding: <strong>UGX {((data?.totalRevenue || 0) - (data?.totalPaid || 0)).toLocaleString()}</strong></p>
          <p>• {data?.completedJobs} of {data?.totalJobs} jobs completed</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MillingAnalyticsTab;
