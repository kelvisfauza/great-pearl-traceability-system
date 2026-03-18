import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";

const SupplierPerformanceTab = () => {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['procurement-supplier-perf'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coffee_bookings').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Group by supplier
  const supplierMap = new Map<string, { booked: number; delivered: number; remaining: number; count: number }>();
  bookings?.forEach((b: any) => {
    const key = b.supplier_name;
    const existing = supplierMap.get(key) || { booked: 0, delivered: 0, remaining: 0, count: 0 };
    existing.booked += b.booked_quantity_kg || 0;
    existing.delivered += b.delivered_quantity_kg || 0;
    existing.remaining += b.remaining_quantity_kg || 0;
    existing.count += 1;
    supplierMap.set(key, existing);
  });

  const suppliers = Array.from(supplierMap.entries()).map(([name, data]) => ({
    name, ...data,
    deliveryRate: data.booked > 0 ? ((data.delivered / data.booked) * 100).toFixed(1) : '0'
  })).sort((a, b) => parseFloat(b.deliveryRate) - parseFloat(a.deliveryRate));

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" />Supplier Performance & Delays</h3>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead><TableHead>Bookings</TableHead><TableHead>Booked (kg)</TableHead><TableHead>Delivered (kg)</TableHead><TableHead>Remaining (kg)</TableHead><TableHead>Delivery Rate</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {suppliers.map(s => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.count}</TableCell>
                  <TableCell>{s.booked.toLocaleString()}</TableCell>
                  <TableCell>{s.delivered.toLocaleString()}</TableCell>
                  <TableCell>{s.remaining.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={parseFloat(s.deliveryRate) >= 80 ? 'secondary' : parseFloat(s.deliveryRate) >= 50 ? 'outline' : 'destructive'}>
                      {s.deliveryRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No booking data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierPerformanceTab;
