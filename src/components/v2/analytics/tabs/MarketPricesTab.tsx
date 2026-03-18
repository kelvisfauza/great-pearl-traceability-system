import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";

const MarketPricesTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analyst-market-prices'],
    queryFn: async () => {
      const { data: assessments, error } = await supabase.from('quality_assessments')
        .select('suggested_price, final_price, moisture, outturn').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      const prices = assessments?.map(a => a.final_price || a.suggested_price).filter(Boolean) as number[];
      const avgPrice = prices.length > 0 ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;
      const avgMoisture = assessments?.length ? (assessments.reduce((s, a) => s + (a.moisture || 0), 0) / assessments.length).toFixed(1) : '0';
      return { avgPrice, avgMoisture, total: assessments?.length || 0 };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" />Market Prices & Trends</h3>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><BarChart3 className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Avg Price/kg</p><p className="text-xl font-bold">UGX {data?.avgPrice.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Avg Moisture</p><p className="text-2xl font-bold">{data?.avgMoisture}%</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Assessments</p><p className="text-2xl font-bold">{data?.total}</p></CardContent></Card>
      </div>
    </div>
  );
};

export default MarketPricesTab;
