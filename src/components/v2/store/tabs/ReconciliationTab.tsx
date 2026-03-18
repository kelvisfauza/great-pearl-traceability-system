import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare } from "lucide-react";

const ReconciliationTab = () => {
  const { data: storeRecords, isLoading: loadingStore } = useQuery({
    queryKey: ['reconcile-store'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coffee_records').select('id, batch_number, supplier_name, bags, kilograms, status, date').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  const { data: qualityRecords, isLoading: loadingQuality } = useQuery({
    queryKey: ['reconcile-quality'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_assessments').select('coffee_record_id, batch_number, status').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  if (loadingStore || loadingQuality) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const assessedIds = new Set(qualityRecords?.map((q: any) => q.coffee_record_id) || []);
  const pendingInStore = storeRecords?.filter(r => r.status === 'pending') || [];
  const assessedInStore = storeRecords?.filter(r => assessedIds.has(r.id)) || [];
  const unassessed = pendingInStore.filter(r => !assessedIds.has(r.id));

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><GitCompare className="h-5 w-5" />Store vs Quality Reconciliation</h3>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total in Store</p><p className="text-2xl font-bold">{storeRecords?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Quality Assessed</p><p className="text-2xl font-bold text-green-600">{assessedInStore.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending Quality</p><p className="text-2xl font-bold text-orange-600">{unassessed.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Unassessed Batches (Store → Quality Gap)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Batch</TableHead><TableHead>Supplier</TableHead><TableHead>Bags</TableHead><TableHead>Kg</TableHead><TableHead>Store Status</TableHead><TableHead>Quality Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {unassessed.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.batch_number}</TableCell>
                  <TableCell>{r.supplier_name}</TableCell>
                  <TableCell>{r.bags}</TableCell>
                  <TableCell>{r.kilograms?.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                  <TableCell><Badge variant="destructive">Not Assessed</Badge></TableCell>
                </TableRow>
              ))}
              {unassessed.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">All batches reconciled ✓</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReconciliationTab;
