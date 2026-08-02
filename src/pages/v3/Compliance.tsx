import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function V3Compliance() {
  const { data: suppliers = [] } = useQuery({
    queryKey: ['v3-compliance-suppliers'],
    queryFn: async () => (await supabase.from('v3_suppliers').select('*').order('name')).data as any[] || [],
  });

  const { data: audit = [] } = useQuery({
    queryKey: ['v3-audit'],
    queryFn: async () => (await supabase.from('v3_audit_log').select('*').order('created_at', { ascending: false }).limit(100)).data as any[] || [],
  });

  const traced = suppliers.filter((s: any) => s.gps_lat && s.gps_lng).length;

  return (
    <V3Layout title="EUDR, Compliance & Audit" description="Farmer traceability coverage and the permanent audit trail">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Registered suppliers</p><p className="text-lg font-semibold">{suppliers.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">With GPS coordinates</p><p className="text-lg font-semibold">{traced}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Traceability coverage</p><p className="text-lg font-semibold">{suppliers.length ? Math.round((traced / suppliers.length) * 100) : 0}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Supplier traceability register</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>District</TableHead><TableHead>GPS</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {suppliers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No suppliers registered.</TableCell></TableRow>}
              {suppliers.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.district || '—'}</TableCell>
                  <TableCell>{s.gps_lat && s.gps_lng ? `${s.gps_lat}, ${s.gps_lng}` : <Badge variant="destructive">Missing</Badge>}</TableCell>
                  <TableCell><Badge variant={s.active ? 'secondary' : 'outline'}>{s.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Audit trail (read-only)</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm max-h-96 overflow-y-auto">
          {audit.length === 0 && <p className="text-muted-foreground">No audit entries.</p>}
          {audit.map((a: any) => (
            <div key={a.id} className="flex justify-between gap-3 border-b last:border-0 py-1">
              <span className="truncate">{a.action} · {a.entity_type}</span>
              <span className="text-xs text-muted-foreground shrink-0">{a.actor_name || 'System'} · {new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </V3Layout>
  );
}