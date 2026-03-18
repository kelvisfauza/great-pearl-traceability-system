import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Package, AlertTriangle, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, parseISO } from "date-fns";

const ProcurementReportsTab = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-reports-full', selectedDate],
    queryFn: async () => {
      const dayStart = startOfDay(parseISO(selectedDate)).toISOString();
      const dayEnd = endOfDay(parseISO(selectedDate)).toISOString();
      const weekStart = startOfWeek(parseISO(selectedDate)).toISOString();
      const weekEnd = endOfWeek(parseISO(selectedDate)).toISOString();

      const [dayRecords, dayBookings, dayDeliveries, weekRecords, weekBookings, buyerContracts, activeBookings] = await Promise.all([
        supabase.from('coffee_records').select('id, supplier_name, coffee_type, kilograms, bags').gte('created_at', dayStart).lte('created_at', dayEnd),
        supabase.from('coffee_bookings').select('*').gte('created_at', dayStart).lte('created_at', dayEnd),
        supabase.from('coffee_booking_deliveries').select('delivered_kg, booking_id, notes').gte('created_at', dayStart).lte('created_at', dayEnd),
        supabase.from('coffee_records').select('id, kilograms, coffee_type').gte('created_at', weekStart).lte('created_at', weekEnd),
        supabase.from('coffee_bookings').select('booked_quantity_kg').gte('created_at', weekStart).lte('created_at', weekEnd),
        supabase.from('buyer_contracts').select('contract_ref, buyer_name, total_quantity, allocated_quantity, status'),
        supabase.from('coffee_bookings').select('supplier_name, booked_quantity_kg, delivered_quantity_kg, remaining_quantity_kg, status').in('status', ['active', 'partially_fulfilled']),
      ]);

      const dayKg = dayRecords.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;
      const dayBags = dayRecords.data?.reduce((s, r) => s + (r.bags || 0), 0) || 0;
      const weekKg = weekRecords.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;
      const weekBookedKg = weekBookings.data?.reduce((s, b) => s + (b.booked_quantity_kg || 0), 0) || 0;
      const dayDeliveredKg = dayDeliveries.data?.reduce((s, d) => s + (d.delivered_kg || 0), 0) || 0;

      // Group day records by supplier
      const bySupplier = new Map<string, { kg: number; bags: number; type: string }>();
      dayRecords.data?.forEach((r: any) => {
        const key = r.supplier_name;
        const ex = bySupplier.get(key) || { kg: 0, bags: 0, type: r.coffee_type };
        ex.kg += r.kilograms || 0;
        ex.bags += r.bags || 0;
        bySupplier.set(key, ex);
      });
      const dailySupplierBreakdown = Array.from(bySupplier.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.kg - a.kg);

      // Contract fulfillment summary
      const contractSummary = (buyerContracts.data || []).map((c: any) => ({
        ref: c.contract_ref,
        buyer: c.buyer_name,
        total: c.total_quantity,
        allocated: c.allocated_quantity,
        remaining: c.total_quantity - c.allocated_quantity,
        status: c.status,
        fulfillment: c.total_quantity > 0 ? ((c.allocated_quantity / c.total_quantity) * 100).toFixed(0) : '0',
      }));

      // Abandoned bookings (expired/cancelled with remaining qty)
      const abandonedBookings = (activeBookings.data || []).filter((b: any) => 
        b.status === 'active' && (b.delivered_quantity_kg || 0) === 0
      );

      return {
        dayRecords: dayRecords.data?.length || 0,
        dayKg,
        dayBags,
        dayDeliveredKg,
        dayNewBookings: dayBookings.data?.length || 0,
        weekKg,
        weekBookedKg,
        dailySupplierBreakdown,
        contractSummary,
        abandonedBookings,
        totalActiveBookings: activeBookings.data?.length || 0,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />Procurement Daily Report
        </h3>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[180px]" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Day Purchases</p>
          <p className="text-2xl font-bold">{data?.dayRecords}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Day Kg</p>
          <p className="text-2xl font-bold">{(data?.dayKg || 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Day Bags</p>
          <p className="text-2xl font-bold">{data?.dayBags}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Booking Deliveries</p>
          <p className="text-2xl font-bold">{(data?.dayDeliveredKg || 0).toLocaleString()} kg</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">New Bookings</p>
          <p className="text-2xl font-bold">{data?.dayNewBookings}</p>
        </CardContent></Card>
      </div>

      {/* Daily supplier breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Daily Supplier Breakdown — {format(parseISO(selectedDate), 'dd MMM yyyy')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Coffee Type</TableHead>
              <TableHead>Kilograms</TableHead>
              <TableHead>Bags</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.dailySupplierBreakdown.map(s => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                  <TableCell>{s.kg.toLocaleString()}</TableCell>
                  <TableCell>{s.bags}</TableCell>
                </TableRow>
              ))}
              {(!data?.dailySupplierBreakdown || data.dailySupplierBreakdown.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No purchases on this date</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contract Fulfillment Status */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Buyer Contract Fulfillment Status</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Contract</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Total Qty</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.contractSummary.map((c: any) => (
                <TableRow key={c.ref}>
                  <TableCell className="font-mono text-xs">{c.ref}</TableCell>
                  <TableCell className="font-medium">{c.buyer}</TableCell>
                  <TableCell>{c.total.toLocaleString()} kg</TableCell>
                  <TableCell>{c.allocated.toLocaleString()} kg</TableCell>
                  <TableCell className="text-green-600 font-medium">{c.remaining.toLocaleString()} kg</TableCell>
                  <TableCell>
                    <Badge variant={parseInt(c.fulfillment) >= 90 ? 'default' : parseInt(c.fulfillment) >= 50 ? 'secondary' : 'destructive'}>
                      {c.fulfillment}%
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(!data?.contractSummary || data.contractSummary.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No contracts</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Zero-delivery bookings alert */}
      {(data?.abandonedBookings?.length || 0) > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Bookings with Zero Deliveries ({data?.abandonedBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Booked Qty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data?.abandonedBookings.slice(0, 10).map((b: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{b.supplier_name}</TableCell>
                    <TableCell>{(b.booked_quantity_kg || 0).toLocaleString()} kg</TableCell>
                    <TableCell><Badge variant="destructive">No deliveries</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Week summary */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">Week Summary</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Week Purchases</p>
              <p className="text-xl font-bold">{(data?.weekKg || 0).toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Week Bookings Created</p>
              <p className="text-xl font-bold">{(data?.weekBookedKg || 0).toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Bookings</p>
              <p className="text-xl font-bold">{data?.totalActiveBookings || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementReportsTab;
