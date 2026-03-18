import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Package, AlertTriangle } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

const StoreReportsTab = () => {
  const today = new Date();

  const { data: todayRecords, isLoading } = useQuery({
    queryKey: ['store-daily-report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coffee_records').select('*')
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString());
      if (error) throw error;
      return data;
    }
  });

  const { data: damaged } = useQuery({
    queryKey: ['store-daily-damaged'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_damaged_bags').select('*')
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString());
      if (error) throw error;
      return data;
    }
  });

  const { data: verifications } = useQuery({
    queryKey: ['store-daily-verifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_stock_verifications').select('*')
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString());
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const totalBags = todayRecords?.reduce((s, r) => s + (r.bags || 0), 0) || 0;
  const totalKg = todayRecords?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;
  const damagedBags = damaged?.reduce((s, r: any) => s + (r.bags_affected || 0), 0) || 0;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Daily Store Report — {format(today, 'PPP')}</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Receipts Today</p><p className="text-2xl font-bold">{todayRecords?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Total Bags</p><p className="text-2xl font-bold">{totalBags}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">Total Kg</p><p className="text-2xl font-bold">{totalKg.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" /><p className="text-sm text-muted-foreground">Damaged Bags</p><p className="text-2xl font-bold text-destructive">{damagedBags}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>{todayRecords?.length || 0}</strong> coffee receipts recorded today</p>
          <p>• <strong>{totalBags}</strong> bags / <strong>{totalKg.toLocaleString()}</strong> kg received</p>
          <p>• <strong>{damagedBags}</strong> damaged/mislabelled bags reported</p>
          <p>• <strong>{verifications?.length || 0}</strong> stock verification(s) completed</p>
          {(verifications?.length || 0) < 2 && <p className="text-destructive font-medium">⚠ Less than 2 verifications done today (target: 2)</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreReportsTab;
