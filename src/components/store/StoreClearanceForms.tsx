import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, ClipboardList, Trash2, Scale, Pencil, Paperclip } from "lucide-react";
import { useEUDRDispatchReports } from "@/hooks/useEUDRDispatchReports";

interface ClearanceItem {
  lot_ref: string;
  coffee_type: string;
  bags: string;
  weight_kg: string;
}

const emptyItem: ClearanceItem = { lot_ref: "", coffee_type: "", bags: "", weight_kg: "" };

const emptyForm = {
  form_number: "",
  clearance_date: new Date().toISOString().split("T")[0],
  warehouse: "",
  destination_buyer: "",
  vehicle_registration: "",
  driver_name: "",
  driver_phone: "",
  coffee_type: "",
  remarks: "",
  released_by: "",
  received_by_driver: "",
  approved_by: "",
  dispatch_report_id: "",
};

const n = (v: any) => (v === "" || v === null || v === undefined ? 0 : Number(v) || 0);

const StoreClearanceForms = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { reports: dispatchReports } = useEUDRDispatchReports();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [items, setItems] = useState<ClearanceItem[]>([{ ...emptyItem }]);
  const [attachments, setAttachments] = useState<{ name: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: { name: string; path: string }[] = [];
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `clearance-forms/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
        const { error } = await supabase.storage.from("dispatch-attachments").upload(path, file, { upsert: false });
        if (error) throw error;
        uploaded.push({ name: file.name, path });
      }
      setAttachments((p) => [...p, ...uploaded]);
      toast({ title: `${uploaded.length} file(s) attached` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("dispatch-attachments").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open file", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };


  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["store-clearance-forms"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_clearance_forms")
        .select("*")
        .order("clearance_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const totals = useMemo(() => ({
    bags: items.reduce((s, i) => s + n(i.bags), 0),
    weight: items.reduce((s, i) => s + n(i.weight_kg), 0),
  }), [items]);

  const resetForm = () => {
    setForm({ ...emptyForm, released_by: employee?.name || "" });
    setItems([{ ...emptyItem }]);
    setAttachments([]);
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingId(row.id);
    setForm({
      form_number: row.form_number || "",
      clearance_date: row.clearance_date || "",
      warehouse: row.warehouse || "",
      destination_buyer: row.destination_buyer || "",
      vehicle_registration: row.vehicle_registration || "",
      driver_name: row.driver_name || "",
      driver_phone: row.driver_phone || "",
      coffee_type: row.coffee_type || "",
      remarks: row.remarks || "",
      released_by: row.released_by || "",
      received_by_driver: row.received_by_driver || "",
      approved_by: row.approved_by || "",
      dispatch_report_id: row.dispatch_report_id || "",
    });
    setItems(Array.isArray(row.items) && row.items.length ? row.items.map((i: any) => ({
      lot_ref: i.lot_ref || "", coffee_type: i.coffee_type || "", bags: String(i.bags ?? ""), weight_kg: String(i.weight_kg ?? ""),
    })) : [{ ...emptyItem }]);
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.vehicle_registration?.trim()) throw new Error("Vehicle / truck number is required");
      const cleanItems = items
        .filter((i) => i.coffee_type || i.bags || i.weight_kg || i.lot_ref)
        .map((i) => ({ lot_ref: i.lot_ref, coffee_type: i.coffee_type, bags: n(i.bags), weight_kg: n(i.weight_kg) }));
      if (cleanItems.length === 0) throw new Error("Add at least one coffee line");

      const payload: any = {
        form_number: form.form_number || null,
        clearance_date: form.clearance_date || null,
        warehouse: form.warehouse || null,
        destination_buyer: form.destination_buyer || null,
        vehicle_registration: form.vehicle_registration,
        driver_name: form.driver_name || null,
        driver_phone: form.driver_phone || null,
        coffee_type: form.coffee_type || cleanItems[0]?.coffee_type || null,
        items: cleanItems,
        total_bags: cleanItems.reduce((s, i) => s + n(i.bags), 0),
        total_weight_kg: cleanItems.reduce((s, i) => s + n(i.weight_kg), 0),
        remarks: form.remarks || null,
        released_by: form.released_by || null,
        received_by_driver: form.received_by_driver || null,
        approved_by: form.approved_by || null,
        dispatch_report_id: form.dispatch_report_id || null,
        attachments,
      };

      if (editingId) {
        const { error } = await (supabase as any).from("store_clearance_forms").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("store_clearance_forms")
          .insert({ ...payload, created_by: employee?.email || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Clearance form updated" : "Clearance form saved" });
      qc.invalidateQueries({ queryKey: ["store-clearance-forms"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("store_clearance_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Clearance form deleted" });
      qc.invalidateQueries({ queryKey: ["store-clearance-forms"] });
    },
    onError: (e: any) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  // ---- Comparison: store released vs dispatch report (store weighing) vs buyer weighing ----
  const comparison = useMemo(() => {
    const norm = (s: any) => String(s || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    return forms.map((f: any) => {
      const linked = dispatchReports.find((r) =>
        f.dispatch_report_id ? r.id === f.dispatch_report_id
          : norm(r.vehicle_registrations).includes(norm(f.vehicle_registration)) && norm(f.vehicle_registration).length > 3
      );
      const dispatchStore = linked
        ? (linked.trucks || []).reduce((s: number, t: any) => s + n(t.total_weight_store), 0)
        : null;
      const buyerWeight = linked
        ? (linked.buyer_verification || []).reduce((s: number, b: any) => s + n(b.buyer_weight), 0)
        : null;
      const released = n(f.total_weight_kg);
      return {
        form: f,
        linked,
        released,
        dispatchStore,
        buyerWeight,
        storeVsDispatch: dispatchStore === null ? null : dispatchStore - released,
        storeVsBuyer: buyerWeight === null ? null : buyerWeight - released,
      };
    });
  }, [forms, dispatchReports]);

  const diffBadge = (v: number | null) => {
    if (v === null) return <span className="text-muted-foreground text-xs">No dispatch report</span>;
    if (Math.abs(v) < 0.5) return <Badge variant="secondary">Match</Badge>;
    return <Badge variant={v < 0 ? "destructive" : "default"}>{v > 0 ? "+" : ""}{v.toLocaleString()} kg</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Store Coffee Clearance / Release Forms
          </h3>
          <p className="text-sm text-muted-foreground">
            Record what left the store, then compare it with the dispatch comparison report and buyer weighing.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Clearance Form</Button>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Clearance Records</TabsTrigger>
          <TabsTrigger value="comparison">Weight Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Destination / Buyer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-right">Bags</TableHead>
                      <TableHead className="text-right">Weight (kg)</TableHead>
                      <TableHead>Attachments</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forms.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No clearance forms recorded yet</TableCell></TableRow>
                    ) : forms.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.form_number || "—"}</TableCell>
                        <TableCell>{f.clearance_date}</TableCell>
                        <TableCell>{f.warehouse || "—"}</TableCell>
                        <TableCell>{f.destination_buyer || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{f.vehicle_registration}</TableCell>
                        <TableCell>{f.driver_name || "—"}</TableCell>
                        <TableCell className="text-right">{n(f.total_bags).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{n(f.total_weight_kg).toLocaleString()}</TableCell>
                        <TableCell>
                          {(Array.isArray(f.attachments) ? f.attachments : []).length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {(f.attachments as any[]).map((a: any) => (
                                <button key={a.path} type="button" onClick={() => openAttachment(a.path)} className="text-xs text-primary hover:underline flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" /> {a.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => remove.mutate(f.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" /> Released vs Dispatch vs Buyer</CardTitle>
              <CardDescription>
                Matched automatically by linked dispatch report, otherwise by vehicle / truck number.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead className="text-right">Released (kg)</TableHead>
                    <TableHead className="text-right">Dispatch store (kg)</TableHead>
                    <TableHead className="text-right">Buyer weighed (kg)</TableHead>
                    <TableHead>Store vs Dispatch</TableHead>
                    <TableHead>Store vs Buyer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nothing to compare yet</TableCell></TableRow>
                  ) : comparison.map((c) => (
                    <TableRow key={c.form.id}>
                      <TableCell className="font-mono text-xs">{c.form.form_number || "—"}</TableCell>
                      <TableCell>{c.form.clearance_date}</TableCell>
                      <TableCell className="font-mono text-xs">{c.form.vehicle_registration}</TableCell>
                      <TableCell>{c.form.destination_buyer || "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{c.released.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{c.dispatchStore === null ? "—" : c.dispatchStore.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{c.buyerWeight === null ? "—" : c.buyerWeight.toLocaleString()}</TableCell>
                      <TableCell>{diffBadge(c.storeVsDispatch)}</TableCell>
                      <TableCell>{diffBadge(c.storeVsBuyer)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "New"} Store Coffee Clearance / Release Form</DialogTitle>
            <DialogDescription>Capture the paper form exactly as signed at the store.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>Form No.</Label><Input value={form.form_number} onChange={(e) => set("form_number", e.target.value)} placeholder="4003" /></div>
            <div><Label>Date</Label><Input type="date" value={form.clearance_date} onChange={(e) => set("clearance_date", e.target.value)} /></div>
            <div><Label>Warehouse / Store</Label><Input value={form.warehouse} onChange={(e) => set("warehouse", e.target.value)} placeholder="Kasese" /></div>
            <div><Label>Destination / Buyer</Label><Input value={form.destination_buyer} onChange={(e) => set("destination_buyer", e.target.value)} /></div>
            <div><Label>Vehicle / Truck No. *</Label><Input value={form.vehicle_registration} onChange={(e) => set("vehicle_registration", e.target.value)} /></div>
            <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={(e) => set("driver_name", e.target.value)} /></div>
            <div><Label>Driver Tel.</Label><Input value={form.driver_phone} onChange={(e) => set("driver_phone", e.target.value)} /></div>
            <div className="md:col-span-2">
              <Label>Link dispatch comparison report (optional)</Label>
              <Select value={form.dispatch_report_id || "none"} onValueChange={(v) => set("dispatch_report_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Auto-match by vehicle" /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">Auto-match by vehicle</SelectItem>
                  {dispatchReports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.dispatch_date} — {r.destination_buyer || "Buyer"} — {r.vehicle_registrations}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Coffee released from store</Label>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No.</TableHead>
                    <TableHead>Lot / Batch Ref.</TableHead>
                    <TableHead>Coffee Type</TableHead>
                    <TableHead className="w-24">Bags</TableHead>
                    <TableHead className="w-32">Weight (Kg)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell><Input value={it.lot_ref} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, lot_ref: e.target.value } : x))} /></TableCell>
                      <TableCell><Input value={it.coffee_type} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, coffee_type: e.target.value } : x))} placeholder="Arabica" /></TableCell>
                      <TableCell><Input type="number" value={it.bags} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, bags: e.target.value } : x))} /></TableCell>
                      <TableCell><Input type="number" value={it.weight_kg} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, weight_kg: e.target.value } : x))} /></TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setItems((p) => p.length > 1 ? p.filter((_, i) => i !== idx) : p)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold text-right">TOTAL</TableCell>
                    <TableCell className="font-semibold">{totals.bags.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">{totals.weight.toLocaleString()}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, { ...emptyItem }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add line
            </Button>
          </div>

          <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={(e) => set("remarks", e.target.value)} rows={2} /></div>

          <div className="space-y-2">
            <Label>Attach signed form / scan (PDF or image)</Label>
            <Input
              type="file"
              multiple
              accept="application/pdf,image/*"
              disabled={uploading}
              onChange={(e) => uploadFiles(e.target.files)}
            />
            {uploading && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </p>
            )}
            {attachments.length > 0 && (
              <ul className="space-y-1">
                {attachments.map((a, idx) => (
                  <li key={a.path} className="flex items-center justify-between border rounded-md px-2 py-1 text-sm">
                    <button type="button" className="flex items-center gap-2 hover:underline text-left" onClick={() => openAttachment(a.path)}>
                      <Paperclip className="h-3.5 w-3.5" /> {a.name}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>Released By — Store Manager</Label><Input value={form.released_by} onChange={(e) => set("released_by", e.target.value)} /></div>
            <div><Label>Received By — Driver</Label><Input value={form.received_by_driver} onChange={(e) => set("received_by_driver", e.target.value)} /></div>
            <div><Label>Approved By — Administrator</Label><Input value={form.approved_by} onChange={(e) => set("approved_by", e.target.value)} /></div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreClearanceForms;
