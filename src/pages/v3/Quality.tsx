import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles } from '@/hooks/useV3Roles';
import { FlaskConical, ClipboardCheck, SlidersHorizontal, History, Search, Undo2 } from 'lucide-react';
import QualityWorksheet, { gradeTone } from './QualityWorksheet';

const STANDARD_FIELDS: [string, string][] = [
  ['max_moisture', 'Max moisture %'], ['min_outturn', 'Min outturn %'],
  ['max_foreign_matter', 'Max foreign matter %'], ['max_total_defects', 'Max total defects'],
  ['min_cup_score', 'Min cup score'], ['min_screen_retention', 'Min screen retention %'],
  ['grade_a_max_defects', 'Grade A max defects'], ['grade_b_max_defects', 'Grade B max defects'],
  ['moisture_penalty_per_point', 'Moisture penalty UGX/pt'], ['defect_penalty_per_point', 'Defect penalty UGX/pt'],
];

export default function V3Quality() {
  const { hasRole } = useV3Roles();
  const isOfficer = hasRole('quality_officer');
  const isManager = hasRole('quality_manager');
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [review, setReview] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAdj, setReviewAdj] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: queue = [] } = useQuery({
    queryKey: ['v3-quality-queue'],
    queryFn: async () => {
      const { data } = await supabase.from('v3_receiving_records')
        .select('id, receiving_number, sample_code, coffee_type, bags, status, reference_price, created_at, v3_suppliers(name)')
        .in('status', ['awaiting_quality', 'quality_submitted'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ['v3-quality-analyses'],
    queryFn: async () => (await supabase.from('v3_quality_analyses').select('*').order('created_at', { ascending: false }).limit(300)).data || [],
    refetchInterval: 30000,
  });

  const { data: standards = [] } = useQuery({
    queryKey: ['v3-quality-standards'],
    queryFn: async () => (await (supabase.from('v3_quality_standards') as any).select('*').order('coffee_type')).data || [],
  });

  const latestFor = (receivingId: string) =>
    analyses.find((a: any) => a.receiving_id === receivingId && a.status !== 'retested') ||
    analyses.find((a: any) => a.receiving_id === receivingId);

  const labQueue = queue.filter((r: any) => {
    const a: any = latestFor(r.id);
    return !a?.submitted;
  });
  const pendingReview = queue.filter((r: any) => (latestFor(r.id) as any)?.status === 'submitted');

  const selectedRecord = labQueue.find((r: any) => r.id === selectedId) || null;
  const selectedAnalysis: any = selectedRecord ? latestFor(selectedRecord.id) : null;

  const claim = useMutation({
    mutationFn: async (record: any) => {
      const existing: any = latestFor(record.id);
      if (existing) return existing.id as string;
      const { data, error } = await (supabase.from('v3_quality_analyses') as any).insert({
        receiving_id: record.id,
        sample_code: record.sample_code,
        coffee_type: record.coffee_type,
        analysed_by: userId,
      }).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_id, record) => {
      setSelectedId(record.id);
      qc.invalidateQueries({ queryKey: ['v3-quality-analyses'] });
    },
    onError: (e: any) => toast({ title: 'Could not start analysis', description: e.message, variant: 'destructive' }),
  });

  const release = useMutation({
    mutationFn: async (analysisId: string) => {
      const { error } = await (supabase.from('v3_quality_analyses') as any).delete().eq('id', analysisId).eq('submitted', false);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedId(null);
      toast({ title: 'Sample returned to the bench list' });
      qc.invalidateQueries({ queryKey: ['v3-quality-analyses'] });
    },
    onError: (e: any) => toast({ title: 'Release failed', description: e.message, variant: 'destructive' }),
  });

  const stats = useMemo(() => {
    const submitted = analyses.filter((a: any) => a.submitted);
    const passed = submitted.filter((a: any) => a.passed).length;
    return {
      queue: labQueue.length,
      review: pendingReview.length,
      passRate: submitted.length ? Math.round((passed / submitted.length) * 100) : 0,
      total: submitted.length,
    };
  }, [analyses, labQueue.length, pendingReview.length]);

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' | 'retest' }) => {
      const { data, error } = await (supabase.rpc as any)('v3_review_quality_analysis', {
        p_analysis_id: id,
        p_action: action,
        p_notes: reviewNotes || null,
        p_price_adjustment: reviewAdj === '' ? null : Number(reviewAdj),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      toast({ title: `Analysis ${v.action === 'retest' ? 'sent for retest' : v.action + 'd'}` });
      setReview(null); setReviewNotes(''); setReviewAdj('');
      qc.invalidateQueries({ queryKey: ['v3-quality-analyses'] });
      qc.invalidateQueries({ queryKey: ['v3-quality-queue'] });
    },
    onError: (e: any) => toast({ title: 'Review failed', description: e.message, variant: 'destructive' }),
  });

  const saveStandard = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await (supabase.from('v3_quality_standards') as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v3-quality-standards'] }),
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const register = analyses.filter((a: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [a.sample_code, a.grade, a.coffee_type, a.status].some((v: any) => String(v ?? '').toLowerCase().includes(q));
  });

  return (
    <V3Layout title="Quality Laboratory" description="Blind sample intake, grading against standards, manager review and retests">
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        {[
          ['Samples in lab', stats.queue],
          ['Awaiting manager review', stats.review],
          ['Analyses completed', stats.total],
          ['Pass rate', `${stats.passRate}%`],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="lab">
        <TabsList>
          <TabsTrigger value="lab"><FlaskConical className="h-4 w-4 mr-1" /> Lab bench</TabsTrigger>
          <TabsTrigger value="review"><ClipboardCheck className="h-4 w-4 mr-1" /> Manager review {stats.review > 0 && <Badge variant="secondary" className="ml-1">{stats.review}</Badge>}</TabsTrigger>
          <TabsTrigger value="register"><History className="h-4 w-4 mr-1" /> Register</TabsTrigger>
          <TabsTrigger value="standards"><SlidersHorizontal className="h-4 w-4 mr-1" /> Standards</TabsTrigger>
        </TabsList>

        <TabsContent value="lab" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Samples available for analysis</CardTitle>
              <p className="text-xs text-muted-foreground">
                Pick a sample to work on. Once started it shows as in progress; if the results are never submitted it stays on this list.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample</TableHead><TableHead>Type</TableHead><TableHead>Bags</TableHead>
                    <TableHead>Received</TableHead><TableHead>State</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labQueue.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No samples waiting on the bench.</TableCell></TableRow>
                  )}
                  {labQueue.map((r: any) => {
                    const a: any = latestFor(r.id);
                    const mine = a && a.analysed_by === userId;
                    const active = selectedId === r.id;
                    return (
                      <TableRow key={r.id} className={active ? 'bg-muted/50' : undefined}>
                        <TableCell className="font-medium">{r.sample_code}</TableCell>
                        <TableCell>{r.coffee_type}</TableCell>
                        <TableCell>{r.bags}</TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {!a ? <Badge variant="outline">Available</Badge>
                            : a.stage === 'retest'
                              ? <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30">Retest — in progress</Badge>
                              : <Badge variant="secondary">{mine ? 'In progress (you)' : 'In progress'}</Badge>}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {a && (
                            <Button size="sm" variant="ghost" disabled={release.isPending || !(isManager || mine)}
                              onClick={() => release.mutate(a.id)} title="Return to the available list">
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant={active ? 'secondary' : 'outline'}
                            disabled={!(isOfficer || isManager) || claim.isPending}
                            onClick={() => (a ? setSelectedId(r.id) : claim.mutate(r))}>
                            {active ? 'Open' : a ? 'Continue' : 'Start analysis'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!(isOfficer || isManager) && (
                <p className="p-3 text-xs text-muted-foreground">Only quality personnel can analyse samples.</p>
              )}
            </CardContent>
          </Card>

          {selectedRecord && (
            <QualityWorksheet
              key={selectedRecord.id}
              record={selectedRecord}
              analysis={selectedAnalysis}
              canEdit={isOfficer || isManager}
              blind={!isManager}
            />
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Submitted results awaiting decision</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample</TableHead><TableHead>Supplier</TableHead><TableHead>Type</TableHead>
                    <TableHead>Moisture</TableHead><TableHead>Outturn</TableHead><TableHead>Defects</TableHead>
                    <TableHead>Grade</TableHead><TableHead>Adj (UGX)</TableHead><TableHead>Recommendation</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReview.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-sm text-muted-foreground py-6 text-center">Nothing awaiting review.</TableCell></TableRow>
                  )}
                  {pendingReview.map((r: any) => {
                    const a: any = latestFor(r.id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.sample_code}</TableCell>
                        <TableCell>{r.v3_suppliers?.name ?? '—'}</TableCell>
                        <TableCell>{r.coffee_type}</TableCell>
                        <TableCell>{a?.moisture ?? '—'}%</TableCell>
                        <TableCell>{a?.outturn ?? '—'}%</TableCell>
                        <TableCell>{a?.total_defects ?? 0}</TableCell>
                        <TableCell><Badge variant="outline" className={gradeTone(a?.grade)}>{a?.grade ?? '—'}</Badge></TableCell>
                        <TableCell>{Number(a?.price_adjustment ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="capitalize">{a?.recommendation ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" disabled={!isManager}
                            onClick={() => { setReview({ ...a, record: r }); setReviewAdj(String(a?.price_adjustment ?? 0)); }}>
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!isManager && (
                <p className="p-3 text-xs text-muted-foreground">Only the Quality Manager can approve, reject or order retests.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                <Input className="h-8 max-w-xs" placeholder="Search sample, grade, type…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Sample</TableHead><TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead><TableHead>Moisture</TableHead><TableHead>Outturn</TableHead>
                    <TableHead>Defects</TableHead><TableHead>Grade</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {register.slice(0, 100).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{a.sample_code}</TableCell>
                      <TableCell>{a.coffee_type ?? '—'}</TableCell>
                      <TableCell className="capitalize">{a.stage?.replace('_', ' ')}</TableCell>
                      <TableCell>{a.moisture ?? '—'}</TableCell>
                      <TableCell>{a.outturn ?? '—'}</TableCell>
                      <TableCell>{a.total_defects ?? 0}</TableCell>
                      <TableCell><Badge variant="outline" className={gradeTone(a.grade)}>{a.grade ?? '—'}</Badge></TableCell>
                      <TableCell className="capitalize">{a.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standards" className="mt-4 space-y-4">
          {!isManager && <p className="text-xs text-muted-foreground">Standards are read-only — only the Quality Manager can change them.</p>}
          {standards.map((s: any) => (
            <Card key={s.id}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{s.coffee_type} standard</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {STANDARD_FIELDS.map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-[11px] text-muted-foreground">{label}</Label>
                    <Input className="h-8" type="number" step="0.01" disabled={!isManager} defaultValue={s[key] ?? ''}
                      onBlur={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        if (val !== (s[key] ?? null)) saveStandard.mutate({ id: s.id, patch: { [key]: val } });
                      }} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review sample {review?.sample_code}</DialogTitle></DialogHeader>
          {review && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>Moisture: <strong>{review.moisture}%</strong></div>
                <div>Outturn: <strong>{review.outturn}%</strong></div>
                <div>FM: <strong>{review.foreign_matter}%</strong></div>
                <div>Defects: <strong>{review.total_defects}</strong></div>
                <div>Cup: <strong>{review.cup_score ?? '—'}</strong></div>
                <div>Grade: <strong>{review.grade}</strong></div>
              </div>
              {Array.isArray(review.failures) && review.failures.length > 0 && (
                <ul className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs list-disc pl-5">
                  {review.failures.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              )}
              {review.cup_notes && <p className="text-xs text-muted-foreground">Lab notes: {review.cup_notes}</p>}
              <div>
                <Label className="text-xs">Price adjustment (UGX/kg)</Label>
                <Input type="number" value={reviewAdj} onChange={(e) => setReviewAdj(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Decision notes</Label>
                <Textarea rows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Reason for rejection or retest…" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ id: review.id, action: 'retest' })}>Send for retest</Button>
            <Button variant="destructive" disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ id: review.id, action: 'reject' })}>Reject</Button>
            <Button disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ id: review.id, action: 'approve' })}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </V3Layout>
  );
}