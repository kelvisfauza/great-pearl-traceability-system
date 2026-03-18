import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const OrderTrackingTab = () => {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['procurement-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const active = bookings?.filter((b: any) => b.status === 'active') || [];
  const completed = bookings?.filter((b: any) => b.status === 'completed') || [];
  const expired = bookings?.filter((b: any) => b.status === 'expired') || [];

  // Flag discrepancies: delivered vs booked > 5% difference
  const discrepancies = bookings?.filter((b: any) => {
    if (!b.booked_quantity_kg || b.booked_quantity_kg === 0) return false;
    const ratio = (b.delivered_quantity_kg || 0) / b.booked_quantity_kg;
    return b.status === 'completed' && (ratio < 0.95 || ratio > 1.05);
  }) || [];

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" />Order Tracking & Deliveries
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-bold">{bookings?.length || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{active.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-blue-600">{completed.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Discrepancies</p>
          <p className="text-2xl font-bold text-red-600">{discrepancies.length}</p>
        </CardContent></Card>
      </div>

      {/* Discrepancy Alerts */}
      {discrepancies.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />Quantity Discrepancies ({discrepancies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ordered (kg)</TableHead>
                <TableHead>Delivered (kg)</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {discrepancies.map((b: any) => {
                  const variance = (b.delivered_quantity_kg || 0) - (b.booked_quantity_kg || 0);
                  const pct = ((variance / b.booked_quantity_kg) * 100).toFixed(1);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.supplier_name}</TableCell>
                      <TableCell>{b.coffee_type}</TableCell>
                      <TableCell>{b.booked_quantity_kg?.toLocaleString()}</TableCell>
                      <TableCell>{(b.delivered_quantity_kg || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {variance > 0 ? '+' : ''}{variance.toLocaleString()} kg ({pct}%)
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Active Orders */}
      <Card>
        <CardHeader><CardTitle>Active Orders ({active.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Booked (kg)</TableHead>
              <TableHead>Delivered (kg)</TableHead>
              <TableHead>Remaining (kg)</TableHead>
              <TableHead>Price/kg</TableHead>
              <TableHead>Expiry</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {active.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.supplier_name}</TableCell>
                  <TableCell>{b.coffee_type}</TableCell>
                  <TableCell>{b.booked_quantity_kg?.toLocaleString()}</TableCell>
                  <TableCell>{(b.delivered_quantity_kg || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{(b.remaining_quantity_kg || 0).toLocaleString()}</TableCell>
                  <TableCell>UGX {b.booked_price_per_kg?.toLocaleString()}</TableCell>
                  <TableCell>
                    {b.expiry_date ? (
                      <span className={new Date(b.expiry_date) < new Date() ? 'text-destructive font-medium' : ''}>
                        {format(new Date(b.expiry_date), 'dd MMM yyyy')}
                      </span>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {active.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No active orders</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderTrackingTab;
