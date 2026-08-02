import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function V3Production() {
  const { data: runs = [] } = useQuery({
    queryKey: ['v3-production'],
    queryFn: async () => (await supabase.from('v3_production_runs').select('*').order('created_at', { ascending: false })).data as any[] || [],
  });

  return (
    <V3Layout title="Production" description="Batch processing, outputs, yields and variance control">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Production runs</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Run</TableHead><TableHead>Machine</TableHead><TableHead>Input kg</TableHead>
              <TableHead>Exportable</TableHead><TableHead>By-products</TableHead><TableHead>Variance</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {runs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No production runs recorded.</TableCell></TableRow>}
              {runs.map((r: any) => {
                const by = ['output_black_kg','output_triage_kg','output_husks_kg','output_pods_kg','output_dust_kg']
                  .reduce((a, k) => a + Number(r[k] || 0), 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.run_number}</TableCell>
                    <TableCell>{r.machine || '—'}</TableCell>
                    <TableCell className="tabular-nums">{Number(r.input_kg).toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums">{Number(r.output_exportable_kg || 0).toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums">{by.toLocaleString()}</TableCell>
                    <TableCell className={Number(r.variance_kg || 0) !== 0 ? 'text-destructive tabular-nums' : 'tabular-nums'}>{Number(r.variance_kg || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </V3Layout>
  );
}