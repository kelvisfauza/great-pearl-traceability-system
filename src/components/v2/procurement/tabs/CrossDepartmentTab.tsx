import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare, CheckCircle, XCircle, Clock } from "lucide-react";

const CrossDepartmentTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['procurement-cross-dept'],
    queryFn: async () => {
      const [bookings, payments, assessments] = await Promise.all([
        supabase.from('coffee_bookings').select('id, supplier_name, booked_quantity_kg, delivered_quantity_kg, booked_price_per_kg, status').order('created_at', { ascending: false }).limit(100),
        supabase.from('supplier_payments').select('supplier_name, amount_ugx, status, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('quality_assessments').select('batch_number, status, supplier_name, final_price, coffee_type').order('created_at', { ascending: false }).limit(200),
      ]);
      return {
        bookings: bookings.data || [],
        payments: payments.data || [],
        assessments: assessments.data || [],
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Quality check: bookings with no corresponding quality assessment
  const assessedSuppliers = new Set(data?.assessments.map((a: any) => a.supplier_name) || []);
  const pendingQuality = data?.bookings.filter((b: any) =>
    b.status === 'active' && (b.delivered_quantity_kg || 0) > 0 && !assessedSuppliers.has(b.supplier_name)
  ) || [];

  // Payment check: group payments by supplier
  const paymentsBySupplier = new Map<string, number>();
  data?.payments.forEach((p: any) => {
    if (p.status === 'completed') {
      paymentsBySupplier.set(p.supplier_name, (paymentsBySupplier.get(p.supplier_name) || 0) + (p.amount_ugx || 0));
    }
  });

  // Procurement value by supplier
  const procValueBySupplier = new Map<string, number>();
  data?.bookings.forEach((b: any) => {
    const val = (b.delivered_quantity_kg || 0) * (b.booked_price_per_kg || 0);
    procValueBySupplier.set(b.supplier_name, (procValueBySupplier.get(b.supplier_name) || 0) + val);
  });

  // Suppliers with procurement value but low payment ratio
  const paymentGaps = Array.from(procValueBySupplier.entries())
    .map(([supplier, procValue]) => ({
      supplier,
      procValue,
      paid: paymentsBySupplier.get(supplier) || 0,
      ratio: procValue > 0 ? ((paymentsBySupplier.get(supplier) || 0) / procValue * 100) : 0
    }))
    .filter(s => s.procValue > 0)
    .sort((a, b) => a.ratio - b.ratio);

  const qualityApproved = data?.assessments.filter((a: any) => a.status === 'approved').length || 0;
  const qualityPending = data?.assessments.filter((a: any) => a.status === 'pending').length || 0;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <GitCompare className="h-5 w-5" />Cross-Department Workflow
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Quality Approved</p>
          <p className="text-2xl font-bold text-green-600">{qualityApproved}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Quality Pending</p>
          <p className="text-2xl font-bold text-orange-600">{qualityPending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Awaiting QC Review</p>
          <p className="text-2xl font-bold text-blue-600">{pendingQuality.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Payment Gaps</p>
          <p className="text-2xl font-bold text-red-600">{paymentGaps.filter(g => g.ratio < 80).length}</p>
        </CardContent></Card>
      </div>

      {/* Procurement-to-Payment Flow */}
      <Card>
        <CardHeader><CardTitle>Procurement → Finance Payment Tracking</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Procurement Value</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead>Payment Ratio</TableHead>
              <TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paymentGaps.slice(0, 20).map(g => (
                <TableRow key={g.supplier}>
                  <TableCell className="font-medium">{g.supplier}</TableCell>
                  <TableCell>UGX {g.procValue.toLocaleString()}</TableCell>
                  <TableCell>UGX {g.paid.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={g.ratio >= 90 ? 'secondary' : g.ratio >= 50 ? 'outline' : 'destructive'}>
                      {g.ratio.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {g.ratio >= 90 ? (
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" />Settled</span>
                    ) : g.ratio >= 50 ? (
                      <span className="flex items-center gap-1 text-orange-600"><Clock className="h-3 w-3" />Partial</span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />Outstanding</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {paymentGaps.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No data available</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Quality Review */}
      {pendingQuality.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Deliveries Awaiting Quality Review</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Delivered (kg)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pendingQuality.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.supplier_name}</TableCell>
                    <TableCell>{(b.delivered_quantity_kg || 0).toLocaleString()} kg</TableCell>
                    <TableCell><Badge variant="outline">Awaiting QC</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CrossDepartmentTab;
