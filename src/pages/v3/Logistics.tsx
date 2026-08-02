import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function V3Logistics() {
  const { data: transfers = [] } = useQuery({
    queryKey: ['v3-transfers'],
    queryFn: async () => (await supabase.from('v3_transfers').select('*').order('created_at', { ascending: false })).data as any[] || [],
  });

  return (
    <V3Layout title="Transport & Logistics" description="Transfer notes, trips, seals and arrival verification">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Transfer notes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Transfer</TableHead><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead>
              <TableHead>Seal</TableHead><TableHead>Dispatch kg</TableHead><TableHead>Arrival kg</TableHead>
              <TableHead>Variance</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {transfers.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No transfers recorded.</TableCell></TableRow>}
              {transfers.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.transfer_number}</TableCell>
                  <TableCell>{t.vehicle || '—'}</TableCell>
                  <TableCell>{t.driver_name || '—'}</TableCell>
                  <TableCell>{t.seal_number || '—'}</TableCell>
                  <TableCell className="tabular-nums">{Number(t.dispatch_weight || 0).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{Number(t.arrival_weight || 0).toLocaleString()}</TableCell>
                  <TableCell className={Number(t.variance_kg || 0) !== 0 ? 'text-destructive tabular-nums' : 'tabular-nums'}>{Number(t.variance_kg || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{t.status.replace(/_/g, ' ')}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </V3Layout>
  );
}