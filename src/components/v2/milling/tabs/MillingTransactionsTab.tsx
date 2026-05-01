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
import { Loader2, Cog, Plus, UserPlus, Phone, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { executeOrQueue } from "@/lib/offline/queue";
import { cachedQuery } from "@/lib/offline/cache";

const MillingTransactionsTab = () => {
  const { employee, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ full_name: '', phone: '', opening_balance: 0 });
  const [form, setForm] = useState({
    job_number: '', customer_name: '', customer_phone: '', coffee_type: 'Robusta',
    input_weight_kg: 0, price_per_kg: 150, total_cost: 0, amount_paid: 0, notes: ''
  });

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['milling-jobs'],
    queryFn: () => cachedQuery('milling_jobs:recent50', async () => {
      const { data, error } = await supabase.from('milling_jobs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    })
  });

  const submit = useMutation({
    mutationFn: async () => {
      const totalCost = form.input_weight_kg * form.price_per_kg;
      const payload = {
        ...form,
        total_cost: totalCost,
        job_number: form.job_number || `MJ-${Date.now().toString(36).toUpperCase()}`,
        milled_by: employee?.email || '',
      };
      return await executeOrQueue({
        kind: 'milling_job',
        payload,
        user_label: `${form.customer_name || 'Customer'} • ${form.input_weight_kg}kg • ${payload.job_number}`,
        perform: async (client_op_id) => {
          const { error } = await supabase.from('milling_jobs').insert({ ...payload, client_op_id } as any);
          if (error) throw error;
          return payload;
        }
      });
    },
    onSuccess: (result: any) => {
      const queued = result?.queued;
      toast({
        title: queued ? "Saved offline" : "Milling Job Created",
        description: queued ? "Will upload when you reconnect." : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['milling-jobs'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const addCustomer = useMutation({
    mutationFn: async () => {
      if (!customerForm.full_name.trim() || !customerForm.phone.trim()) {
        throw new Error("Name and phone are required");
      }
      const { error } = await supabase.from('milling_customers').insert({
        full_name: customerForm.full_name.trim(),
        phone: customerForm.phone.trim(),
        opening_balance: customerForm.opening_balance,
        current_balance: customerForm.opening_balance,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Customer added" });
      queryClient.invalidateQueries({ queryKey: ['milling-customer-accounts'] });
      setCustomerDialogOpen(false);
      setCustomerForm({ full_name: '', phone: '', opening_balance: 0 });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('milling_jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Milling job deleted" });
      queryClient.invalidateQueries({ queryKey: ['milling-jobs'] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const handleDelete = (j: any) => {
    if (window.confirm(`Delete milling job ${j.job_number} for ${j.customer_name}? This cannot be undone.`)) {
      deleteJob.mutate(j.id);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const totalRevenue = jobs?.reduce((s, j: any) => s + Number(j.total_cost || 0), 0) || 0;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Cog className="h-5 w-5" />Milling Transactions</h3>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Button variant="outline" onClick={() => setCustomerDialogOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="mr-1 h-4 w-4" />Add Customer
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" />New Job
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Jobs</p><p className="text-lg sm:text-2xl font-bold">{jobs?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Revenue</p><p className="text-base sm:text-2xl font-bold">UGX {totalRevenue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Pending</p><p className="text-lg sm:text-2xl font-bold text-orange-600">{jobs?.filter((j: any) => j.status === 'pending').length || 0}</p></CardContent></Card>
      </div>

      {/* Mobile: stacked cards */}
      {isMobile ? (
        <div className="space-y-2">
          {jobs?.map((j: any) => {
            const balance = Number(j.total_cost) - Number(j.amount_paid);
            return (
              <Card key={j.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{j.customer_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{j.job_number}</p>
                    </div>
                    <Badge variant={j.status === 'completed' ? 'secondary' : 'outline'} className="shrink-0">
                      {j.status}
                    </Badge>
                  </div>
                  {j.customer_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />{j.customer_phone}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t">
                    <div><p className="text-muted-foreground">Input</p><p className="font-medium">{Number(j.input_weight_kg).toLocaleString()} kg</p></div>
                    <div><p className="text-muted-foreground">Cost</p><p className="font-medium">UGX {Number(j.total_cost).toLocaleString()}</p></div>
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className={`font-medium ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        UGX {balance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isAdmin() && (
                    <Button size="sm" variant="destructive" className="w-full" onClick={() => handleDelete(j)} disabled={deleteJob.isPending}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {(!jobs || jobs.length === 0) && (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No milling jobs yet</CardContent></Card>
          )}
        </div>
      ) : (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Job #</TableHead><TableHead>Customer</TableHead><TableHead>Input (kg)</TableHead><TableHead>Output (kg)</TableHead><TableHead>Cost</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead>{isAdmin() && <TableHead>Actions</TableHead>}
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
                  {isAdmin() && (
                    <TableCell>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(j)} disabled={deleteJob.isPending}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {(!jobs || jobs.length === 0) && <TableRow><TableCell colSpan={isAdmin() ? 8 : 7} className="text-center py-6 text-muted-foreground">No milling jobs</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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

      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Milling Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name</Label>
              <Input value={customerForm.full_name} onChange={e => setCustomerForm(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. John Mukasa" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={customerForm.phone} onChange={e => setCustomerForm(p => ({ ...p, phone: e.target.value }))} placeholder="07XXXXXXXX" inputMode="tel" />
            </div>
            <div>
              <Label>Opening Balance (UGX)</Label>
              <Input type="number" value={customerForm.opening_balance} onChange={e => setCustomerForm(p => ({ ...p, opening_balance: parseFloat(e.target.value) || 0 }))} inputMode="numeric" />
            </div>
            <Button onClick={() => addCustomer.mutate()} disabled={addCustomer.isPending} className="w-full">
              {addCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MillingTransactionsTab;
