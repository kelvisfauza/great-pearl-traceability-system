import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

const MillingReportsTab = () => {
  const today = new Date();
  const { data, isLoading } = useQuery({
    queryKey: ['milling-daily-report'],
    queryFn: async () => {
      const { data: jobs, error } = await supabase.from('milling_jobs').select('*')
        .gte('created_at', startOfDay(today).toISOString()).lte('created_at', endOfDay(today).toISOString());
      if (error) throw error;
      const totalInput = jobs?.reduce((s, j) => s + Number(j.input_weight_kg || 0), 0) || 0;
      const totalRevenue = jobs?.reduce((s, j) => s + Number(j.total_cost || 0), 0) || 0;
      return { count: jobs?.length || 0, totalInput, totalRevenue };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Daily Milling Report — {format(today, 'PPP')}</h3>
      <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>{data?.count}</strong> milling jobs today</p>
          <p>• Total input: <strong>{data?.totalInput.toLocaleString()} kg</strong></p>
          <p>• Revenue: <strong>UGX {data?.totalRevenue.toLocaleString()}</strong></p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MillingReportsTab;
