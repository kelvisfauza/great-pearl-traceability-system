import { useEffect, useMemo, useState } from "react";
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
import { Loader2, Plus, ClipboardList, Trash2, Scale, Pencil, Paperclip, Printer, Link2 } from "lucide-react";
import type { DispatchReport } from "@/hooks/useEUDRDispatchReports";
import { validateDispatch } from "@/lib/storeDispatchRules";
import { printStoreDispatchPair } from "@/utils/storeDispatchPdf";
import { batchClearanceLine, ClearanceBatch } from "@/lib/clearanceWorkflowRules";
import AttachDeliveryNoteSaleDialog from "@/components/sales/AttachDeliveryNoteSaleDialog";

interface ClearanceItem {
  batch_id: string;
  lot_ref: string;
  coffee_type: string;
  bags: string;
  weight_kg: string;
}

const emptyItem: ClearanceItem = { batch_id: "", lot_ref: "", coffee_type: "", bags: "", weight_kg: "" };

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
  contract_id: "",
};

const n = (v: any) => (v === "" || v === null || v === undefined ? 0 : Number(v) || 0);

const StoreClearanceForms = ({ salesView = false }: { salesView?: boolean }) => {
  const { employee, hasPermission } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: dispatchReports = [] } = useQuery({
    queryKey: ['clearance-dispatch-comparison-reports'],
    enabled: salesView,
    queryFn: async () => {
      const { data, error } = await supabase.from('eudr_dispatch_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as DispatchReport[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [items, setItems] = useState<ClearanceItem[]>([{ ...emptyItem }]);
  const [printRow, setPrintRow] = useState<any | null>(null);
  const [attachRow, setAttachRow] = useState<any | null>(null);
  const [printing, setPrinting] = useState(false);
  const [createdRow, setCreatedRow] = useState<any | null>(null);
  const { data: canAdmin = false } = useQuery({ queryKey: ['store-dispatch-admin', employee?.email], queryFn: async () => {
    const { data, error } = await (supabase as any).rpc('can_admin_store_dispatch');
    if (error) throw error;
    return data === true;
  }, enabled: Boolean(employee) });
  const canManage = canAdmin || hasPermission('Store Management');
  const printPair = async (row: any) => {
    setPrinting(true);
    try { await printStoreDispatchPair(row); setPrintRow(null); }
    catch (error: any) { toast({ title: 'Could not print', description: error.message, variant: 'destructive' }); }
    finally { setPrinting(false); }
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("dispatch-attachments").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open file", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };


  const { data: forms = [], isLoading, error: formsError } = useQuery({
    queryKey: ["store-clearance-forms"],
    enabled: salesView,
    refetchInterval: 30000,
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

  const { data: contracts = [] } = useQuery({
    queryKey: ["clearance-buyer-contracts"],
    enabled: salesView,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("buyer_contracts")
        .select("id, contract_ref, buyer_name, total_quantity, status")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const batchesQuery = useQuery({ queryKey: ['clearance-available-batches'], enabled: open && !salesView, staleTime: 0, queryFn: async () => {
    const rows: ClearanceBatch[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('inventory_batches').select('id,batch_code,coffee_type,remaining_kilograms').gt('remaining_kilograms', 0).order('batch_date').order('id').range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    return rows;
  } });
  const batches = batchesQuery.data || [];
  const selectBatch = (index: number, id: string) => {
    const batch = batches.find(b => b.id === id);
    if (!batch) return;
    const line = batchClearanceLine(batch);
    setItems(previous => previous.map((item, i) => i === index ? { ...line, bags: '', weight_kg: String(line.weight_kg) } : item));
  };
  useEffect(() => {
    if (!createdRow) return;
    const channel = supabase.channel(`store-clearance-status-${crypto.randomUUID()}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_clearance_forms', filter: `id=eq.${createdRow.id}` }, payload => setCreatedRow(payload.new)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [createdRow?.id]);

  const contractById = useMemo(
    () => new Map((contracts as any[]).map((c: any) => [c.id, c])),
    [contracts],
  );

  const totals = useMemo(() => ({
    bags: items.reduce((s, i) => s + n(i.bags), 0),
    weight: items.reduce((s, i) => s + n(i.weight_kg), 0),
  }), [items]);

  const resetForm = () => {
    setForm({ ...emptyForm, released_by: employee?.name || "" });
    setItems([{ ...emptyItem }]);
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
      contract_id: row.contract_id || "",
    });
    setItems(Array.isArray(row.items) && row.items.length ? row.items.map((i: any) => ({
      batch_id: i.batch_id || "", lot_ref: i.lot_ref || "", coffee_type: i.coffee_type || "", bags: String(i.bags ?? ""), weight_kg: String(i.weight_kg ?? ""),
    })) : [{ ...emptyItem }]);
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.vehicle_registration?.trim()) throw new Error("Vehicle / truck number is required");
      const cleanItems = items
        .filter((i) => i.coffee_type || i.bags || i.weight_kg || i.lot_ref)
        .map((i) => {
          const batch = batches.find(b => b.id === i.batch_id);
          if (!batch) throw new Error('Choose an available inventory batch for each line');
          return batchClearanceLine(batch, n(i.weight_kg), n(i.bags));
        });
      if (new Set(cleanItems.map(i => i.batch_id)).size !== cleanItems.length) throw new Error('Choose each batch only once');
      if (cleanItems.length === 0) throw new Error("Add at least one coffee line");
      validateDispatch(form.destination_buyer || '', form.vehicle_registration || '', cleanItems);

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
        dispatch_report_id: null,
        contract_id: null,
        attachments: [],
      };

      if (editingId) {
        const { data, error } = await (supabase as any).from("store_clearance_forms").update(payload).eq("id", editingId).select('*').single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from("store_clearance_forms")
          .insert({ ...payload, created_by: employee?.email || null }).select('*').single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (row: any) => {
      toast({ title: "Clearance saved — sent to Procurement for confirmation" });
      qc.invalidateQueries({ queryKey: ["procurement-clearance-requests"] });
      qc.invalidateQueries({ queryKey: ["store-clearance-forms"] });
      setOpen(false);
      resetForm();
      if (!salesView) setCreatedRow(row);
      if (row.delivery_note_number) setPrintRow(row);
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).from("store_clearance_forms").delete().eq("id", id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('The clearance was not deleted');
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
            <ClipboardList className="h-5 w-5" /> {salesView ? 'Sales Delivery Notes' : 'Store Clearance & Delivery Notes'}
          </h3>
        </div>
        {canManage && !salesView && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Clearance Form</Button>}
      </div>

      {!salesView && createdRow && <div className="border-t py-4 space-y-3">
        <p className="font-mono text-sm break-words">{createdRow.form_number} · {createdRow.delivery_note_number}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={printing} onClick={() => printPair(createdRow)}><Printer className="mr-2 h-4 w-4" />Print both</Button>
        </div>
        <Badge variant="outline">{createdRow.procurement_status === 'confirmed' ? createdRow.sale_basis === 'spot' ? 'Procurement confirmed: selling on spot' : 'Procurement confirmed: buyer contract' : 'Awaiting Procurement confirmation'}</Badge>
      </div>}

      {salesView && <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Clearance Records</TabsTrigger>
          <TabsTrigger value="comparison">Weight Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {formsError ? <p className="p-4 text-sm text-destructive">Could not load clearance forms. Please try again.</p> : isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form No.</TableHead>
                      <TableHead>Delivery Note / Sale</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Contract</TableHead>
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
                      <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">No clearance forms recorded yet</TableCell></TableRow>
                    ) : forms.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.form_number || "—"}</TableCell>
                        <TableCell><div className="font-mono text-xs">{f.delivery_note_number || 'Legacy form'}</div>{f.delivery_note_number && <Badge variant={f.sale_id ? 'secondary' : 'outline'}>{f.sale_id ? 'Sale attached' : 'Awaiting sale'}</Badge>}{f.sale_id && <div className="text-xs text-muted-foreground break-all" title={f.sale_id}>Sale {f.sale_id.slice(0, 8)}</div>}</TableCell>
                        <TableCell>{f.clearance_date}</TableCell>
                        <TableCell>{f.warehouse || "—"}</TableCell>
                        <TableCell className="text-xs">{contractById.get(f.contract_id)?.contract_ref || "—"}</TableCell>
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
                          {f.delivery_note_number && <Button size="sm" variant="ghost" title="Print clearance and delivery note" aria-label="Print clearance and delivery note" disabled={printing} onClick={() => printPair(f)}><Printer className="h-3.5 w-3.5" /></Button>}
                          {salesView && canAdmin && f.delivery_note_number && !f.sale_id && <Button size="sm" variant="outline" onClick={() => setAttachRow(f)}><Link2 className="mr-1 h-3.5 w-3.5" />Attach sale</Button>}
                          {canManage && !salesView && !f.sale_id && <Button size="sm" variant="ghost" title="Edit clearance" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>}
                          {canAdmin && !f.sale_id && <Button size="sm" variant="ghost" title="Delete clearance" onClick={() => remove.mutate(f.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
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
      </Tabs>}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "New"} Store Coffee Clearance / Release Form</DialogTitle>
            <DialogDescription>Clearance and delivery note</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>Form No. (automatic)</Label><Input value={form.form_number} readOnly placeholder="Generated automatically on save" /></div>
            <div><Label>Date</Label><Input type="date" value={form.clearance_date} onChange={(e) => set("clearance_date", e.target.value)} /></div>
            <div><Label>Warehouse / Store</Label><Input value={form.warehouse} onChange={(e) => set("warehouse", e.target.value)} placeholder="Kasese" /></div>
            <div><Label>Destination / Buyer *</Label><Input value={form.destination_buyer} onChange={(e) => set("destination_buyer", e.target.value)} /></div>
            <div><Label>Vehicle / Truck No. *</Label><Input value={form.vehicle_registration} onChange={(e) => set("vehicle_registration", e.target.value)} /></div>
            <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={(e) => set("driver_name", e.target.value)} /></div>
            <div><Label>Driver Tel.</Label><Input value={form.driver_phone} onChange={(e) => set("driver_phone", e.target.value)} /></div>
          </div>


          <div className="space-y-2">
            <Label>Coffee released from store — batches</Label>
            {batchesQuery.isError && <p role="alert" className="text-destructive">Could not load batches.</p>}
            {!batchesQuery.isFetching && !batchesQuery.isError && !batches.length && <p className="text-muted-foreground">No batches with available stock.</p>}
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
                      <TableCell><Select value={it.batch_id} onValueChange={id => selectBatch(idx, id)} disabled={batchesQuery.isFetching}><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent>{batches.filter(b => b.id === it.batch_id || !items.some(i => i.batch_id === b.id)).map(b => <SelectItem key={b.id} value={b.id}>{b.batch_code} · {b.remaining_kilograms.toLocaleString()} kg</SelectItem>)}</SelectContent></Select></TableCell>
                      <TableCell><Input value={it.coffee_type} readOnly placeholder="From batch" /></TableCell>
                      <TableCell><Input type="number" value={it.bags} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, bags: e.target.value } : x))} /></TableCell>
                      <TableCell><Input type="number" min="0.01" step="0.01" max={batches.find(b => b.id === it.batch_id)?.remaining_kilograms} value={it.weight_kg} onChange={(e) => setItems((p) => p.map((x, i) => i === idx ? { ...x, weight_kg: e.target.value } : x))} /></TableCell>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>Released By — Store Manager</Label><Input value={form.released_by} onChange={(e) => set("released_by", e.target.value)} /></div>
            <div><Label>Received By — Driver</Label><Input value={form.received_by_driver} onChange={(e) => set("received_by_driver", e.target.value)} /></div>
            <div><Label>Approved By — Administrator</Label><Input value={form.approved_by} onChange={(e) => set("approved_by", e.target.value)} /></div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || batchesQuery.isFetching || batchesQuery.isError}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(printRow)} onOpenChange={open => { if (!open && !printing) setPrintRow(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Print clearance and delivery note?</DialogTitle><DialogDescription>{printRow?.form_number} · {printRow?.delivery_note_number}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" disabled={printing} onClick={() => setPrintRow(null)}>Later</Button><Button disabled={printing} onClick={() => printRow && printPair(printRow)}><Printer className="mr-2 h-4 w-4" />{printing ? 'Preparing…' : 'Print both'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {attachRow && <AttachDeliveryNoteSaleDialog key={attachRow.id} note={attachRow} onClose={() => setAttachRow(null)} />}
    </div>
  );
};

export default StoreClearanceForms;
