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
      const { data, error } = await supabase.from('quality_assessments').select('id, batch_number, status, suggested_price, final_price, created_at')
        .in('status', ['approved', 'submitted_to_finance']).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  const { data: payments, isLoading: loadingP } = useQuery({
    queryKey: ['finance-reconcile-payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('supplier_payments').select('batch_number, amount_ugx, payment_date, status');
      if (error) throw error;
      return data;
    }
  });

  if (loadingQ || loadingP) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const paidBatches = new Set(payments?.map(p => p.batch_number) || []);
  const unpaid = qualityApproved?.filter(q => !paidBatches.has(q.batch_number)) || [];
  const paid = qualityApproved?.filter(q => paidBatches.has(q.batch_number)) || [];

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><GitCompare className="h-5 w-5" />Quality → Payment Reconciliation</h3>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Approved</p><p className="text-2xl font-bold">{qualityApproved?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold text-green-600">{paid.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Unpaid</p><p className="text-2xl font-bold text-orange-600">{unpaid.length}</p></CardContent></Card>
      </div>

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
                  <TableCell><Badge variant="destructive">Not Paid</Badge></TableCell>
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
