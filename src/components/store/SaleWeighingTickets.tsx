import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Printer, Scale } from "lucide-react";
import { printWeighingTicket } from "@/utils/weighingTicketPdf";

const empty = { buyer_name: "", coffee_type: "", bags: "", gross_weight_kg: "", tare_weight_kg: "", vehicle_registration: "", driver_name: "", approved_by: "", clearance_form_id: "none", remarks: "" };

export default function SaleWeighingTickets() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ ...empty });
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const { data: clearances = [] } = useQuery({
    queryKey: ["weighing-clearances"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("store_clearance_forms").select("id, form_number, destination_buyer, clearance_date").order("created_at", { ascending: false }).limit(50);
      if (error) throw error; return data || [];
    },
  });
  const clearanceNo = (id?: string | null) => clearances.find((c: any) => c.id === id)?.form_number || null;

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["store-weighing-tickets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("store_weighing_tickets").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return data || [];
    },
  });

  const gross = Number(form.gross_weight_kg || 0), tare = Number(form.tare_weight_kg || 0);
  const net = gross - tare;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.buyer_name.trim() || !form.coffee_type.trim()) throw new Error("Enter the buyer and coffee type");
      if (!(gross > 0) || tare < 0 || net <= 0) throw new Error("Gross weight must be greater than tare weight");
      const payload = {
        buyer_name: form.buyer_name.trim(), coffee_type: form.coffee_type.trim(), bags: Number(form.bags || 0),
        gross_weight_kg: gross, tare_weight_kg: tare, vehicle_registration: form.vehicle_registration || null,
        driver_name: form.driver_name || null, released_by: employee?.name || employee?.email || "Store",
        approved_by: form.approved_by || null, remarks: form.remarks || null,
        clearance_form_id: form.clearance_form_id === "none" ? null : form.clearance_form_id,
      };
      const { data, error } = await (supabase as any).from("store_weighing_tickets").insert(payload).select("*").single();
      if (error) throw error; return data;
    },
    onSuccess: async (row) => {
      qc.invalidateQueries({ queryKey: ["store-weighing-tickets"] });
      setOpen(false); setForm({ ...empty });
      toast({ title: `Ticket ${row.ticket_number} saved`, description: "Printing Store, Finance and EUDR copies." });
      try { await printWeighingTicket(row, clearanceNo(row.clearance_form_id)); } catch (e: any) { toast({ title: "Print failed", description: e.message, variant: "destructive" }); }
    },
    onError: (e: any) => toast({ title: "Could not save ticket", description: e.message, variant: "destructive" }),
  });

  const print = async (row: any) => {
    try { await printWeighingTicket(row, clearanceNo(row.clearance_form_id)); } catch (e: any) { toast({ title: "Print failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Sale Weighing Tickets</CardTitle>
          <CardDescription>Create a numbered ticket when coffee is weighed for sale. Prints 3 copies: Store, Finance, EUDR.</CardDescription>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create sale ticket</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No weighing tickets yet.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ticket</TableHead><TableHead>Date & time</TableHead><TableHead>Buyer</TableHead><TableHead>Coffee</TableHead>
              <TableHead className="text-right">Net kg</TableHead><TableHead>Clearance</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {tickets.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.ticket_number}</TableCell>
                  <TableCell>{new Date(t.weighed_at).toLocaleString("en-GB", { timeZone: "Africa/Kampala" })}</TableCell>
                  <TableCell>{t.buyer_name}</TableCell>
                  <TableCell>{t.coffee_type}</TableCell>
                  <TableCell className="text-right">{Number(t.net_weight_kg).toLocaleString()}</TableCell>
                  <TableCell>{clearanceNo(t.clearance_form_id) || "—"}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => print(t)}><Printer className="h-4 w-4 mr-1" />Print</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create sale weighing ticket</DialogTitle>
            <DialogDescription>Ticket number, date and time are added automatically. Released by: {employee?.name || "you"}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Sold to (buyer)</Label><Input value={form.buyer_name} onChange={e => set("buyer_name", e.target.value)} /></div>
            <div><Label>Coffee type</Label><Input value={form.coffee_type} onChange={e => set("coffee_type", e.target.value)} placeholder="e.g. Robusta FAQ" /></div>
            <div><Label>Bags</Label><Input type="number" min="0" value={form.bags} onChange={e => set("bags", e.target.value)} /></div>
            <div><Label>Gross weight (kg)</Label><Input type="number" min="0" step="0.1" value={form.gross_weight_kg} onChange={e => set("gross_weight_kg", e.target.value)} /></div>
            <div><Label>Tare weight (kg)</Label><Input type="number" min="0" step="0.1" value={form.tare_weight_kg} onChange={e => set("tare_weight_kg", e.target.value)} /></div>
            <div className="col-span-2 rounded-md bg-muted p-2 text-sm">Net weight: <strong>{net > 0 ? net.toLocaleString() : 0} kg</strong></div>
            <div><Label>Vehicle</Label><Input value={form.vehicle_registration} onChange={e => set("vehicle_registration", e.target.value)} /></div>
            <div><Label>Driver</Label><Input value={form.driver_name} onChange={e => set("driver_name", e.target.value)} /></div>
            <div className="col-span-2"><Label>Approved by</Label><Input value={form.approved_by} onChange={e => set("approved_by", e.target.value)} /></div>
            <div className="col-span-2"><Label>Attach to clearance</Label>
              <Select value={form.clearance_form_id} onValueChange={v => set("clearance_form_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not yet / attach later</SelectItem>
                  {clearances.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.form_number} — {c.destination_buyer || ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Remarks</Label><Textarea value={form.remarks} onChange={e => set("remarks", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save & print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
