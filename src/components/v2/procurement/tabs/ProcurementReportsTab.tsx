import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Package, Users, AlertTriangle } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

const ProcurementReportsTab = () => {
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-reports'],
    queryFn: async () => {
      const [bookings, deliveries] = await Promise.all([
        supabase.from('coffee_bookings').select('*')
          .gte('created_at', startOfWeek(today).toISOString()).lte('created_at', endOfWeek(today).toISOString()),
        supabase.from('coffee_booking_deliveries').select('delivered_kg')
          .gte('created_at', startOfWeek(today).toISOString()).lte('created_at', endOfWeek(today).toISOString()),
      ]);

      const weekBookedKg = bookings.data?.reduce((s, b) => s + (b.booked_quantity_kg || 0), 0) || 0;
      const weekDeliveredKg = deliveries.data?.reduce((s, d) => s + (d.delivered_kg || 0), 0) || 0;

      return {
        weekBookings: bookings.data?.length || 0,
        weekBookedKg,
        weekDeliveredKg,
        variance: weekBookedKg - weekDeliveredKg,
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Weekly Procurement Report</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Bookings</p><p className="text-2xl font-bold">{data?.weekBookings}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Booked Kg</p><p className="text-2xl font-bold">{data?.weekBookedKg.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Package className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">Delivered Kg</p><p className="text-2xl font-bold">{data?.weekDeliveredKg.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-500" /><p className="text-sm text-muted-foreground">Variance</p><p className="text-2xl font-bold">{data?.variance.toLocaleString()} kg</p></CardContent></Card>
      </div>
    </div>
  );
};

export default ProcurementReportsTab;
