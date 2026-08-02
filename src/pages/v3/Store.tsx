import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function V3Store() {
  const { data: batches = [] } = useQuery({
    queryKey: ['v3-stock'],
    queryFn: async () => (await supabase.from('v3_stock_batches').select('*, v3_branches(name)').order('created_at', { ascending: false })).data as any[] || [],
  });

  const byState = batches.reduce((acc: Record<string, number>, b: any) => {
    acc[b.state] = (acc[b.state] || 0) + Number(b.kilograms || 0);
    return acc;
  }, {});

  return (
    <V3Layout title="Store & Warehouse" description="Stock by branch, batch and stock state">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(byState).map(([state, kg]) => (
          <Card key={state}><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground capitalize">{state.replace(/_/g, ' ')}</p>
            <p className="text-lg font-semibold tabular-nums">{kg.toLocaleString()} kg</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Batches</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Batch</TableHead><TableHead>Branch</TableHead><TableHead>Coffee</TableHead>
              <TableHead>Bags</TableHead><TableHead>Kg</TableHead><TableHead>Available</TableHead><TableHead>State</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {batches.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No stock batches yet.</TableCell></TableRow>}
              {batches.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.batch_number}</TableCell>
                  <TableCell>{b.v3_branches?.name || '—'}</TableCell>
                  <TableCell>{b.coffee_type} {b.grade}</TableCell>
                  <TableCell className="tabular-nums">{b.bags}</TableCell>
                  <TableCell className="tabular-nums">{Number(b.kilograms).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{Number(b.available_kilograms).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{b.state.replace(/_/g, ' ')}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </V3Layout>
  );
}