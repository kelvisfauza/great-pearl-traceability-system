import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Truck, Pencil, FlaskConical } from "lucide-react";
import { format } from "date-fns";

const emptyForm = {
  dispatch_date: new Date().toISOString().split("T")[0],
  dispatch_time: "",
  warehouse: "",
  coffee_type: "",
  destination_buyer: "",
  transporter: "",
  vehicle_registrations: "",
  truck_serial_number: "",
  container_number: "",
  seal_numbers: "",
  driver_name: "",
  driver_phone: "",
  driver_id_number: "",
  bags_loaded: "",
  gross_weight: "",
  tare_weight: "",
  net_weight: "",
  total_weight_store: "",
  batch_references: "",
  dispatched_by: "",
  manager_name: "",
  remarks: "",
  traceability_confirmed: false,
};

const num = (s: string) => (s === "" || s === null ? null : Number(s));

const StoreDispatchMonitoring = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["store-dispatch-forms"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dispatch_monitoring_forms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.vehicle_registrations?.trim()) throw new Error("Vehicle registration is required");
      if (!form.driver_name?.trim()) throw new Error("Driver name is required");

      const payload: any = {
        dispatch_date: form.dispatch_date || null,
        dispatch_time: form.dispatch_time || null,
        warehouse: form.warehouse || null,
        coffee_type: form.coffee_type || null,
        destination_buyer: form.destination_buyer || null,
        transporter: form.transporter || null,
        vehicle_registrations: form.vehicle_registrations.trim(),
        truck_serial_number: form.truck_serial_number || null,
        container_number: form.container_number || null,
        seal_numbers: form.seal_numbers || null,
        driver_name: form.driver_name.trim(),
        driver_phone: form.driver_phone || null,
        driver_id_number: form.driver_id_number || null,
        bags_loaded: form.bags_loaded === "" ? null : parseInt(form.bags_loaded, 10),
        gross_weight: num(form.gross_weight),
        tare_weight: num(form.tare_weight),
        net_weight: num(form.net_weight),
        total_weight_store: num(form.total_weight_store) ?? num(form.net_weight),
        batch_references: form.batch_references || null,
        dispatched_by: form.dispatched_by || (employee as any)?.name || employee?.email || null,
        manager_name: form.manager_name || null,
        remarks: form.remarks || null,
        traceability_confirmed: !!form.traceability_confirmed,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("dispatch_monitoring_forms")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        return editingId;
      }

      const { data: numData, error: numErr } = await (supabase as any).rpc("next_dispatch_monitoring_form_number");
      if (numErr) throw numErr;

      payload.form_number = numData as string;
      payload.status = "dispatched";
      payload.inputted_by = (employee as any)?.name || employee?.email || null;
      payload.created_by = employee?.email || null;
      payload.created_by_name = (employee as any)?.name || employee?.email || null;

      const { data, error } = await (supabase as any)
        .from("dispatch_monitoring_forms")
        .insert(payload)
        .select("id, form_number")
        .single();
      if (error) throw error;
      return data.form_number as string;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["store-dispatch-forms"] });
      qc.invalidateQueries({ queryKey: ["dispatch-forms-for-quality"] });
      toast({ title: editingId ? "Dispatch record updated" : `Dispatch recorded — ${res}` });
      setOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startEdit = (rec: any) => {
    setEditingId(rec.id);
    setForm({
      ...emptyForm,
      ...Object.fromEntries(
        Object.keys(emptyForm).map((k) => {
          const v = rec[k];
          if (k === "traceability_confirmed") return [k, !!v];
          return [k, v === null || v === undefined ? "" : String(v)];
        })
      ),
    });
    setOpen(true);
  };

  const text = (key: string, label: string, placeholder?: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
    </div>
  );

  const numberField = (key: string, label: string, step = "0.01") => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-600" /> Dispatch Monitoring
          </h3>
          <p className="text-sm text-muted-foreground">
            Record every truck dispatched from the store — truck, seals, driver and weights. Each record gets an
            automatic form number that the quality team attaches its dispatch analysis to.
          </p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Dispatch Record
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispatch Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : forms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No dispatch records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Truck</TableHead>
                    <TableHead>Seal(s)</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Bags</TableHead>
                    <TableHead>Net (kg)</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.form_number}</TableCell>
                      <TableCell>{f.dispatch_date ? format(new Date(f.dispatch_date), "dd MMM yyyy") : "-"}</TableCell>
                      <TableCell className="font-medium">{f.vehicle_registrations || "-"}</TableCell>
                      <TableCell className="text-xs">{f.seal_numbers || "-"}</TableCell>
                      <TableCell>{f.driver_name || "-"}</TableCell>
                      <TableCell>{f.destination_buyer || "-"}</TableCell>
                      <TableCell>{f.bags_loaded ?? "-"}</TableCell>
                      <TableCell>{f.net_weight ?? f.total_weight_store ?? "-"}</TableCell>
                      <TableCell>
                        {f.quality_analysis_attached ? (
                          <Badge variant="secondary" className="gap-1">
                            <FlaskConical className="h-3 w-3" /> attached
                          </Badge>
                        ) : (
                          <Badge variant="outline">pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(f)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Dispatch Record" : "New Dispatch Record"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the dispatch details." : "The form number is generated automatically on save."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold mb-2">A. Dispatch details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Dispatch date</Label>
                  <Input type="date" value={form.dispatch_date} onChange={(e) => set("dispatch_date", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Time out</Label>
                  <Input type="time" value={form.dispatch_time} onChange={(e) => set("dispatch_time", e.target.value)} />
                </div>
                {text("warehouse", "Warehouse / store")}
                {text("coffee_type", "Coffee type")}
                {text("destination_buyer", "Destination / buyer")}
                {text("batch_references", "Lot / batch references")}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">B. Truck & seals</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {text("transporter", "Transporter / company")}
                {text("vehicle_registrations", "Vehicle registration *", "UAX 123X")}
                {text("truck_serial_number", "Serial number on truck", "SN-00123")}
                {text("container_number", "Container number")}
                {text("seal_numbers", "Seal number(s)", "SL-0001, SL-0002")}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">C. Driver</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {text("driver_name", "Driver name *")}
                {text("driver_phone", "Driver phone")}
                {text("driver_id_number", "Driver ID / licence no.")}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">D. Load & weights</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {numberField("bags_loaded", "Bags loaded", "1")}
                {numberField("gross_weight", "Gross weight (kg)")}
                {numberField("tare_weight", "Tare weight (kg)")}
                {numberField("net_weight", "Net weight (kg)")}
                {numberField("total_weight_store", "Weighed at store (kg)")}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">E. Sign-off</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {text("dispatched_by", "Dispatched by (store)")}
                {text("manager_name", "Store manager")}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="trace"
                  checked={!!form.traceability_confirmed}
                  onCheckedChange={(v) => set("traceability_confirmed", !!v)}
                />
                <Label htmlFor="trace" className="text-xs">Traceability confirmed</Label>
              </div>
              <div className="mt-3">
                <Label className="text-xs">Remarks</Label>
                <Textarea value={form.remarks} onChange={(e) => set("remarks", e.target.value)} rows={2} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Save changes" : "Record dispatch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreDispatchMonitoring;
