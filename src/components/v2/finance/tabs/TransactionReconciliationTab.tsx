import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare } from "lucide-react";

const TransactionReconciliationTab = () => {
  const { data: qualityApproved, isLoading: loadingQ } = useQuery({
    queryKey: ['finance-reconcile-quality'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_assessments')
        .select('id, batch_number, status, suggested_price, final_price, created_at')
        .in('status', ['approved', 'submitted_to_finance']).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  const { data: financeLots, isLoading: loadingF } = useQuery({
    queryKey: ['finance-reconcile-lots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('finance_coffee_lots').select('quality_assessment_id, finance_status, total_amount_ugx');
      if (error) throw error;
      return data;
    }
  });

  if (loadingQ || loadingF) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const paidIds = new Set(financeLots?.filter(l => l.finance_status === 'PAID').map(l => l.quality_assessment_id) || []);
  const processedIds = new Set(financeLots?.map(l => l.quality_assessment_id) || []);
  const paid = qualityApproved?.filter(q => paidIds.has(q.id)) || [];

  // Group by batch number so the same batch is never listed twice.
  const byBatch = new Map<string, any[]>();
  (qualityApproved || []).forEach((q: any) => {
    const key = String(q.batch_number || q.id);
    byBatch.set(key, [...(byBatch.get(key) || []), q]);
  });

  // Duplicates = one batch number with more than one quality assessment.
  const duplicateBatches = Array.from(byBatch.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([batch, rows]) => ({
      batch,
      count: rows.length,
      paidCount: rows.filter((r: any) => paidIds.has(r.id)).length,
    }));

  // Keep only the newest assessment per batch, and only if none of its rows is paid.
  const unpaid = Array.from(byBatch.values())
    .filter((rows) => !rows.some((r: any) => paidIds.has(r.id)))
    .map((rows) => rows[0]);

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><GitCompare className="h-5 w-5" />Quality → Payment Reconciliation</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Approved</p><p className="text-2xl font-bold">{byBatch.size}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold text-green-600">{paid.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Unpaid</p><p className="text-2xl font-bold text-orange-600">{unpaid.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Duplicate Batches</p><p className="text-2xl font-bold text-amber-600">{duplicateBatches.length}</p></CardContent></Card>
      </div>

      {duplicateBatches.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Duplicate Batches (same batch assessed more than once)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Batch</TableHead><TableHead>Assessments</TableHead><TableHead>Paid Records</TableHead><TableHead>Risk</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {duplicateBatches.map((d) => (
                  <TableRow key={d.batch}>
                    <TableCell className="font-mono">{d.batch}</TableCell>
                    <TableCell>{d.count}</TableCell>
                    <TableCell>{d.paidCount}</TableCell>
                    <TableCell>
                      {d.paidCount > 1
                        ? <Badge variant="destructive">Possible double payment</Badge>
                        : <Badge variant="outline">Review duplicate entry</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Unpaid Quality-Approved Batches</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Batch</TableHead><TableHead>Quality Status</TableHead><TableHead>Price</TableHead><TableHead>Payment Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {unpaid.map((q: any) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono">{q.batch_number}</TableCell>
                  <TableCell><Badge variant="outline">{q.status}</Badge></TableCell>
                  <TableCell>UGX {(q.final_price || q.suggested_price || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="destructive">{processedIds.has(q.id) ? 'Processing' : 'Not Paid'}</Badge></TableCell>
                </TableRow>
              ))}
              {unpaid.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">All reconciled ✓</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionReconciliationTab;
