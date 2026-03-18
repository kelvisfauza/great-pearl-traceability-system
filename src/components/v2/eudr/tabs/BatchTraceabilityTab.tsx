import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2 } from "lucide-react";

const BatchTraceabilityTab = () => {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['eudr-batch-trace'],
    queryFn: async () => {
      const { data, error } = await supabase.from('eudr_batches').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const complete = batches?.filter((b: any) => b.status === 'available') || [];
  const incomplete = batches?.filter((b: any) => b.status !== 'available') || [];

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><Link2 className="h-5 w-5" />Batch Traceability</h3>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Batches</p><p className="text-2xl font-bold">{batches?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Fully Traced</p><p className="text-2xl font-bold text-green-600">{complete.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Incomplete</p><p className="text-2xl font-bold text-orange-600">{incomplete.length}</p></CardContent></Card>
      </div>

      {incomplete.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Incomplete Traceability</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {incomplete.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono">{b.batch_id || b.id}</TableCell>
                    <TableCell><Badge variant="destructive">{b.status}</Badge></TableCell>
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

export default BatchTraceabilityTab;
