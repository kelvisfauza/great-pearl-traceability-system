import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Plus } from "lucide-react";
import { format } from "date-fns";

const ShipmentsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ shipment_ref: '', buyer_name: '', total_bags: 0, total_kg: 0, origin: '', destination: '', transporter: '', vehicle: '' });

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['logistics-shipments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('logistics_shipments').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('logistics_shipments').insert({
        ...form,
        shipment_ref: form.shipment_ref || `SHP-${Date.now().toString(36).toUpperCase()}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Shipment Created" });
      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" />Shipments</h3>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />New Shipment</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Ref</TableHead><TableHead>Buyer</TableHead><TableHead>Bags</TableHead><TableHead>Kg</TableHead><TableHead>Route</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {shipments?.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono">{s.shipment_ref}</TableCell>
                <TableCell>{s.buyer_name}</TableCell>
                <TableCell>{s.total_bags}</TableCell>
                <TableCell>{Number(s.total_kg).toLocaleString()}</TableCell>
                <TableCell>{s.origin} → {s.destination}</TableCell>
                <TableCell><Badge variant={s.status === 'delivered' ? 'secondary' : s.status === 'in_transit' ? 'outline' : 'default'}>{s.status}</Badge></TableCell>
              </TableRow>
            ))}
            {(!shipments || shipments.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No shipments</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Shipment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Buyer Name</Label><Input value={form.buyer_name} onChange={e => setForm(p => ({ ...p, buyer_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bags</Label><Input type="number" value={form.total_bags} onChange={e => setForm(p => ({ ...p, total_bags: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Kg</Label><Input type="number" value={form.total_kg} onChange={e => setForm(p => ({ ...p, total_kg: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Origin</Label><Input value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} /></div>
              <div><Label>Destination</Label><Input value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Transporter</Label><Input value={form.transporter} onChange={e => setForm(p => ({ ...p, transporter: e.target.value }))} /></div>
              <div><Label>Vehicle</Label><Input value={form.vehicle} onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))} /></div>
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full">
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Shipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShipmentsTab;
