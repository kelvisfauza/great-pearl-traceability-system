import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, ShoppingCart, Package } from "lucide-react";
import AttachSaleDialog from "../AttachSaleDialog";

const BatchTraceabilityTab = () => {
  const [attachBatch, setAttachBatch] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: batches, isLoading } = useQuery({
    queryKey: ['eudr-batch-trace'],
    queryFn: async () => {
      const { data, error } = await supabase.from('eudr_batches').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;

      // Fetch attached sales for each batch
      const batchIds = (data || []).map((b: any) => b.id);
      const { data: salesLinks } = await supabase
        .from('eudr_batch_sales')
        .select('batch_id, kilograms_allocated, sale_transaction_id, created_at')
        .in('batch_id', batchIds.length > 0 ? batchIds : ['none']);

      // Fetch sale details
      const saleIds = [...new Set((salesLinks || []).map((s: any) => s.sale_transaction_id))];
      const { data: salesData } = saleIds.length > 0
        ? await supabase.from('sales_transactions').select('id, customer, coffee_type, date').in('id', saleIds)
        : { data: [] };

      const salesMap = new Map((salesData || []).map((s: any) => [s.id, s]));

      return (data || []).map((b: any) => ({
        ...b,
        attached_sales: (salesLinks || [])
          .filter((s: any) => s.batch_id === b.id)
          .map((s: any) => ({ ...s, sale: salesMap.get(s.sale_transaction_id) }))
      }));
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const available = batches?.filter((b: any) => b.status === 'available' || b.status === 'partially_sold') || [];
  const sold = batches?.filter((b: any) => b.status === 'sold_out') || [];

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><Link2 className="h-5 w-5" />Batch Traceability & Sales</h3>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Batches</p><p className="text-2xl font-bold">{batches?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Available</p><p className="text-2xl font-bold text-green-600">{available.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Sold</p><p className="text-2xl font-bold text-blue-600">{sold.length}</p></CardContent></Card>
      </div>

      {/* Available Batches */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Available Batches</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Total (kg)</TableHead>
                <TableHead>Available (kg)</TableHead>
                <TableHead>Attached Sales</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {available.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No available batches</TableCell></TableRow>
              ) : available.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.batch_identifier}</TableCell>
                  <TableCell>{Number(b.kilograms).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold text-green-600">{Number(b.available_kilograms).toLocaleString()}</TableCell>
                  <TableCell>
                    {b.attached_sales?.length > 0 ? (
                      <div className="space-y-1">
                        {b.attached_sales.map((s: any, i: number) => (
                          <div key={i} className="text-xs">
                            <Badge variant="secondary" className="text-xs">
                              {s.sale?.customer || 'Unknown'} — {Number(s.kilograms_allocated).toLocaleString()}kg
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">None</span>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setAttachBatch(b)}>
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Attach Sale
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sold Batches */}
      {sold.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Sold Batches</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Total (kg)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sold.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.batch_identifier}</TableCell>
                    <TableCell>{Number(b.kilograms).toLocaleString()}</TableCell>
                    <TableCell><Badge className="bg-blue-600">Sold</Badge></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {b.attached_sales?.map((s: any, i: number) => (
                          <div key={i} className="text-xs">
                            <Badge variant="outline">
                              {s.sale?.customer || 'Unknown'} — {Number(s.kilograms_allocated).toLocaleString()}kg — {s.sale?.date}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {attachBatch && (
        <AttachSaleDialog
          open={!!attachBatch}
          onOpenChange={(open) => !open && setAttachBatch(null)}
          batch={attachBatch}
        />
      )}
    </div>
  );
};

export default BatchTraceabilityTab;
