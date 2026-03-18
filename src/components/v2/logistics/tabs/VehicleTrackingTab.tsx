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
import { Loader2, Truck, Plus } from "lucide-react";
import { format } from "date-fns";

const VehicleTrackingTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_name: '', driver_name: '', route: '', origin: '', destination: '', cargo_description: '', cargo_weight_kg: 0, fuel_cost: 0 });

  const { data: trips, isLoading } = useQuery({
    queryKey: ['vehicle-trips'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicle_trips').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vehicle_trips').insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Trip Logged" });
      queryClient.invalidateQueries({ queryKey: ['vehicle-trips'] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Truck className="h-5 w-5" />Vehicle Tracking</h3>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />Log Trip</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Route</TableHead><TableHead>Cargo</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {trips?.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>{format(new Date(t.created_at), 'PP')}</TableCell>
                <TableCell>{t.vehicle_name}</TableCell>
                <TableCell>{t.driver_name}</TableCell>
                <TableCell>{t.origin} → {t.destination}</TableCell>
                <TableCell>{t.cargo_description || '—'} ({Number(t.cargo_weight_kg || 0).toLocaleString()} kg)</TableCell>
                <TableCell><Badge variant={t.status === 'completed' ? 'secondary' : t.status === 'in_transit' ? 'outline' : 'default'}>{t.status}</Badge></TableCell>
              </TableRow>
            ))}
            {(!trips || trips.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No trips logged</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Vehicle Trip</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vehicle</Label><Input value={form.vehicle_name} onChange={e => setForm(p => ({ ...p, vehicle_name: e.target.value }))} /></div>
              <div><Label>Driver</Label><Input value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Origin</Label><Input value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} /></div>
              <div><Label>Destination</Label><Input value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} /></div>
            </div>
            <div><Label>Route Name</Label><Input value={form.route} onChange={e => setForm(p => ({ ...p, route: e.target.value }))} /></div>
            <div><Label>Cargo</Label><Input value={form.cargo_description} onChange={e => setForm(p => ({ ...p, cargo_description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Weight (kg)</Label><Input type="number" value={form.cargo_weight_kg} onChange={e => setForm(p => ({ ...p, cargo_weight_kg: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Fuel Cost (UGX)</Label><Input type="number" value={form.fuel_cost} onChange={e => setForm(p => ({ ...p, fuel_cost: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="w-full">
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleTrackingTab;
