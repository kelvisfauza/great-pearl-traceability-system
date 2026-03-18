import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";

const DelayMonitoringTab = () => {
  const { data: trips, isLoading } = useQuery({
    queryKey: ['logistics-delays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicle_trips').select('*').gt('delay_minutes', 0).order('delay_minutes', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  const { data: lateShipments } = useQuery({
    queryKey: ['logistics-late-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('logistics_shipments').select('*')
        .in('status', ['preparing', 'in_transit'])
        .lt('expected_arrival', new Date().toISOString().split('T')[0]);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Delay Monitoring</h3>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Delayed Trips</p><p className="text-2xl font-bold text-orange-600">{trips?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Overdue Shipments</p><p className="text-2xl font-bold text-destructive">{lateShipments?.length || 0}</p></CardContent></Card>
      </div>

      {(lateShipments && lateShipments.length > 0) && (
        <Card>
          <CardHeader><CardTitle>Overdue Shipments</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Buyer</TableHead><TableHead>Expected</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {lateShipments.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.shipment_ref}</TableCell>
                    <TableCell>{s.buyer_name}</TableCell>
                    <TableCell className="text-destructive">{s.expected_arrival}</TableCell>
                    <TableCell><Badge variant="destructive">Overdue</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Trip Delays</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Route</TableHead><TableHead>Delay</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
            <TableBody>
              {trips?.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.vehicle_name}</TableCell>
                  <TableCell>{t.origin} → {t.destination}</TableCell>
                  <TableCell><Badge variant="destructive">{t.delay_minutes} min</Badge></TableCell>
                  <TableCell className="text-sm">{t.delay_reason || '—'}</TableCell>
                </TableRow>
              ))}
              {(!trips || trips.length === 0) && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No delays recorded ✓</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DelayMonitoringTab;
