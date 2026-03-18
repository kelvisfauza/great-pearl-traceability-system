import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, TrendingUp, Package } from "lucide-react";
import { format } from "date-fns";

const MarketReportsTab = () => {
  const today = new Date();
  const { data, isLoading } = useQuery({
    queryKey: ['analyst-daily-report'],
    queryFn: async () => {
      const { data: assessments, error } = await supabase.from('quality_assessments')
        .select('coffee_type, suggested_price, final_price, moisture, outturn, status')
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;

      const totalAssessed = assessments?.length || 0;
      const avgMoisture = assessments?.length ? (assessments.reduce((s, a) => s + (a.moisture || 0), 0) / assessments.length).toFixed(1) : '0';
      const rejected = assessments?.filter(a => a.status === 'rejected').length || 0;

      return { totalAssessed, avgMoisture, rejected };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Market Intelligence Report</h3>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Recent Assessed</p><p className="text-2xl font-bold">{data?.totalAssessed}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Avg Moisture</p><p className="text-2xl font-bold">{data?.avgMoisture}%</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 mx-auto mb-2 text-red-500" /><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-destructive">{data?.rejected}</p></CardContent></Card>
      </div>
    </div>
  );
};

export default MarketReportsTab;
