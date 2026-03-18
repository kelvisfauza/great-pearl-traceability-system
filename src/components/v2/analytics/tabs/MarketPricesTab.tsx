import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";

const MarketPricesTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analyst-market-prices'],
    queryFn: async () => {
      const { data: assessments, error } = await supabase.from('quality_assessments')
        .select('coffee_type, suggested_price, final_price, created_at')
        .order('created_at', { ascending: false }).limit(100);
      if (error) throw error;

      const arabica = assessments?.filter(a => a.coffee_type?.toLowerCase().includes('arabica')) || [];
      const robusta = assessments?.filter(a => a.coffee_type?.toLowerCase().includes('robusta') || !a.coffee_type?.toLowerCase().includes('arabica')) || [];

      const avgPrice = (items: any[]) => {
        const prices = items.map(i => i.final_price || i.suggested_price).filter(Boolean);
        return prices.length > 0 ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;
      };

      return {
        arabicaAvg: avgPrice(arabica),
        robustaAvg: avgPrice(robusta),
        arabicaCount: arabica.length,
        robustaCount: robusta.length,
        totalAssessments: assessments?.length || 0,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" />Market Prices & Trends</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><BarChart3 className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Avg Arabica Price</p><p className="text-xl font-bold">UGX {data?.arabicaAvg.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><BarChart3 className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Avg Robusta Price</p><p className="text-xl font-bold">UGX {data?.robustaAvg.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Arabica Samples</p><p className="text-2xl font-bold">{data?.arabicaCount}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground">Robusta Samples</p><p className="text-2xl font-bold">{data?.robustaCount}</p></CardContent></Card>
      </div>
    </div>
  );
};

export default MarketPricesTab;
