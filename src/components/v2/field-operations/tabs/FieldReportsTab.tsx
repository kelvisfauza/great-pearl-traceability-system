import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Users, Package, MapPin } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

const FieldReportsTab = () => {
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['field-daily-report'],
    queryFn: async () => {
      const [todayPurchases, reports] = await Promise.all([
        supabase.from('field_purchases').select('kgs_purchased, farmer_name, district')
          .gte('purchase_date', format(today, 'yyyy-MM-dd')).lte('purchase_date', format(today, 'yyyy-MM-dd')),
        supabase.from('daily_reports').select('*')
          .gte('created_at', startOfDay(today).toISOString()).lte('created_at', endOfDay(today).toISOString()),
      ]);

      const totalKg = todayPurchases.data?.reduce((s, p) => s + (p.kgs_purchased || 0), 0) || 0;
      const farmers = new Set(todayPurchases.data?.map(p => p.farmer_name).filter(Boolean) || []);
      const districts = new Set(todayPurchases.data?.map(p => p.district).filter(Boolean) || []);

      return {
        totalKg,
        purchaseCount: todayPurchases.data?.length || 0,
        farmersVisited: farmers.size,
        districtsActive: districts.size,
        reportsSubmitted: reports.data?.length || 0,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Daily Field Report — {format(today, 'PPP')}</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Kg Mobilized</p><p className="text-2xl font-bold">{data?.totalKg.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Users className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Farmers Visited</p><p className="text-2xl font-bold">{data?.farmersVisited}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><MapPin className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">Districts Active</p><p className="text-2xl font-bold">{data?.districtsActive}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><FileText className="h-6 w-6 mx-auto mb-2 text-orange-500" /><p className="text-sm text-muted-foreground">Reports Submitted</p><p className="text-2xl font-bold">{data?.reportsSubmitted}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>{data?.purchaseCount}</strong> field purchases recorded today</p>
          <p>• <strong>{data?.totalKg.toLocaleString()}</strong> kg mobilized from <strong>{data?.farmersVisited}</strong> farmers</p>
          <p>• Active across <strong>{data?.districtsActive}</strong> districts</p>
          <p>• <strong>{data?.reportsSubmitted}</strong> daily activity reports submitted</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FieldReportsTab;
