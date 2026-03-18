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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ClipboardCheck, Plus } from "lucide-react";
import { format } from "date-fns";

const StockVerificationTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ system_total_bags: 0, physical_total_bags: 0, system_total_kg: 0, physical_total_kg: 0, notes: '' });

  const { data: verifications, isLoading } = useQuery({
    queryKey: ['store-verifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_stock_verifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  const { data: systemTotals } = useQuery({
    queryKey: ['store-system-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coffee_records').select('bags, kilograms').not('status', 'eq', 'QUALITY_REJECTED');
      if (error) throw error;
      const totalBags = data?.reduce((s, r) => s + (r.bags || 0), 0) || 0;
      const totalKg = data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;
      return { totalBags, totalKg };
    }
  });

  const submitVerification = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('store_stock_verifications').insert({
        ...form,
        verified_by: employee?.email || ''
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Verification Saved" });
      queryClient.invalidateQueries({ queryKey: ['store-verifications'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const openNew = () => {
    setForm({ system_total_bags: systemTotals?.totalBags || 0, physical_total_bags: systemTotals?.totalBags || 0, system_total_kg: systemTotals?.totalKg || 0, physical_total_kg: systemTotals?.totalKg || 0, notes: '' });
    setDialogOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Stock Verification</h3>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />New Verification</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">System Bags</p><p className="text-2xl font-bold">{systemTotals?.totalBags?.toLocaleString() || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">System Weight</p><p className="text-2xl font-bold">{systemTotals?.totalKg?.toLocaleString() || 0} kg</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>System Bags</TableHead>
                <TableHead>Physical Bags</TableHead>
                <TableHead>Discrepancy</TableHead>
                <TableHead>Verified By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifications?.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell>{format(new Date(v.created_at), 'PP')}</TableCell>
                  <TableCell>{v.system_total_bags}</TableCell>
                  <TableCell>{v.physical_total_bags}</TableCell>
                  <TableCell>
                    <Badge variant={v.discrepancy_bags === 0 ? "secondary" : "destructive"}>
                      {v.discrepancy_bags > 0 ? '+' : ''}{v.discrepancy_bags} bags
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{v.verified_by}</TableCell>
                  <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(!verifications || verifications.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No verifications yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Stock Verification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>System Bags</Label><Input type="number" value={form.system_total_bags} onChange={e => setForm(p => ({ ...p, system_total_bags: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Physical Bags</Label><Input type="number" value={form.physical_total_bags} onChange={e => setForm(p => ({ ...p, physical_total_bags: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>System Kg</Label><Input type="number" value={form.system_total_kg} onChange={e => setForm(p => ({ ...p, system_total_kg: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Physical Kg</Label><Input type="number" value={form.physical_total_kg} onChange={e => setForm(p => ({ ...p, physical_total_kg: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button onClick={() => submitVerification.mutate()} disabled={submitVerification.isPending} className="w-full">
              {submitVerification.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Verification
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockVerificationTab;
