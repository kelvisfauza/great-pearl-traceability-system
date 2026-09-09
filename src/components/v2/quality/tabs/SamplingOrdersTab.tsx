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
import { ClipboardList, Printer, Loader2, CheckCircle2, Beaker } from "lucide-react";
import { format } from "date-fns";
import { buildPublicUrl } from "@/utils/publicUrl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const [reviewOrder, setReviewOrder] = useState<any | null>(null);

  const [form, setForm] = useState({
    supplier_name: "",
    sample_type: "",
    delivery_time: nowLocalInput(),
    sampled_by: (employee as any)?.name || "",
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
      const payload = {
        
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
      setForm({ supplier_name: "", sample_type: "", delivery_time: nowLocalInput(), sampled_by: (employee as any)?.name || "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["quality-sampling-orders"] });
      printSamplingOrder(order);
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

  const markAssessed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quality_sampling_orders" as any)
        .update({
          status: "assessed",
          assessed_by: (employee as any)?.name || employee?.email || "",
          assessed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setReviewOrder(null);
      toast({ title: "Marked as assessed" });
      queryClient.invalidateQueries({ queryKey: ["quality-sampling-orders"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5" /> Sample Orders (latest 20)</CardTitle>
          <CardDescription>Lab team: pick a sample to work on and mark it as assessed.</CardDescription>
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
                  {o.status === "assessed"
                    ? <Badge className="bg-green-600 hover:bg-green-600">Assessed</Badge>
                    : <Badge variant="secondary">Pending</Badge>}
                </div>
                <p className="text-sm">{o.supplier_name}</p>
                <p className="text-xs text-muted-foreground">
                  To lab: {format(new Date(o.delivery_time), "dd MMM yyyy, HH:mm")} · Sampled by {o.sampled_by}
                  {o.status === "assessed" && o.assessed_by ? ` · Assessed by ${o.assessed_by}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => printSamplingOrder(o)}>
                  <Printer className="h-4 w-4 mr-1" /> Print
                </Button>
                {o.status !== "assessed" && (
                  <Button size="sm" onClick={() => setReviewOrder(o)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Review &amp; mark assessed
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
            <DialogTitle>Review sample details</DialogTitle>
            <DialogDescription>Check the sample against the printed order before confirming it is assessed.</DialogDescription>
          </DialogHeader>
          {reviewOrder && (
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
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOrder(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => reviewOrder && printSamplingOrder(reviewOrder)}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button onClick={() => reviewOrder && markAssessed.mutate(reviewOrder.id)} disabled={markAssessed.isPending}>
              {markAssessed.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirm assessed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SamplingOrdersTab;
