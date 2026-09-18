import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardList, Printer, Loader2, CheckCircle2, Beaker, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";
import { buildPublicUrl } from "@/utils/publicUrl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import jsPDF from "jspdf";
import QRCode from "qrcode";

const SAMPLING_EMAILS = [
  "onesmusrubambura@greatpearlcoffee.com",
  "sserunkumataufiq@greatpearlcoffee.com",
];

const SAMPLE_TYPES = [
  { value: "offer_sample", label: "Offer Sample" },
  { value: "delivery", label: "Delivery" },
  { value: "presample", label: "Presample" },
  { value: "dispatch", label: "Dispatch" },
];

const typeLabel = (v: string) => SAMPLE_TYPES.find((t) => t.value === v)?.label || v;

const nowLocalInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};


const buildOrderPdfBase64 = async (order: any): Promise<string | undefined> => {
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const qrData = buildPublicUrl(`/verify/${encodeURIComponent(order.order_number)}`);
    const qrPng = await QRCode.toDataURL(qrData, { width: 300, margin: 1 });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("GREAT AGRO COFFEE", 297, 50, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Member of HELLO YEDA COFFEE COMPANY LIMITED · P.O Box 431420, Kasese, Uganda", 297, 65, { align: "center" });
    doc.setLineWidth(1);
    doc.line(48, 76, 547, 76);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("QUALITY SAMPLING ORDER", 297, 100, { align: "center" });

    const rows: [string, string][] = [
      ["Sampling Order No.", String(order.order_number || "")],
      ["Supplier", String(order.supplier_name || "")],
      ["Sample Type", typeLabel(order.sample_type)],
      ["Delivery Time to Lab", order.delivery_time ? format(new Date(order.delivery_time), "dd MMM yyyy, HH:mm") : ""],
      ["Sampled By", String(order.sampled_by || "")],
      ["Created By", String(order.created_by_name || order.created_by_email || "")],
    ];
    if (order.notes) rows.push(["Notes", String(order.notes)]);

    let y = 125;
    doc.setFontSize(10);
    rows.forEach(([k, v]) => {
      doc.setDrawColor(150);
      doc.rect(48, y, 170, 24);
      doc.rect(218, y, 329, 24);
      doc.setFont("helvetica", "bold");
      doc.text(k, 54, y + 16);
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(v, 315), 224, y + 16);
      y += 24;
    });

    doc.addImage(qrPng, "PNG", 247, y + 24, 100, 100);
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text(String(order.order_number || ""), 297, y + 140, { align: "center" });

    const out = doc.output("datauristring");
    return out.split(",")[1];
  } catch {
    return undefined;
  }
};

const printSamplingOrder = (order: any) => {
  const qrData = buildPublicUrl(`/verify/${encodeURIComponent(order.order_number)}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${order.order_number}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#111}
    h1{font-size:20px;margin:0}
    .sub{font-size:11px;color:#555;margin-top:2px}
    .head{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
    .title{text-align:center;font-size:16px;font-weight:bold;letter-spacing:2px;margin:14px 0}
    table{width:100%;border-collapse:collapse;font-size:13px}
    td{border:1px solid #999;padding:9px 10px}
    td.k{background:#f3f3f3;font-weight:bold;width:35%}
    .qrwrap{text-align:center;margin-top:22px}
    .qrwrap img{width:150px;height:150px}
    .code{font-family:monospace;font-size:15px;font-weight:bold;letter-spacing:2px;margin-top:8px}
    .sign{margin-top:34px;display:flex;justify-content:space-between;font-size:12px}
    .sign div{width:45%;border-top:1px solid #111;padding-top:6px;text-align:center}
  </style></head><body>
  <div class="head"><h1>GREAT AGRO COFFEE</h1><div class="sub">Member of HELLO YEDA COFFEE COMPANY LIMITED &middot; P.O Box 431420, Kasese, Uganda</div></div>
  <div class="title">QUALITY SAMPLING ORDER</div>
  <table>
    <tr><td class="k">Sampling Order No.</td><td><strong>${order.order_number}</strong></td></tr>
    <tr><td class="k">Supplier</td><td>${order.supplier_name}</td></tr>
    <tr><td class="k">Sample Type</td><td>${typeLabel(order.sample_type)}</td></tr>
    <tr><td class="k">Delivery Time to Lab</td><td>${format(new Date(order.delivery_time), "dd MMM yyyy, HH:mm")}</td></tr>
    <tr><td class="k">Sampled By</td><td>${order.sampled_by}</td></tr>
    <tr><td class="k">Created By</td><td>${order.created_by_name || order.created_by_email}</td></tr>
    ${order.moisture_percent != null ? `<tr><td class="k">Moisture Reading</td><td><strong>${order.moisture_percent}%</strong></td></tr>` : ""}
    ${order.received_grams != null ? `<tr><td class="k">Grams Received</td><td>${order.received_grams} g</td></tr>` : ""}
    ${order.received_by ? `<tr><td class="k">Received In Lab By</td><td>${order.received_by}${order.received_at ? ` on ${format(new Date(order.received_at), "dd MMM yyyy, HH:mm")}` : ""}</td></tr>` : ""}
    ${order.assessed_by ? `<tr><td class="k">Assessed By</td><td>${order.assessed_by}${order.assessed_at ? ` on ${format(new Date(order.assessed_at), "dd MMM yyyy, HH:mm")}` : ""}</td></tr>` : ""}
    ${order.linked_batch_number ? `<tr><td class="k">Batch / Lot</td><td>${order.linked_batch_number}</td></tr>` : ""}
    ${order.notes ? `<tr><td class="k">Notes</td><td>${order.notes}</td></tr>` : ""}
  </table>
  <div class="qrwrap"><img src="${qrUrl}" alt="QR" /><div class="code">${order.order_number}</div></div>
  <div class="sign"><div>Sampled By (Signature &amp; Date)</div><div>Received in Lab (Signature &amp; Date)</div></div>
  <script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script>
  </body></html>`);
  w.document.close();
};

const SamplingOrdersTab = () => {
  const { employee, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const email = (employee?.email || "").toLowerCase();
  const canCreate = SAMPLING_EMAILS.includes(email) || isAdmin?.();

  const { trackFormSubmission } = useActivityTracker();
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);

  const [form, setForm] = useState({
    supplier_name: "",
    sample_type: "",
    delivery_time: nowLocalInput(),
    sampled_by: (employee as any)?.name || "",
    moisture: "",
    notes: "",
  });

  const [showBackfill, setShowBackfill] = useState(false);
  const [past, setPast] = useState({
    sample_date: "",
    supplier_name: "",
    sample_type: "",
    sampled_by: "",
    received_by: "",
    assessed_by: "",
    grams: "",
    moisture: "",
    linked_batch_number: "",
    observation: "",
    notes: "",
  });


  const { data: orders, isLoading } = useQuery({
    queryKey: ["quality-sampling-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_sampling_orders" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!form.supplier_name.trim() || !form.sample_type || !form.sampled_by.trim()) {
        throw new Error("Supplier, sample type and sampled by are required");
      }
      const moisture = form.moisture === "" ? null : parseFloat(form.moisture);
      if (moisture !== null && (isNaN(moisture) || moisture < 0 || moisture > 100)) {
        throw new Error("Moisture must be between 0 and 100%");
      }
      const payload = {
        moisture_percent: moisture,
        supplier_name: form.supplier_name.trim(),
        sample_type: form.sample_type,
        delivery_time: new Date(form.delivery_time).toISOString(),
        sampled_by: form.sampled_by.trim(),
        notes: form.notes.trim() || null,
        created_by_email: employee?.email || "",
        created_by_name: (employee as any)?.name || null,
        status: "pending",
      };
      const { data, error } = await supabase
        .from("quality_sampling_orders" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: (order) => {
      toast({ title: "Sampling order saved", description: order.order_number });
      setForm({ supplier_name: "", sample_type: "", delivery_time: nowLocalInput(), sampled_by: (employee as any)?.name || "", moisture: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["quality-sampling-orders"] });
      printSamplingOrder(order);
      try {
        trackFormSubmission("Quality Sampling Order");
      } catch (e) {
        console.warn("Loyalty reward for sampling order failed (non-fatal):", e);
      }
      (async () => {
        const pdf_base64 = await buildOrderPdfBase64(order);
        const { error } = await supabase.functions.invoke("notify-sampling-order", {
          body: {
            order: { ...order, sample_type_label: typeLabel(order.sample_type) },
            pdf_base64,
          },
        });
        if (error) {
          toast({ title: "Lab team not notified", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Lab team notified", description: "Alex, Kibaba, Morjalia and Nuwagaba received the sampling order by email." });
        }
      })();
    },
    onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const backfillOrder = useMutation({
    mutationFn: async () => {
      if (!past.sample_date) throw new Error("Pick the date the sample was taken");
      if (!past.supplier_name.trim() || !past.sample_type || !past.sampled_by.trim()) {
        throw new Error("Supplier, sample type and sampled by are required");
      }
      if (!past.assessed_by.trim()) throw new Error("Type who made the assessment");
      const grams = past.grams === "" ? null : parseFloat(past.grams);
      const moisture = past.moisture === "" ? null : parseFloat(past.moisture);
      if (moisture !== null && (isNaN(moisture) || moisture < 0 || moisture > 100)) {
        throw new Error("Moisture must be between 0 and 100%");
      }
      const when = new Date(past.sample_date).toISOString();
      const payload = {
        supplier_name: past.supplier_name.trim(),
        sample_type: past.sample_type,
        delivery_time: when,
        sampled_by: past.sampled_by.trim(),
        notes: past.notes.trim() || null,
        created_by_email: employee?.email || "",
        created_by_name: (employee as any)?.name || null,
        status: "assessed",
        received_grams: grams,
        moisture_percent: moisture,
        received_at: when,
        received_by: past.received_by.trim() || past.assessed_by.trim(),
        received_observation: past.observation.trim() || null,
        assessed_by: past.assessed_by.trim(),
        assessed_at: when,
        linked_batch_number: past.linked_batch_number.trim() || null,
      };
      const { data, error } = await supabase
        .from("quality_sampling_orders" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: (order) => {
      toast({ title: "Past sampling order recorded", description: `${order.order_number} · marked received & assessed · no lab email sent` });
      setPast({
        sample_date: "", supplier_name: "", sample_type: "", sampled_by: "", received_by: "",
        assessed_by: "", grams: "", moisture: "", linked_batch_number: "", observation: "", notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["quality-sampling-orders"] });
      printSamplingOrder(order);
      // Backdated / past samples are intentionally silent — no notify-sampling-order call.
    },
    onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const receiverName = (employee as any)?.name || employee?.email || "";
  const [receipt, setReceipt] = useState({ grams: "", observation: "", moisture: "" });

  const receiveSample = useMutation({
    mutationFn: async (id: string) => {
      const grams = parseFloat(receipt.grams);
      if (!grams || grams <= 0) throw new Error("Type the grams received to confirm the sample");
      const moisture = receipt.moisture === "" ? null : parseFloat(receipt.moisture);
      if (moisture === null || isNaN(moisture)) throw new Error("Type the moisture reading to confirm the sample");
      if (moisture < 0 || moisture > 100) throw new Error("Moisture must be between 0 and 100%");
      const { error } = await supabase
        .from("quality_sampling_orders" as any)
        .update({
          status: "received",
          received_grams: grams,
          moisture_percent: moisture,
          received_at: new Date().toISOString(),
          received_by: receiverName,
          received_observation: receipt.observation.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setReviewOrder(null);
      setReceipt({ grams: "", observation: "", moisture: "" });
      toast({ title: "Sample received in lab", description: `Received by ${receiverName}` });
      queryClient.invalidateQueries({ queryKey: ["quality-sampling-orders"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markAssessed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quality_sampling_orders" as any)
        .update({
          status: "assessed",
          assessed_by: receiverName,
          assessed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Marked as assessed" });
      queryClient.invalidateQueries({ queryKey: ["quality-sampling-orders"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusBadge = (o: any) => {
    if (o.status === "assessed") return <Badge className="bg-green-600 hover:bg-green-600">Assessed</Badge>;
    if (o.status === "received") return <Badge className="bg-blue-600 hover:bg-blue-600">Received in lab</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> New Sampling Order</CardTitle>
            <CardDescription>Record the sample being taken to the lab, then print the order with its QR code.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Supplier name</Label>
              <Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Supplier / seller name" />
            </div>
            <div className="space-y-2">
              <Label>Sample type</Label>
              <Select value={form.sample_type} onValueChange={(v) => setForm({ ...form, sample_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select sample type" /></SelectTrigger>
                <SelectContent>
                  {SAMPLE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delivery time to the lab</Label>
              <Input type="datetime-local" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sampled by</Label>
              <Input value={form.sampled_by} onChange={(e) => setForm({ ...form, sampled_by: e.target.value })} placeholder="Name of the person who sampled" />
            </div>
            <div className="space-y-2">
              <Label>Moisture reading (%) <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="number" min="0" max="100" step="0.1" inputMode="decimal" value={form.moisture} onChange={(e) => setForm({ ...form, moisture: e.target.value })} placeholder="e.g. 12.5" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={() => createOrder.mutate()} disabled={createOrder.isPending}>
                {createOrder.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                Save &amp; Print
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Only the assigned samplers can create sampling orders. You can still view and work on the samples below.
          </CardContent>
        </Card>
      )}

      {canCreate && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2"><HistoryIcon className="h-5 w-5" /> Past Samples (no sampling order)</CardTitle>
                <CardDescription>
                  Record samples that were already analysed and priced. They are saved as received in the lab and assessed, then printed with a QR code.
                  <span className="ml-1 text-destructive">No email notification is sent for backdated records.</span>
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowBackfill((s) => !s)}>
                {showBackfill ? "Hide" : "Add past sample"}
              </Button>
            </div>
          </CardHeader>
          {showBackfill && (
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date &amp; time the sample was taken <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={past.sample_date} onChange={(e) => setPast({ ...past, sample_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Supplier name <span className="text-destructive">*</span></Label>
                <Input value={past.supplier_name} onChange={(e) => setPast({ ...past, supplier_name: e.target.value })} placeholder="Supplier / seller name" />
              </div>
              <div className="space-y-2">
                <Label>Sample type <span className="text-destructive">*</span></Label>
                <Select value={past.sample_type} onValueChange={(v) => setPast({ ...past, sample_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select sample type" /></SelectTrigger>
                  <SelectContent>
                    {SAMPLE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sampled by <span className="text-destructive">*</span></Label>
                <Input value={past.sampled_by} onChange={(e) => setPast({ ...past, sampled_by: e.target.value })} placeholder="Who took the sample" />
              </div>
              <div className="space-y-2">
                <Label>Received in lab by</Label>
                <Input value={past.received_by} onChange={(e) => setPast({ ...past, received_by: e.target.value })} placeholder="Leave blank to use the assessor" />
              </div>
              <div className="space-y-2">
                <Label>Assessment made by <span className="text-destructive">*</span></Label>
                <Input value={past.assessed_by} onChange={(e) => setPast({ ...past, assessed_by: e.target.value })} placeholder="Who analysed / priced the sample" />
              </div>
              <div className="space-y-2">
                <Label>Grams received</Label>
                <Input type="number" min="1" step="1" inputMode="decimal" value={past.grams} onChange={(e) => setPast({ ...past, grams: e.target.value })} placeholder="e.g. 500" />
              </div>
              <div className="space-y-2">
                <Label>Moisture reading (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" inputMode="decimal" value={past.moisture} onChange={(e) => setPast({ ...past, moisture: e.target.value })} placeholder="e.g. 12.5" />
              </div>
              <div className="space-y-2">
                <Label>Batch / lot number (optional)</Label>
                <Input value={past.linked_batch_number} onChange={(e) => setPast({ ...past, linked_batch_number: e.target.value })} placeholder="e.g. 20260202002" />
              </div>
              <div className="space-y-2">
                <Label>Observation (optional)</Label>
                <Input value={past.observation} onChange={(e) => setPast({ ...past, observation: e.target.value })} placeholder="Condition of the sample" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes (optional)</Label>
                <Textarea rows={2} value={past.notes} onChange={(e) => setPast({ ...past, notes: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => backfillOrder.mutate()} disabled={backfillOrder.isPending}>
                  {backfillOrder.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                  Save as assessed &amp; Print
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5" /> Sample Orders (latest 20)</CardTitle>
          <CardDescription>Lab team: confirm the sample when it arrives (grams received), then it is marked assessed when priced.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
          {!isLoading && (orders?.length || 0) === 0 && <p className="text-sm text-muted-foreground">No sampling orders yet.</p>}
          {orders?.map((o) => (
            <div key={o.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">{o.order_number}</span>
                  <Badge variant="outline">{typeLabel(o.sample_type)}</Badge>
                  {statusBadge(o)}
                  {o.linked_batch_number && <Badge variant="outline">Batch {o.linked_batch_number}</Badge>}
                </div>
                <p className="text-sm">{o.supplier_name}</p>
                <p className="text-xs text-muted-foreground">
                  To lab: {format(new Date(o.delivery_time), "dd MMM yyyy, HH:mm")} · Sampled by {o.sampled_by}
                </p>
                {o.received_at && (
                  <p className="text-xs text-muted-foreground">
                    Received {o.received_grams} g by {o.received_by} at {format(new Date(o.received_at), "dd MMM, HH:mm")}
                    {o.moisture_percent != null ? ` · Moisture ${o.moisture_percent}%` : ""}
                    {o.received_observation ? ` · ${o.received_observation}` : ""}
                  </p>
                )}
                {o.status === "assessed" && o.assessed_by && (
                  <p className="text-xs text-muted-foreground">Assessed by {o.assessed_by}{o.assessed_at ? ` at ${format(new Date(o.assessed_at), "dd MMM, HH:mm")}` : ""}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => printSamplingOrder(o)}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                {o.status === "pending" && (
                  <Button size="sm" onClick={() => { setReceipt({ grams: "", observation: "", moisture: "" }); setReviewOrder(o); }}>
                    <Beaker className="h-4 w-4 mr-1" /> Receive sample
                  </Button>
                )}
                {o.status === "received" && (
                  <Button size="sm" variant="secondary" onClick={() => markAssessed.mutate(o.id)} disabled={markAssessed.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark assessed
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={!!reviewOrder} onOpenChange={(open) => !open && setReviewOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receive sample in the lab</DialogTitle>
            <DialogDescription>Check the sample against the printed order, then confirm by typing the grams received.</DialogDescription>
          </DialogHeader>
          {reviewOrder && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                {[
                  ["Sampling order no.", reviewOrder.order_number],
                  ["Supplier", reviewOrder.supplier_name],
                  ["Sample type", typeLabel(reviewOrder.sample_type)],
                  ["Delivery time to lab", format(new Date(reviewOrder.delivery_time), "dd MMM yyyy, HH:mm")],
                  ["Sampled by", reviewOrder.sampled_by],
                  ["Created by", reviewOrder.created_by_name || reviewOrder.created_by_email],
                  ["Notes", reviewOrder.notes || "—"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4 border-b pb-1">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-right font-medium">{v as string}</span>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Grams received <span className="text-destructive">*</span></Label>
                  <Input type="number" min="1" step="1" inputMode="decimal" placeholder="e.g. 500" value={receipt.grams}
                    onChange={(e) => setReceipt({ ...receipt, grams: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Moisture reading (%) <span className="text-destructive">*</span></Label>
                  <Input type="number" min="0" max="100" step="0.1" inputMode="decimal" placeholder="e.g. 12.5" value={receipt.moisture}
                    onChange={(e) => setReceipt({ ...receipt, moisture: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Received by</Label>
                  <Input value={receiverName} disabled />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Time received</Label>
                  <Input value={format(new Date(), "dd MMM yyyy, HH:mm")} disabled />
                  <p className="text-xs text-muted-foreground">Captured automatically when you confirm.</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Observation</Label>
                  <Textarea rows={2} placeholder="Condition of the sample, packaging, smell, moisture feel…" value={receipt.observation}
                    onChange={(e) => setReceipt({ ...receipt, observation: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOrder(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => reviewOrder && printSamplingOrder(reviewOrder)}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button onClick={() => reviewOrder && receiveSample.mutate(reviewOrder.id)} disabled={receiveSample.isPending || !receipt.grams || !receipt.moisture}>
              {receiveSample.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirm received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SamplingOrdersTab;
