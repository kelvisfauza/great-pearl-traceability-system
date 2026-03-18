import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Package, FileText, TrendingUp, ShoppingCart, BookOpen, AlertTriangle, DollarSign } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";

const ProcurementOverviewTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-overview-full'],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const weekAgo = subDays(new Date(), 7).toISOString();

      const [suppliers, buyerContracts, supplierContracts, bookings, todayRecords, weekRecords, sales] = await Promise.all([
        supabase.from('suppliers').select('id, name, bank_name, account_number', { count: 'exact' }),
        supabase.from('buyer_contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('supplier_contracts').select('*', { count: 'exact' }).eq('status', 'Active'),
        supabase.from('coffee_bookings').select('*').in('status', ['active', 'partially_fulfilled']),
        supabase.from('coffee_records').select('id, kilograms, supplier_name, coffee_type').gte('created_at', today),
        supabase.from('coffee_records').select('id, kilograms').gte('created_at', weekAgo),
        supabase.from('sales_transactions').select('id, weight, total_amount').gte('created_at', weekAgo),
      ]);

      const activeBuyerContracts = buyerContracts.data?.filter(c => c.status === 'active') || [];
      const totalContractVolume = activeBuyerContracts.reduce((s, c) => s + (c.total_quantity || 0), 0);
      const allocatedVolume = activeBuyerContracts.reduce((s, c) => s + (c.allocated_quantity || 0), 0);
      const totalBookedKg = bookings.data?.reduce((s, b) => s + (b.booked_quantity_kg || 0), 0) || 0;
      const totalDeliveredKg = bookings.data?.reduce((s, b) => s + (b.delivered_quantity_kg || 0), 0) || 0;
      const todayKg = todayRecords.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;
      const weekKg = weekRecords.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;
      const weekSalesKg = sales.data?.reduce((s, t) => s + (t.quantity_kg || 0), 0) || 0;
      const missingBank = suppliers.data?.filter((s: any) => !s.bank_name || !s.account_number).length || 0;

      return {
        totalSuppliers: suppliers.count || 0,
        activeSuppliers: suppliers.data?.filter(s => s.status === 'active').length || 0,
        missingBank,
        buyerContracts: buyerContracts.data || [],
        activeBuyerContracts: activeBuyerContracts.length,
        totalContractVolume,
        allocatedVolume,
        remainingVolume: totalContractVolume - allocatedVolume,
        activeSupplierContracts: supplierContracts.count || 0,
        activeBookings: bookings.data?.length || 0,
        totalBookedKg,
        totalDeliveredKg,
        bookingFulfillment: totalBookedKg > 0 ? ((totalDeliveredKg / totalBookedKg) * 100).toFixed(1) : '0',
        todayPurchases: todayRecords.data?.length || 0,
        todayKg,
        weekKg,
        weekSalesKg,
        recentContracts: (buyerContracts.data || []).slice(0, 5),
      };
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const stats = [
    { label: "Total Suppliers", value: data?.totalSuppliers || 0, sub: `${data?.missingBank || 0} missing bank info`, icon: Users, color: "text-blue-500" },
    { label: "Active Buyer Contracts", value: data?.activeBuyerContracts || 0, sub: `${(data?.totalContractVolume || 0).toLocaleString()} kg total`, icon: FileText, color: "text-green-500" },
    { label: "Contract Volume Left", value: `${((data?.remainingVolume || 0) / 1000).toFixed(0)}t`, sub: `${((data?.allocatedVolume || 0) / 1000).toFixed(0)}t allocated`, icon: Package, color: "text-purple-500" },
    { label: "Active Bookings", value: data?.activeBookings || 0, sub: `${data?.bookingFulfillment}% fulfilled`, icon: BookOpen, color: "text-amber-500" },
    { label: "Today's Purchases", value: data?.todayPurchases || 0, sub: `${(data?.todayKg || 0).toLocaleString()} kg`, icon: ShoppingCart, color: "text-teal-500" },
    { label: "Week Purchases", value: `${((data?.weekKg || 0) / 1000).toFixed(1)}t`, sub: `${((data?.weekSalesKg || 0) / 1000).toFixed(1)}t sold`, icon: TrendingUp, color: "text-indigo-500" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {(data?.missingBank || 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-sm">Supplier Bank Details Missing</p>
              <p className="text-xs text-muted-foreground">{data?.missingBank} suppliers are missing bank information. Go to Suppliers tab to update.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Buyer Contracts */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent Buyer Contracts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Total Qty</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Price/kg</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data?.recentContracts.map((c: any) => {
                const remaining = (c.total_quantity || 0) - (c.allocated_quantity || 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.contract_ref}</TableCell>
                    <TableCell className="font-medium">{c.buyer_name}</TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs">{c.quality}</TableCell>
                    <TableCell>{(c.total_quantity || 0).toLocaleString()} kg</TableCell>
                    <TableCell>{(c.allocated_quantity || 0).toLocaleString()} kg</TableCell>
                    <TableCell className="font-medium text-green-600">{remaining.toLocaleString()} kg</TableCell>
                    <TableCell>UGX {(c.price_per_kg || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!data?.recentContracts || data.recentContracts.length === 0) && (
                <TableRow><TableCell colSpan={8} className="text-center py-4 text-muted-foreground">No buyer contracts yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementOverviewTab;
