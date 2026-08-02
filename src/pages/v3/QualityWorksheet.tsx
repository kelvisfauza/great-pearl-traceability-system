import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FlaskConical, Lock, ShieldCheck, TriangleAlert, Beaker } from 'lucide-react';

const PHYSICAL: [string, string, string][] = [
  ['sample_weight', 'Sample weight (g)', 'g'],
  ['moisture', 'Moisture', '%'],
  ['outturn', 'Outturn', '%'],
  ['foreign_matter', 'Foreign matter', '%'],
  ['screen_retention', 'Screen retention', '%'],
];

const DEFECTS: [string, string][] = [
  ['defect_black', 'Black'], ['defect_pods', 'Pods'], ['defect_husks', 'Husks'],
  ['defect_triage', 'Triage'], ['defect_broken', 'Broken'], ['defect_insect', 'Insect damaged'],
  ['defect_stones', 'Stones'], ['defect_immature', 'Immature'],
];

export function gradeTone(grade?: string | null) {
  if (grade === 'Grade A') return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  if (grade === 'Grade B') return 'bg-sky-500/15 text-sky-600 border-sky-500/30';
  if (grade === 'Grade C') return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  if (grade === 'Off-grade') return 'bg-destructive/15 text-destructive border-destructive/30';
  return 'bg-muted text-muted-foreground';
}

export default function QualityWorksheet({
  record, analysis, canEdit, blind,
}: { record: any; analysis: any; canEdit: boolean; blind: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<string>(analysis?.cup_notes ?? '');

  const locked = !!analysis?.submitted;
  const editable = canEdit && !locked;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['v3-quality-analyses'] });
    qc.invalidateQueries({ queryKey: ['v3-quality-queue'] });
  };

  const save = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (analysis?.id) {
        const { error } = await (supabase.from('v3_quality_analyses') as any).update(values).eq('id', analysis.id);
        if (error) throw error;
        return analysis.id as string;
      }
      const { data, error } = await (supabase.from('v3_quality_analyses') as any).insert({
        receiving_id: record.id,
        sample_code: record.sample_code,
        analysed_by: (await supabase.auth.getUser()).data.user?.id,
        ...values,
      }).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      let id = analysis?.id;
      if (!id) id = await save.mutateAsync({});
      const { data, error } = await (supabase.rpc as any)('v3_submit_quality_analysis', { p_analysis_id: id });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (d: any) => {
      toast({
        title: `Results submitted — ${d.grade ?? 'ungraded'}`,
        description: d.passed === false ? 'Sample failed standard; sent to the Quality Manager for a decision.' : 'Sent to the Quality Manager for approval.',
      });
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Submission blocked', description: e.message, variant: 'destructive' }),
  });

  const totalDefects = useMemo(
    () => DEFECTS.reduce((s, [k]) => s + Number(analysis?.[k] ?? 0), 0),
    [analysis],
  );
  const failures: string[] = Array.isArray(analysis?.failures) ? analysis.failures : [];

  const field = (key: string, label: string, unit?: string) => (
    <div key={key}>
      <Label className="text-[11px] text-muted-foreground">{label}{unit ? ` (${unit})` : ''}</Label>
      <Input
        className="h-8"
        type="number"
        step="0.01"
        disabled={!editable}
        defaultValue={analysis?.[key] ?? ''}
        onBlur={(e) => {
          const val = e.target.value === '' ? null : Number(e.target.value);
          if (val !== (analysis?.[key] ?? null)) save.mutate({ [key]: val });
        }}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> Sample {record.sample_code}
            {analysis?.stage === 'retest' && <Badge variant="outline"><Beaker className="h-3 w-3 mr-1" /> Retest</Badge>}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {analysis?.grade && <Badge variant="outline" className={gradeTone(analysis.grade)}>{analysis.grade}</Badge>}
            {locked && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> Locked</Badge>}
            <Badge variant="outline">{record.coffee_type} · {record.bags} bags</Badge>
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {blind
            ? 'Blind analysis — supplier identity is withheld until results are submitted.'
            : `Supplier: ${record.v3_suppliers?.name ?? 'Unlinked'} · ${record.receiving_number}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium mb-2">Physical analysis</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PHYSICAL.map(([k, l, u]) => field(k, l, u))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2 flex items-center justify-between">
            <span>Defect count</span>
            <span className="text-muted-foreground">Total: <strong className="text-foreground">{totalDefects}</strong></span>
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {DEFECTS.map(([k, l]) => field(k, l))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Screen size</Label>
            <Input className="h-8" disabled={!editable} defaultValue={analysis?.screen_size ?? ''}
              onBlur={(e) => e.target.value !== (analysis?.screen_size ?? '') && save.mutate({ screen_size: e.target.value || null })} />
          </div>
          {field('cup_score', 'Cup score')}
          <div>
            <Label className="text-[11px] text-muted-foreground">Price adjustment (UGX/kg)</Label>
            <Input className="h-8 font-medium" disabled value={analysis?.price_adjustment ?? 0} readOnly />
          </div>
        </div>

        <div>
          <Label className="text-[11px] text-muted-foreground">Cupping notes / recommendation</Label>
          <Textarea rows={2} disabled={!editable} value={notes} onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (analysis?.cup_notes ?? '') && save.mutate({ cup_notes: notes })} />
        </div>

        {analysis && (
          <div className={`rounded-md border p-3 text-xs ${failures.length ? 'border-destructive/40 bg-destructive/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
            <p className="flex items-center gap-2 font-medium">
              {failures.length
                ? <><TriangleAlert className="h-4 w-4 text-destructive" /> Fails the {record.coffee_type} standard</>
                : <><ShieldCheck className="h-4 w-4 text-emerald-600" /> Meets the {record.coffee_type} standard</>}
            </p>
            {failures.length > 0 && (
              <ul className="mt-1 list-disc pl-5 space-y-0.5">{failures.map((f, i) => <li key={i}>{f}</li>)}</ul>
            )}
          </div>
        )}

        {editable && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { save.mutate({ recommendation: 'accept' }); submit.mutate(); }} disabled={submit.isPending}>
                Submit — recommend accept
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { save.mutate({ recommendation: 'reject' }); submit.mutate(); }} disabled={submit.isPending}>
                Submit — recommend reject
              </Button>
            </div>
          </>
        )}
        {locked && (
          <p className="text-xs text-muted-foreground">
            Submitted {analysis?.submitted_at ? new Date(analysis.submitted_at).toLocaleString() : ''} — awaiting the Quality Manager.
          </p>
        )}
      </CardContent>
    </Card>
  );
}