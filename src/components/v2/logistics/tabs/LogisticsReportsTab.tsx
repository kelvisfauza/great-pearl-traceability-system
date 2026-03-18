import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Truck, Fuel } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

const LogisticsReportsTab = () => {
  const today = new Date();
  const { data, isLoading } = useQuery({
    queryKey: ['logistics-daily-report'],
    queryFn: async () => {
      const [trips, shipments] = await Promise.all([
        supabase.from('vehicle_trips').select('fuel_cost, cargo_weight_kg, delay_minutes')
          .gte('created_at', startOfDay(today).toISOString()).lte('created_at', endOfDay(today).toISOString()),
        supabase.from('logistics_shipments').select('status')
          .gte('created_at', startOfDay(today).toISOString()).lte('created_at', endOfDay(today).toISOString()),
      ]);
      const fuelCost = trips.data?.reduce((s, t) => s + Number(t.fuel_cost || 0), 0) || 0;
      const cargoKg = trips.data?.reduce((s, t) => s + Number(t.cargo_weight_kg || 0), 0) || 0;
      return {
        tripCount: trips.data?.length || 0,
        shipmentCount: shipments.data?.length || 0,
        fuelCost, cargoKg,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Daily Transport Report — {format(today, 'PPP')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Truck className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Trips</p><p className="text-2xl font-bold">{data?.tripCount}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Truck className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Shipments</p><p className="text-2xl font-bold">{data?.shipmentCount}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Fuel className="h-6 w-6 mx-auto mb-2 text-orange-500" /><p className="text-sm text-muted-foreground">Fuel Cost</p><p className="text-2xl font-bold">UGX {data?.fuelCost.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Truck className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">Cargo Moved</p><p className="text-2xl font-bold">{data?.cargoKg.toLocaleString()} kg</p></CardContent></Card>
      </div>
    </div>
  );
};

export default LogisticsReportsTab;
