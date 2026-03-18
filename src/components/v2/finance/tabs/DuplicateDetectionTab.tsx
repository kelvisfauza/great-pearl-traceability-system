import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const DuplicateDetectionTab = () => {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['finance-duplicate-check'],
    queryFn: async () => {
      const { data, error } = await supabase.from('supplier_payments').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Detect potential duplicates: same supplier + same amount on same day
  const seen = new Map<string, any[]>();
  payments?.forEach((p: any) => {
    const key = `${p.supplier_name || ''}_${p.amount_ugx}_${p.payment_date || format(new Date(p.created_at), 'yyyy-MM-dd')}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(p);
  });

  const duplicates = Array.from(seen.entries()).filter(([_, items]) => items.length > 1);

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><Search className="h-5 w-5" />Duplicate / Suspicious Payment Detection</h3>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className={`h-6 w-6 ${duplicates.length > 0 ? 'text-orange-500' : 'text-green-500'}`} />
          <div>
            <p className="text-sm text-muted-foreground">Potential Duplicates Found</p>
            <p className="text-2xl font-bold">{duplicates.length}</p>
          </div>
        </CardContent>
      </Card>

      {duplicates.length > 0 ? (
        duplicates.map(([key, items]) => (
          <Card key={key}>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Possible duplicate: {items[0].supplier_name} — UGX {items[0].amount_ugx?.toLocaleString()}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Batch</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.created_at), 'PP')}</TableCell>
                      <TableCell className="font-mono">{p.batch_number}</TableCell>
                      <TableCell>UGX {(p.amount_ugx || 0).toLocaleString()}</TableCell>
                      <TableCell>{p.payment_method || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No duplicate or suspicious payments detected ✓</CardContent></Card>
      )}
    </div>
  );
};

export default DuplicateDetectionTab;
