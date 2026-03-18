import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Cog, Plus } from "lucide-react";
import { format } from "date-fns";

const MillingTransactionsTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    job_number: '', customer_name: '', customer_phone: '', coffee_type: 'Robusta',
    input_weight_kg: 0, price_per_kg: 150, total_cost: 0, amount_paid: 0, notes: ''
  });

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['milling-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('milling_jobs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  const submit = useMutation({
    mutationFn: async () => {
      const totalCost = form.input_weight_kg * form.price_per_kg;
      const { error } = await supabase.from('milling_jobs').insert({
        ...form,
        total_cost: totalCost,
        job_number: form.job_number || `MJ-${Date.now().toString(36).toUpperCase()}`,
        milled_by: employee?.email || '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Milling Job Created" });
      queryClient.invalidateQueries({ queryKey: ['milling-jobs'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const totalRevenue = jobs?.reduce((s, j: any) => s + Number(j.total_cost || 0), 0) || 0;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Cog className="h-5 w-5" />Milling Transactions</h3>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />New Job</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Jobs</p><p className="text-2xl font-bold">{jobs?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-bold">UGX {totalRevenue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-orange-600">{jobs?.filter((j: any) => j.status === 'pending').length || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Job #</TableHead><TableHead>Customer</TableHead><TableHead>Input (kg)</TableHead><TableHead>Output (kg)</TableHead><TableHead>Cost</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {jobs?.map((j: any) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono">{j.job_number}</TableCell>
                  <TableCell>{j.customer_name}</TableCell>
                  <TableCell>{Number(j.input_weight_kg).toLocaleString()}</TableCell>
                  <TableCell>{j.output_weight_kg ? Number(j.output_weight_kg).toLocaleString() : '—'}</TableCell>
                  <TableCell>UGX {Number(j.total_cost).toLocaleString()}</TableCell>
                  <TableCell>UGX {Number(j.amount_paid).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={j.status === 'completed' ? 'secondary' : 'outline'}>{j.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(!jobs || jobs.length === 0) && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No milling jobs</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Milling Job</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} /></div>
            <div><Label>Coffee Type</Label>
              <Select value={form.coffee_type} onValueChange={v => setForm(p => ({ ...p, coffee_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Robusta">Robusta</SelectItem><SelectItem value="Arabica">Arabica</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Input Weight (kg)</Label><Input type="number" value={form.input_weight_kg} onChange={e => setForm(p => ({ ...p, input_weight_kg: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Price/kg (UGX)</Label><Input type="number" value={form.price_per_kg} onChange={e => setForm(p => ({ ...p, price_per_kg: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Amount Paid (UGX)</Label><Input type="number" value={form.amount_paid} onChange={e => setForm(p => ({ ...p, amount_paid: parseFloat(e.target.value) || 0 }))} /></div>
            <p className="text-sm text-muted-foreground">Total: UGX {(form.input_weight_kg * form.price_per_kg).toLocaleString()}</p>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full">
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Job
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MillingTransactionsTab;
