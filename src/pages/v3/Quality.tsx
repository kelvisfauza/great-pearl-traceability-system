import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';
import { FlaskConical, Lock } from 'lucide-react';

const FIELDS: [string, string][] = [
  ['moisture', 'Moisture %'], ['outturn', 'Outturn %'], ['foreign_matter', 'Foreign matter %'],
  ['screen_size', 'Screen'], ['defect_black', 'Black'], ['defect_pods', 'Pods'],
  ['defect_husks', 'Husks'], ['defect_triage', 'Triage'], ['defect_broken', 'Broken'],
  ['defect_insect', 'Insect'], ['cup_score', 'Cup score'],
];

export default function V3Quality() {
  const { hasRole } = useV3Roles();
  const isOfficer = hasRole('quality_officer');
  const isManager = hasRole('quality_manager');
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: queue = [] } = useQuery({
    queryKey: ['v3-quality-queue'],
    queryFn: async () => {
      const { data } = await supabase.from('v3_receiving_records')
        .select('id, receiving_number, sample_code, coffee_type, bags, status')
        .in('status', ['awaiting_quality', 'quality_submitted'])
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ['v3-quality-analyses'],
    queryFn: async () => (await supabase.from('v3_quality_analyses').select('*').order('created_at', { ascending: false }).limit(200)).data || [],
  });

  const upsert = useMutation({
    mutationFn: async ({ receiving, sample, values }: { receiving: string; sample: string; values: Record<string, any> }) => {
      const existing = analyses.find((a: any) => a.receiving_id === receiving);
      if (existing) {
        const { error } = await (supabase.from('v3_quality_analyses') as any).update(values).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('v3_quality_analyses') as any).insert({
          receiving_id: receiving,
          sample_code: sample,
          analysed_by: (await supabase.auth.getUser()).data.user?.id,
          ...values,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['v3-quality-analyses'] });
      qc.invalidateQueries({ queryKey: ['v3-quality-queue'] });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const submit = async (receivingId: string, sample: string) => {
    await upsert.mutateAsync({ receiving: receivingId, sample, values: { submitted: true, submitted_at: new Date().toISOString() } });
    await (supabase.from('v3_receiving_records') as any).update({ status: 'quality_submitted' }).eq('id', receivingId);
    qc.invalidateQueries({ queryKey: ['v3-quality-queue'] });
    toast({ title: 'Results submitted', description: 'Results are now locked and supplier details are released.' });
  };

  return (
    <V3Layout title="Quality Laboratory" description="Blind sample analysis, retests and approvals">
      {queue.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No samples in the queue.</CardContent></Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {queue.map((r: any) => {
          const a: any = analyses.find((x: any) => x.receiving_id === r.id) || {};
          const locked = a.submitted && !isManager;
          return (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Sample {r.sample_code}</span>
                  <span className="flex items-center gap-2">
                    {a.submitted && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> Locked</Badge>}
                    <Badge variant="outline">{r.coffee_type} · {r.bags} bags</Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {FIELDS.map(([key, label]) => (
                    <div key={key}>
                      <Label className="text-[11px]">{label}</Label>
                      <Input className="h-8" disabled={locked || !(isOfficer || isManager)} defaultValue={a[key] ?? ''}
                        onBlur={(e) => {
                          const val = key === 'screen_size' ? e.target.value : (e.target.value === '' ? null : Number(e.target.value));
                          if (val !== (a[key] ?? null)) upsert.mutate({ receiving: r.id, sample: r.sample_code, values: { [key]: val } });
                        }} />
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-[11px]">Cup notes / recommendation</Label>
                  <Input className="h-8" disabled={locked} defaultValue={a.cup_notes ?? ''}
                    onBlur={(e) => e.target.value !== (a.cup_notes ?? '') && upsert.mutate({ receiving: r.id, sample: r.sample_code, values: { cup_notes: e.target.value } })} />
                </div>
                <div className="flex gap-2">
                  {!a.submitted && (isOfficer || isManager) && (
                    <>
                      <Button size="sm" onClick={() => { upsert.mutate({ receiving: r.id, sample: r.sample_code, values: { recommendation: 'accept' } }); submit(r.id, r.sample_code); }}>Submit — Accept</Button>
                      <Button size="sm" variant="destructive" onClick={() => { upsert.mutate({ receiving: r.id, sample: r.sample_code, values: { recommendation: 'reject' } }); submit(r.id, r.sample_code); }}>Submit — Reject</Button>
                    </>
                  )}
                  {a.submitted && isManager && (
                    <Button size="sm" variant="outline" onClick={() => upsert.mutate({ receiving: r.id, sample: r.sample_code, values: { retest_requested: true } })}>
                      Request retest
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </V3Layout>
  );
}