import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

const ReEvaluationTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    new_moisture: 0, new_outturn: 0, new_group1: 0, new_group2: 0,
    new_pods: 0, new_husks: 0, new_fm: 0, comment: ''
  });

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['reevaluation-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quality_assessments')
        .select('*')
        .in('status', ['approved', 'submitted_to_finance', 'pending_admin_pricing'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: reevaluations } = useQuery({
    queryKey: ['reevaluations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quality_reevaluations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const submitReeval = useMutation({
    mutationFn: async () => {
      if (!selectedAssessment) return;
      const { error } = await supabase.from('quality_reevaluations').insert({
        original_assessment_id: selectedAssessment.id,
        batch_number: selectedAssessment.batch_number,
        original_moisture: selectedAssessment.moisture,
        original_outturn: selectedAssessment.outturn,
        original_group1: selectedAssessment.group1_defects,
        original_group2: selectedAssessment.group2_defects,
        original_pods: selectedAssessment.pods,
        original_husks: selectedAssessment.husks,
        original_fm: selectedAssessment.fm,
        ...formData,
        evaluated_by: employee?.email || ''
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Re-evaluation Saved", description: "Variance recorded successfully." });
      queryClient.invalidateQueries({ queryKey: ['reevaluations-list'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const openReeval = (assessment: any) => {
    setSelectedAssessment(assessment);
    setFormData({
      new_moisture: assessment.moisture || 0,
      new_outturn: assessment.outturn || 0,
      new_group1: assessment.group1_defects || 0,
      new_group2: assessment.group2_defects || 0,
      new_pods: assessment.pods || 0,
      new_husks: assessment.husks || 0,
      new_fm: assessment.fm || 0,
      comment: ''
    });
    setDialogOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" />Re-Evaluate Assessed Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Moisture</TableHead>
                  <TableHead>Outturn</TableHead>
                  <TableHead>GP1</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments?.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono">{a.batch_number}</TableCell>
                    <TableCell>{a.moisture}%</TableCell>
                    <TableCell>{a.outturn}%</TableCell>
                    <TableCell>{a.group1_defects}%</TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReeval(a)}>
                        <ArrowUpDown className="mr-1 h-3.5 w-3.5" />Re-evaluate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!assessments || assessments.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No assessed batches available</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Past Re-evaluations */}
      {reevaluations && reevaluations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Re-evaluation History</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Moisture Δ</TableHead>
                    <TableHead>Outturn Δ</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reevaluations.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{format(new Date(r.created_at), 'PP')}</TableCell>
                      <TableCell className="font-mono">{r.batch_number}</TableCell>
                      <TableCell>
                        <Badge variant={r.moisture_variance > 0 ? "destructive" : "secondary"}>
                          {r.moisture_variance > 0 ? '+' : ''}{Number(r.moisture_variance).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.outturn_variance < 0 ? "destructive" : "secondary"}>
                          {r.outturn_variance > 0 ? '+' : ''}{Number(r.outturn_variance).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.evaluated_by}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.comment}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Re-evaluation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Re-evaluate Batch: {selectedAssessment?.batch_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'new_moisture', label: 'Moisture (%)', orig: selectedAssessment?.moisture },
                { key: 'new_outturn', label: 'Outturn (%)', orig: selectedAssessment?.outturn },
                { key: 'new_group1', label: 'GP1 (%)', orig: selectedAssessment?.group1_defects },
                { key: 'new_group2', label: 'GP2 (%)', orig: selectedAssessment?.group2_defects },
                { key: 'new_pods', label: 'Pods (%)', orig: selectedAssessment?.pods },
                { key: 'new_husks', label: 'Husks (%)', orig: selectedAssessment?.husks },
                { key: 'new_fm', label: 'FM (%)', orig: selectedAssessment?.fm },
              ].map(({ key, label, orig }) => (
                <div key={key}>
                  <Label>{label} <span className="text-xs text-muted-foreground">(was: {orig ?? 0})</span></Label>
                  <Input
                    type="number" step="0.1"
                    value={(formData as any)[key]}
                    onChange={(e) => setFormData(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
            <div>
              <Label>Comment</Label>
              <Textarea value={formData.comment} onChange={(e) => setFormData(p => ({ ...p, comment: e.target.value }))} placeholder="Reason for re-evaluation..." />
            </div>
            <Button onClick={() => submitReeval.mutate()} disabled={submitReeval.isPending} className="w-full">
              {submitReeval.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Re-evaluation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReEvaluationTab;
