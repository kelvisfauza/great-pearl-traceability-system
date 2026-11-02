import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { preparePdfPrint } from "@/utils/pdfPrintStamp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Printer, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  date: string;
  batch: string;
  supplierCode: string;
  supplierName: string;
  coffeeType: string;
  kgs: number;
  price: number | null;
  remarks: string;
  status: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${pad(last)}` };
};
const fmt = (n: number) => n.toLocaleString("en-UG", { maximumFractionDigits: 2 });

const StorePurchasesReport = () => {
  const { toast } = useToast();
  const now = new Date();
  const defMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [month, setMonth] = useState(defMonth);
  const [from, setFrom] = useState(monthRange(defMonth).from);
  const [to, setTo] = useState(monthRange(defMonth).to);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const pickMonth = (ym: string) => {
    setMonth(ym);
    if (ym) { const r = monthRange(ym); setFrom(r.from); setTo(r.to); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const records: any[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from("coffee_records")
          .select("id,date,batch_number,supplier_id,supplier_name,coffee_type,kilograms,status")
          .gte("date", from).lte("date", to)
          .order("date", { ascending: true })
          .range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        records.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      const ids = records.map((r) => r.id);
      const supIds = [...new Set(records.map((r) => r.supplier_id).filter(Boolean))];
      const qa: Record<string, any> = {};
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase
          .from("quality_assessments")
          .select("store_record_id,final_price,suggested_price,admin_discretion_price,moisture,group1_defects,group2_defects,outturn,quality_note,comments,status,created_at")
          .in("store_record_id", ids.slice(i, i + 200))
          .order("created_at", { ascending: true });
        if (error) throw error;
        (data || []).forEach((q: any) => { qa[q.store_record_id] = q; });
      }
      const sup: Record<string, string> = {};
      for (let i = 0; i < supIds.length; i += 200) {
        const { data, error } = await supabase.from("suppliers").select("id,code").in("id", supIds.slice(i, i + 200));
        if (error) throw error;
        (data || []).forEach((s: any) => { sup[s.id] = s.code || ""; });
      }
      setRows(records.map((r) => {
        const q = qa[r.id];
        const parts: string[] = [];
        if (q) {
          if (q.moisture != null) parts.push(`MC ${q.moisture}%`);
          if (q.group1_defects != null) parts.push(`G1 ${q.group1_defects}%`);
          if (q.group2_defects != null) parts.push(`G2 ${q.group2_defects}%`);
          if (q.outturn != null) parts.push(`Outturn ${q.outturn}%`);
          const note = q.quality_note || q.comments;
          if (note) parts.push(note);
        }
        const price = q ? (q.admin_discretion_price ?? q.final_price ?? q.suggested_price ?? null) : null;
        return {
          id: r.id,
          date: r.date,
          batch: r.batch_number || "",
          supplierCode: r.supplier_id ? sup[r.supplier_id] || "" : "",
          supplierName: r.supplier_name || "",
          coffeeType: r.coffee_type || "",
          kgs: Number(r.kilograms) || 0,
          price: price != null ? Number(price) : null,
          remarks: q ? parts.join(", ") : "Not assessed",
          status: (r.status || "").toLowerCase(),
        };
      }));
      setLoaded(true);
    } catch (e: any) {
      toast({ title: "Could not load purchases", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) =>
      (status === "all" || r.status === status) &&
      (!s || [r.batch, r.supplierCode, r.supplierName].some((v) => v.toLowerCase().includes(s))));
  }, [rows, status, search]);
  const totalKg = filtered.reduce((a, r) => a + r.kgs, 0);
  const totalValue = filtered.reduce((a, r) => a + (r.price != null ? r.price * r.kgs : 0), 0);
  const unpriced = filtered.filter((r) => r.price == null).length;

  const print = async () => {
    const w = window.open("", "_blank");
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14);
      doc.text("Great Agro Coffee — Store Purchases Report", 14, 14);
      doc.setFontSize(9);
      doc.text(`Period: ${from} to ${to}${status !== "all" ? `   Status: ${status}` : ""}${search ? `   Filter: ${search}` : ""}`, 14, 20);
      doc.text(`Deliveries: ${filtered.length}   Total kg: ${fmt(totalKg)}   Value (priced only): UGX ${fmt(Math.round(totalValue))}   Without price: ${unpriced}`, 14, 25);
      autoTable(doc, {
        startY: 29,
        head: [["Date", "Batch", "Supplier code", "Supplier name", "Coffee", "Kgs", "Price/kg", "Quality remarks", "Status"]],
        body: filtered.map((r) => [r.date, r.batch, r.supplierCode, r.supplierName, r.coffeeType, fmt(r.kgs), r.price != null ? fmt(r.price) : "", r.remarks, r.status]),
        foot: [["", "", "", "Total", "", fmt(totalKg), "", "", ""]],
        styles: { fontSize: 7, cellPadding: 1.2 },
        headStyles: { fillColor: [60, 60, 60] },
        columnStyles: { 7: { cellWidth: 70 } },
        margin: { bottom: 30 },
      });
      await preparePdfPrint(doc, `Store purchases ${from} to ${to}`);
      const url = URL.createObjectURL(doc.output("blob"));
      if (w) { w.location.href = url; setTimeout(() => { try { w.print(); } catch {} }, 1200); }
      else window.open(url, "_blank");
    } catch (e: any) {
      w?.close();
      toast({ title: "Could not print", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchases Report (for reconciliation)</CardTitle>
        <CardDescription>All Store deliveries in a period with batch, supplier, kilograms, saved price, quality remarks and status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div><Label>Month</Label><Input type="month" value={month} onChange={(e) => pickMonth(e.target.value)} /></div>
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setMonth(""); }} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setMonth(""); }} /></div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={load} disabled={loading || !from || !to}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}Load purchases
          </Button>
        </div>
        {loaded && (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <Input className="max-w-xs" placeholder="Search batch, supplier code or name" value={search} onChange={(e) => setSearch(e.target.value)} />
              <span className="text-sm text-muted-foreground">{filtered.length} deliveries · {fmt(totalKg)} kg · UGX {fmt(Math.round(totalValue))}{unpriced ? ` · ${unpriced} without price` : ""}</span>
              <Button variant="outline" onClick={print} disabled={!filtered.length} className="ml-auto"><Printer className="h-4 w-4 mr-2" />Print</Button>
            </div>
            <div className="overflow-auto max-h-[500px] border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>{["Date", "Batch", "Code", "Supplier", "Coffee", "Kgs", "Price/kg", "Quality remarks", "Status"].map((h) => <th key={h} className="text-left p-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{r.date}</td><td className="p-2">{r.batch}</td><td className="p-2">{r.supplierCode}</td>
                      <td className="p-2">{r.supplierName}</td><td className="p-2">{r.coffeeType}</td><td className="p-2 text-right">{fmt(r.kgs)}</td>
                      <td className="p-2 text-right">{r.price != null ? fmt(r.price) : ""}</td><td className="p-2">{r.remarks}</td><td className="p-2">{r.status}</td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No purchases in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StorePurchasesReport;
