import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Printer, Truck, Link2, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { printDispatchAnalysis, type DispatchAnalysisRecord } from "@/utils/dispatchAnalysisPrint";

const emptyForm = {
  dispatch_date: new Date().toISOString().split("T")[0],
  truck_serial_number: "",
  vehicle_registration: "",
  driver_name: "",
  destination_buyer: "",
  dispatch_location: "",
  coffee_type: "",
  batch_references: "",
  bags_loaded: "",
  total_weight_kg: "",
  sample_weight_g: "300",
  moisture_content: "",
  group1_defects: "",
  group2_defects: "",
  below_screen_12: "",
  screen_15_plus: "",
  foreign_matter: "",
  pods_husks: "",
  cup_score: "",
  cup_profile: "",
  outturn: "",
  verdict: "accepted",
  sampled_by: "",
  analysed_by: "",
  approved_by: "",
  remarks: "",
  eudr_dispatch_report_id: "",
};

const num = (s: string) => (s === "" || s === null ? null : Number(s));

const DispatchMonitoringTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const set = (k: string, val: string) => setForm((f) => ({ ...f, [k]: val }));

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["quality-dispatch-analyses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quality_dispatch_analyses")
        .select("*")
        .order("dispatch_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as DispatchAnalysisRecord[];
    },
  });

  const { data: eudrReports = [] } = useQuery({
    queryKey: ["eudr-dispatch-reports-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eudr_dispatch_reports")
        .select("id, dispatch_date, destination_buyer, coffee_type")
        .order("dispatch_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const nextNumber = useMemo(() => {
    const prefix = `GAC/DA/${format(new Date(), "yyyyMM")}/`;
    const count = analyses.filter((a) => (a.analysis_number || "").startsWith(prefix)).length;
    return `${prefix}${String(count + 1).padStart(4, "0")}`;
  }, [analyses]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.truck_serial_number.trim()) throw new Error("Serial number on the truck is required");
      const payload: any = {
        dispatch_date: form.dispatch_date,
        truck_serial_number: form.truck_serial_number.trim(),
        vehicle_registration: form.vehicle_registration || null,
        driver_name: form.driver_name || null,
        destination_buyer: form.destination_buyer || null,
        dispatch_location: form.dispatch_location || null,
        coffee_type: form.coffee_type || null,
        batch_references: form.batch_references || null,
        bags_loaded: num(form.bags_loaded),
        total_weight_kg: num(form.total_weight_kg),
        sample_weight_g: num(form.sample_weight_g),
        moisture_content: num(form.moisture_content),
        group1_defects: num(form.group1_defects),
        group2_defects: num(form.group2_defects),
        below_screen_12: num(form.below_screen_12),
        screen_15_plus: num(form.screen_15_plus),
        foreign_matter: num(form.foreign_matter),
        pods_husks: num(form.pods_husks),
        cup_score: num(form.cup_score),
        cup_profile: form.cup_profile || null,
        outturn: num(form.outturn),
        verdict: form.verdict,
        sampled_by: form.sampled_by || null,
        analysed_by: form.analysed_by || null,
        approved_by: form.approved_by || null,
        remarks: form.remarks || null,
        eudr_dispatch_report_id: form.eudr_dispatch_report_id || null,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("quality_dispatch_analyses")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        return editingId;
      }

      payload.analysis_number = nextNumber;
      payload.created_by = employee?.email || null;
      payload.created_by_name = (employee as any)?.name || employee?.email || null;

      const { data, error } = await (supabase as any)
        .from("quality_dispatch_analyses")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      if (form.eudr_dispatch_report_id) {
        await (supabase as any)
          .from("eudr_dispatch_reports")
          .update({ dispatch_analysis_id: data.id })
          .eq("id", form.eudr_dispatch_report_id);
      }
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-dispatch-analyses"] });
      toast({ title: editingId ? "Dispatch analysis updated" : "Dispatch analysis saved" });
      setOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("quality_dispatch_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality-dispatch-analyses"] });
      toast({ title: "Dispatch analysis deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handlePrint = async (rec: DispatchAnalysisRecord) => {
    printDispatchAnalysis(rec);
    await (supabase as any)
      .from("quality_dispatch_analyses")
      .update({ printed_at: new Date().toISOString(), print_count: ((rec as any).print_count || 0) + 1 })
      .eq("id", rec.id);
    qc.invalidateQueries({ queryKey: ["quality-dispatch-analyses"] });
  };

  const startEdit = (rec: any) => {
    setEditingId(rec.id);
    setForm({
      ...emptyForm,
      ...Object.fromEntries(
        Object.keys(emptyForm).map((k) => [k, rec[k] === null || rec[k] === undefined ? "" : String(rec[k])])
      ),
    } as any);
    setOpen(true);
  };

  const numField = (key: keyof typeof emptyForm, label: string, step = "0.01") => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={(form as any)[key]} onChange={(e) => set(key as string, e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5" /> Dispatch Monitoring
          </h3>
          <p className="text-sm text-muted-foreground">
            Record sample analysis for every dispatched truck, print 2 signed copies (truck + management) and link to EUDR dispatch reports.
          </p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ ...emptyForm, sampled_by: (employee as any)?.name || "", analysed_by: (employee as any)?.name || "" }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Dispatch Analysis
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Dispatch Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : analyses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No dispatch analyses recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Truck Serial</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Moisture</TableHead>
                    <TableHead>Defects (G1/G2)</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead>EUDR</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.analysis_number || "-"}</TableCell>
                      <TableCell>{format(new Date(a.dispatch_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">{a.truck_serial_number}</TableCell>
                      <TableCell>{a.destination_buyer || "-"}</TableCell>
                      <TableCell>{a.moisture_content ?? "-"}%</TableCell>
                      <TableCell>{a.group1_defects ?? "-"} / {a.group2_defects ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={a.verdict === "rejected" ? "destructive" : "secondary"}>{a.verdict}</Badge>
                      </TableCell>
                      <TableCell>
                        {a.eudr_dispatch_report_id ? (
                          <Badge variant="outline" className="gap-1"><Link2 className="h-3 w-3" /> Linked</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handlePrint(a)} title="Print 2 copies">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove.mutate(a.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
            <DialogTitle>{editingId ? "Edit Dispatch Analysis" : `New Dispatch Analysis — ${nextNumber}`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold mb-2">A. Dispatch / Truck details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={form.dispatch_date} onChange={(e) => set("dispatch_date", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Serial number on truck *</Label>
                  <Input value={form.truck_serial_number} onChange={(e) => set("truck_serial_number", e.target.value)} placeholder="e.g. SN-00123" />
                </div>
                <div>
                  <Label className="text-xs">Vehicle registration</Label>
                  <Input value={form.vehicle_registration} onChange={(e) => set("vehicle_registration", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Driver</Label>
                  <Input value={form.driver_name} onChange={(e) => set("driver_name", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Destination / Buyer</Label>
                  <Input value={form.destination_buyer} onChange={(e) => set("destination_buyer", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Dispatch location</Label>
                  <Input value={form.dispatch_location} onChange={(e) => set("dispatch_location", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Coffee type</Label>
                  <Input value={form.coffee_type} onChange={(e) => set("coffee_type", e.target.value)} />
                </div>
                {numField("bags_loaded", "Bags loaded", "1")}
                {numField("total_weight_kg", "Total weight (kg)")}
                <div className="sm:col-span-3">
                  <Label className="text-xs">Lot / batch references</Label>
                  <Input value={form.batch_references} onChange={(e) => set("batch_references", e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">B. Results of the sample</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {numField("sample_weight_g", "Sample weight (g)")}
                {numField("moisture_content", "Moisture (%)")}
                {numField("group1_defects", "Group 1 defects (%)")}
                {numField("group2_defects", "Group 2 defects (%)")}
                {numField("below_screen_12", "Below screen 12 (%)")}
                {numField("screen_15_plus", "Screen 15+ (%)")}
                {numField("foreign_matter", "Foreign matter (%)")}
                {numField("pods_husks", "Pods / husks (%)")}
                {numField("outturn", "Outturn (%)")}
                {numField("cup_score", "Cup score")}
                <div className="col-span-2">
                  <Label className="text-xs">Cup profile</Label>
                  <Input value={form.cup_profile} onChange={(e) => set("cup_profile", e.target.value)} placeholder="e.g. Clean, chocolate, citrus" />
                </div>
                <div>
                  <Label className="text-xs">Verdict</Label>
                  <Select value={form.verdict} onValueChange={(v) => set("verdict", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="conditional">Conditional</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">C. Personnel & linking</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Sampled by</Label>
                  <Input value={form.sampled_by} onChange={(e) => set("sampled_by", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Analysed by</Label>
                  <Input value={form.analysed_by} onChange={(e) => set("analysed_by", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Approved by</Label>
                  <Input value={form.approved_by} onChange={(e) => set("approved_by", e.target.value)} />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs">Link to EUDR dispatch report (optional)</Label>
                  <Select value={form.eudr_dispatch_report_id || "none"} onValueChange={(v) => set("eudr_dispatch_report_id", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not linked</SelectItem>
                      {eudrReports.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {format(new Date(r.dispatch_date), "dd MMM yyyy")} — {r.destination_buyer} ({r.coffee_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs">Remarks</Label>
                  <Textarea rows={3} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchMonitoringTab;
