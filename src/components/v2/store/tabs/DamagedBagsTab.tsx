import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertTriangle, Plus } from "lucide-react";
import { format } from "date-fns";

const DamagedBagsTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ batch_number: '', damage_type: 'torn', bags_affected: 1, estimated_loss_kg: 0, action_taken: '', notes: '' });

  const { data: records, isLoading } = useQuery({
    queryKey: ['store-damaged-bags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_damaged_bags').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('store_damaged_bags').insert({ ...form, reported_by: employee?.email || '' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Damage Report Saved" });
      queryClient.invalidateQueries({ queryKey: ['store-damaged-bags'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const totalAffected = records?.reduce((s, r: any) => s + (r.bags_affected || 0), 0) || 0;
  const totalLoss = records?.reduce((s, r: any) => s + Number(r.estimated_loss_kg || 0), 0) || 0;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Damaged / Mislabelled Bags</h3>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />Report Damage</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Bags Affected</p><p className="text-2xl font-bold text-destructive">{totalAffected}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Estimated Loss</p><p className="text-2xl font-bold text-destructive">{totalLoss.toLocaleString()} kg</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Batch</TableHead><TableHead>Type</TableHead><TableHead>Bags</TableHead><TableHead>Loss (kg)</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records?.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.created_at), 'PP')}</TableCell>
                  <TableCell className="font-mono">{r.batch_number}</TableCell>
                  <TableCell><Badge variant="outline">{r.damage_type}</Badge></TableCell>
                  <TableCell>{r.bags_affected}</TableCell>
                  <TableCell>{Number(r.estimated_loss_kg).toLocaleString()}</TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">{r.action_taken || '—'}</TableCell>
                  <TableCell><Badge variant={r.status === 'resolved' ? 'secondary' : 'destructive'}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(!records || records.length === 0) && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No damage reports</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Damaged Bag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Batch Number</Label><Input value={form.batch_number} onChange={e => setForm(p => ({ ...p, batch_number: e.target.value }))} /></div>
            <div><Label>Damage Type</Label>
              <Select value={form.damage_type} onValueChange={v => setForm(p => ({ ...p, damage_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="torn">Torn Bag</SelectItem>
                  <SelectItem value="wet">Water Damage</SelectItem>
                  <SelectItem value="mislabelled">Mislabelled</SelectItem>
                  <SelectItem value="pest">Pest Damage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bags Affected</Label><Input type="number" value={form.bags_affected} onChange={e => setForm(p => ({ ...p, bags_affected: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Est. Loss (kg)</Label><Input type="number" value={form.estimated_loss_kg} onChange={e => setForm(p => ({ ...p, estimated_loss_kg: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Action Taken</Label><Input value={form.action_taken} onChange={e => setForm(p => ({ ...p, action_taken: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full">
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DamagedBagsTab;
