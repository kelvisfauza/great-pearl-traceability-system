import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Lightbulb } from "lucide-react";
import { format } from "date-fns";

const RECOMMENDATIONS = ['Price Reduction', 'Reject Supplier', 'Bonus Supplier', 'Warning', 'Training Required', 'Other'];
const statusColor: Record<string, string> = { Pending: 'bg-yellow-100 text-yellow-800', Approved: 'bg-green-100 text-green-800', Rejected: 'bg-red-100 text-red-800', Implemented: 'bg-blue-100 text-blue-800' };

const RecommendationsTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', issue_identified: '', recommendation: '', expected_impact: '' });

  const { data: recs, isLoading } = useQuery({
    queryKey: ['quality-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_recommendations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('quality_recommendations').insert({ ...form, submitted_by: employee?.email || '' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Recommendation Submitted" });
      queryClient.invalidateQueries({ queryKey: ['quality-recommendations'] });
      setShowForm(false);
      setForm({ supplier_name: '', issue_identified: '', recommendation: '', expected_impact: '' });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Lightbulb className="h-5 w-5" />Quality Recommendations</h3>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />{showForm ? 'Cancel' : 'New Recommendation'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Supplier Name</Label><Input value={form.supplier_name} onChange={(e) => setForm(p => ({ ...p, supplier_name: e.target.value }))} /></div>
              <div>
                <Label>Recommendation</Label>
                <Select value={form.recommendation} onValueChange={(v) => setForm(p => ({ ...p, recommendation: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{RECOMMENDATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Issue Identified</Label><Textarea value={form.issue_identified} onChange={(e) => setForm(p => ({ ...p, issue_identified: e.target.value }))} /></div>
            <div><Label>Expected Impact</Label><Textarea value={form.expected_impact} onChange={(e) => setForm(p => ({ ...p, expected_impact: e.target.value }))} /></div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending || !form.supplier_name || !form.recommendation || !form.issue_identified}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recs?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(new Date(r.created_at), 'PP')}</TableCell>
                    <TableCell className="font-medium">{r.supplier_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.issue_identified}</TableCell>
                    <TableCell><Badge variant="outline">{r.recommendation}</Badge></TableCell>
                    <TableCell><Badge className={statusColor[r.status] || ''}>{r.status}</Badge></TableCell>
                    <TableCell className="text-sm">{r.submitted_by}</TableCell>
                  </TableRow>
                ))}
                {(!recs || recs.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No recommendations yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecommendationsTab;
