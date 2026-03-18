import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { format, subDays } from "date-fns";

const BuyingPriceAnalysisTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-buying-price-analysis'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const [records, buyerContracts, bookings, assessments] = await Promise.all([
        supabase.from('coffee_records').select('id, supplier_name, coffee_type, kilograms, date, created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
        supabase.from('buyer_contracts').select('*').eq('status', 'active'),
        supabase.from('coffee_bookings').select('supplier_name, coffee_type, booked_price_per_kg, booked_quantity_kg, delivered_quantity_kg, status').in('status', ['active', 'partially_fulfilled']),
        supabase.from('quality_assessments').select('batch_number, supplier_name, coffee_type, suggested_price, final_price, created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
      ]);

      // Average buying prices by coffee type from assessments (final_price)
      const priceByType = new Map<string, { total: number; count: number; prices: number[] }>();
      assessments.data?.forEach((a: any) => {
        const price = a.final_price || a.suggested_price || 0;
        if (price > 0) {
          const key = a.coffee_type || 'Unknown';
          const existing = priceByType.get(key) || { total: 0, count: 0, prices: [] };
          existing.total += price;
          existing.count += 1;
          existing.prices.push(price);
          priceByType.set(key, existing);
        }
      });

      const avgPrices = Array.from(priceByType.entries()).map(([type, data]) => ({
        type,
        avgPrice: Math.round(data.total / data.count),
        minPrice: Math.min(...data.prices),
        maxPrice: Math.max(...data.prices),
        count: data.count,
      }));

      // Buyer contract prices for comparison
      const contractPrices = (buyerContracts.data || []).map((c: any) => ({
        ref: c.contract_ref,
        buyer: c.buyer_name,
        quality: c.quality,
        sellingPrice: c.price_per_kg,
        totalQty: c.total_quantity,
        allocated: c.allocated_quantity,
      }));

      // Booking prices by supplier
      const bookingsBySupplier = new Map<string, { totalPrice: number; count: number; totalKg: number; delivered: number }>();
      bookings.data?.forEach((b: any) => {
        const key = b.supplier_name;
        const existing = bookingsBySupplier.get(key) || { totalPrice: 0, count: 0, totalKg: 0, delivered: 0 };
        existing.totalPrice += b.booked_price_per_kg || 0;
        existing.count += 1;
        existing.totalKg += b.booked_quantity_kg || 0;
        existing.delivered += b.delivered_quantity_kg || 0;
        bookingsBySupplier.set(key, existing);
      });

      const supplierBookingPrices = Array.from(bookingsBySupplier.entries()).map(([name, d]) => ({
        name,
        avgBookingPrice: Math.round(d.totalPrice / d.count),
        bookings: d.count,
        totalKg: d.totalKg,
        delivered: d.delivered,
      })).sort((a, b) => b.totalKg - a.totalKg);

      // Margin analysis: compare buying prices to contract selling prices
      const avgBuyingPrice = avgPrices.length > 0 ? avgPrices.reduce((s, p) => s + p.avgPrice, 0) / avgPrices.length : 0;
      const avgSellingPrice = contractPrices.length > 0 ? contractPrices.reduce((s, c) => s + c.sellingPrice, 0) / contractPrices.length : 0;

      return {
        avgPrices,
        contractPrices,
        supplierBookingPrices,
        avgBuyingPrice: Math.round(avgBuyingPrice),
        avgSellingPrice: Math.round(avgSellingPrice),
        margin: Math.round(avgSellingPrice - avgBuyingPrice),
        totalPurchases: records.data?.length || 0,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const marginPositive = (data?.margin || 0) > 0;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />Buying Price Analysis vs Contract Prices
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Avg Buying Price</p>
          <p className="text-2xl font-bold">UGX {(data?.avgBuyingPrice || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Per kg (30 days)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Avg Contract Selling</p>
          <p className="text-2xl font-bold">UGX {(data?.avgSellingPrice || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Per kg (buyer contracts)</p>
        </CardContent></Card>
        <Card className={marginPositive ? 'border-green-200' : 'border-red-200'}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Margin</p>
            <p className={`text-2xl font-bold flex items-center gap-1 ${marginPositive ? 'text-green-600' : 'text-red-600'}`}>
              {marginPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              UGX {Math.abs(data?.margin || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{marginPositive ? 'Profit' : 'Loss'} per kg</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Purchases (30d)</p>
          <p className="text-2xl font-bold">{data?.totalPurchases || 0}</p>
        </CardContent></Card>
      </div>

      {/* Average buying prices by coffee type */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Average Buying Prices by Coffee Type (30 Days)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Coffee Type</TableHead>
              <TableHead>Avg Price/kg</TableHead>
              <TableHead>Min Price</TableHead>
              <TableHead>Max Price</TableHead>
              <TableHead>Assessments</TableHead>
              <TableHead>Spread</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.avgPrices.map(p => (
                <TableRow key={p.type}>
                  <TableCell className="font-medium">{p.type}</TableCell>
                  <TableCell>UGX {p.avgPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">UGX {p.minPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">UGX {p.maxPrice.toLocaleString()}</TableCell>
                  <TableCell>{p.count}</TableCell>
                  <TableCell>
                    <Badge variant={p.maxPrice - p.minPrice > 1000 ? 'destructive' : 'secondary'}>
                      ±{(p.maxPrice - p.minPrice).toLocaleString()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.avgPrices || data.avgPrices.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No price data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Buyer contract prices */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Buyer Contract Selling Prices (Active)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Contract Ref</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Selling Price/kg</TableHead>
              <TableHead>Total Qty</TableHead>
              <TableHead>Remaining</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.contractPrices.map((c: any) => (
                <TableRow key={c.ref}>
                  <TableCell className="font-mono text-xs">{c.ref}</TableCell>
                  <TableCell className="font-medium">{c.buyer}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-xs">{c.quality}</TableCell>
                  <TableCell className="font-medium">UGX {c.sellingPrice.toLocaleString()}</TableCell>
                  <TableCell>{c.totalQty.toLocaleString()} kg</TableCell>
                  <TableCell className="text-green-600 font-medium">{(c.totalQty - c.allocated).toLocaleString()} kg</TableCell>
                </TableRow>
              ))}
              {(!data?.contractPrices || data.contractPrices.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No active buyer contracts</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Supplier booking prices */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Supplier Booking Prices (Active Bookings)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Avg Booking Price/kg</TableHead>
              <TableHead>Active Bookings</TableHead>
              <TableHead>Total Booked (kg)</TableHead>
              <TableHead>Delivered (kg)</TableHead>
              <TableHead>Fulfillment</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.supplierBookingPrices.map(s => {
                const rate = s.totalKg > 0 ? ((s.delivered / s.totalKg) * 100).toFixed(0) : '0';
                return (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>UGX {s.avgBookingPrice.toLocaleString()}</TableCell>
                    <TableCell>{s.bookings}</TableCell>
                    <TableCell>{s.totalKg.toLocaleString()}</TableCell>
                    <TableCell>{s.delivered.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={parseInt(rate) >= 80 ? 'default' : parseInt(rate) >= 40 ? 'secondary' : 'destructive'}>
                        {rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!data?.supplierBookingPrices || data.supplierBookingPrices.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No booking data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyingPriceAnalysisTab;
