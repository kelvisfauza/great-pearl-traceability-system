import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { printV3Grn } from '@/utils/v3GrnPrint';
import { Printer } from 'lucide-react';

export default function V3GRNs() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: grns = [] } = useQuery({
    queryKey: ['v3-grns'],
    queryFn: async () => (await supabase
      .from('v3_grns')
      .select('*, v3_suppliers(name, code), v3_branches(name), v3_receiving_records(coffee_type, processing_type, gross_weight, tare_weight, vehicle, driver_name, created_at, approved_at, v3_quality_analyses(moisture, outturn, cup_score, submitted_at))')
      .order('issued_at', { ascending: false })).data as any[] || [],
  });

  const bumpPrint = useMutation({
    mutationFn: async (g: any) => {
      await (supabase.from('v3_grns') as any).update({ printed_count: (g.printed_count || 0) + 1 }).eq('id', g.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v3-grns'] }),
  });

  const doPrint = (g: any) => {
    const r = g.v3_receiving_records || {};
    const q = (r.v3_quality_analyses || [])[0] || {};
    printV3Grn({
      grn_number: g.grn_number,
      issued_at: g.issued_at,
      branch: g.v3_branches?.name,
      supplier_name: g.v3_suppliers?.name,
      supplier_code: g.v3_suppliers?.code,
      coffee_type: r.coffee_type,
      processing_type: r.processing_type,
      bags: g.bags,
      gross_weight: r.gross_weight,
      tare_weight: r.tare_weight,
      net_weight: g.net_weight,
      unit_price: g.unit_price,
      total_amount: g.total_amount,
      moisture: q.moisture,
      outturn: q.outturn,
      cup_score: q.cup_score,
      delivery_date: r.created_at,
      assessment_date: q.submitted_at || r.approved_at,
      vehicle: r.vehicle,
      driver_name: r.driver_name,
    });
    bumpPrint.mutate(g);
    toast({ title: 'GRN sent to printer', description: `${g.grn_number} — supplier, finance and store copies.` });
  };

  return (
    <V3Layout title="Goods Received Notes" description="Issued GRNs with supplier, finance and store copies">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Issued GRNs</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>GRN</TableHead><TableHead>Supplier</TableHead><TableHead>Branch</TableHead>
              <TableHead>Net kg</TableHead><TableHead>Unit price</TableHead><TableHead>Amount</TableHead>
              <TableHead>Prints</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {grns.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No GRNs issued yet.</TableCell></TableRow>}
              {grns.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.grn_number}</TableCell>
                  <TableCell>{g.v3_suppliers?.name || '—'}</TableCell>
                  <TableCell>{g.v3_branches?.name || '—'}</TableCell>
                  <TableCell className="tabular-nums">{Number(g.net_weight).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{Number(g.unit_price).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">UGX {Number(g.total_amount).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{g.printed_count || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => doPrint(g)}>
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </V3Layout>
  );
}