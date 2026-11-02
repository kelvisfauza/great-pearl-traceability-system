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
  id: string; code: string; date: string; coffeeType: string; status: string;
  total: number; remaining: number; sold: number; deliveries: number; suppliers: string; soldOut: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return { from: `${ym}-01`, to: `${ym}-${pad(new Date(y, m, 0).getDate())}` };
};
const fmt = (n: number) => n.toLocaleString("en-UG", { maximumFractionDigits: 2 });

const InventoryBatchesReport = () => {
  const { toast } = useToast();
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defMonth = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
  const [month, setMonth] = useState(defMonth);
  const [from, setFrom] = useState(monthRange(defMonth).from);
  const [to, setTo] = useState(monthRange(defMonth).to);
  const [status, setStatus] = useState("all");
  const [coffee, setCoffee] = useState("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const pickMonth = (ym: string) => { setMonth(ym); if (ym) { const r = monthRange(ym); setFrom(r.from); setTo(r.to); } };

  const load = async () => {
    setLoading(true);
    try {
      const batches: any[] = [];
      for (let p = 0; ; p++) {
        const { data, error } = await supabase.from("inventory_batches")
          .select("id,batch_code,batch_date,coffee_type,status,total_kilograms,remaining_kilograms,sold_out_at")
          .gte("batch_date", from).lte("batch_date", `${to}T23:59:59.999`)
          .order("batch_date", { ascending: true }).range(p * 1000, p * 1000 + 999);
        if (error) throw error;
        batches.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      const src: Record<string, { n: number; names: Set<string> }> = {};
      const ids = batches.map((b) => b.id);
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await (supabase.from("inventory_batch_sources") as any)
          .select("batch_id,supplier_name").in("batch_id", ids.slice(i, i + 200));
        if (error) throw error;
        (data || []).forEach((s: any) => {
          const e = (src[s.batch_id] ||= { n: 0, names: new Set() });
          e.n++; if (s.supplier_name) e.names.add(s.supplier_name);
        });
      }
      setRows(batches.map((b) => {
        const total = Number(b.total_kilograms) || 0, remaining = Number(b.remaining_kilograms) || 0;
        const s = src[b.id];
        return {
          id: b.id, code: b.batch_code || "", date: b.batch_date || "", coffeeType: b.coffee_type || "",
          status: (b.status || "").toLowerCase(), total, remaining, sold: Math.max(0, total - remaining),
          deliveries: s?.n || 0, suppliers: s ? [...s.names].join(", ") : "",
          soldOut: b.sold_out_at ? String(b.sold_out_at).slice(0, 10) : "",
        };
      }));
      setLoaded(true);
    } catch (e: any) {
      toast({ title: "Could not load batches", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status).filter(Boolean))].sort(), [rows]);
  const coffees = useMemo(() => [...new Set(rows.map((r) => r.coffeeType).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (status === "all" || r.status === status) && (coffee === "all" || r.coffeeType === coffee) &&
      (!q || r.code.toLowerCase().includes(q) || r.suppliers.toLowerCase().includes(q)));
  }, [rows, status, coffee, search]);
  const t = filtered.reduce((a, r) => ({ total: a.total + r.total, sold: a.sold + r.sold, remaining: a.remaining + r.remaining }), { total: 0, sold: 0, remaining: 0 });

  const print = async () => {
    const w = window.open("", "_blank");
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14); doc.text("Great Agro Coffee — Inventory Batches Report", 14, 14);
      doc.setFontSize(9);
      doc.text(`Period: ${from} to ${to}${status !== "all" ? `   Status: ${status}` : ""}${coffee !== "all" ? `   Coffee: ${coffee}` : ""}${search ? `   Filter: ${search}` : ""}`, 14, 20);
      doc.text(`Batches: ${filtered.length}   Total kg: ${fmt(t.total)}   Out of batch: ${fmt(t.sold)}   Remaining: ${fmt(t.remaining)}`, 14, 25);
      autoTable(doc, {
        startY: 29,
        head: [["Date", "Batch", "Coffee", "Total kg", "Out kg", "Remaining kg", "Deliveries", "Suppliers", "Status", "Sold out"]],
        body: filtered.map((r) => [r.date, r.code, r.coffeeType, fmt(r.total), fmt(r.sold), fmt(r.remaining), r.deliveries, r.suppliers, r.status, r.soldOut]),
        foot: [["", "Total", "", fmt(t.total), fmt(t.sold), fmt(t.remaining), "", "", "", ""]],
        styles: { fontSize: 7, cellPadding: 1.2 }, headStyles: { fillColor: [60, 60, 60] },
        columnStyles: { 7: { cellWidth: 70 } }, margin: { bottom: 30 },
      });
      await preparePdfPrint(doc, `Inventory batches ${from} to ${to}`);
      const url = URL.createObjectURL(doc.output("blob"));
      if (w) { w.location.href = url; setTimeout(() => { try { w.print(); } catch {} }, 1200); } else window.open(url, "_blank");
    } catch (e: any) {
      w?.close();
      toast({ title: "Could not print", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Batches Report</CardTitle>
        <CardDescription>Stock batches created in a period with kilograms in, taken out, remaining, the deliveries they came from, and status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div><Label>Month</Label><Input type="month" value={month} onChange={(e) => pickMonth(e.target.value)} /></div>
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setMonth(""); }} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setMonth(""); }} /></div>
          <Button onClick={load} disabled={loading || !from || !to}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}Load batches
          </Button>
        </div>
        {loaded && (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <Input className="max-w-xs" placeholder="Search batch or supplier" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={coffee} onValueChange={setCoffee}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All coffee</SelectItem>{coffees.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{filtered.length} batches · {fmt(t.total)} kg in · {fmt(t.remaining)} kg left</span>
              <Button variant="outline" onClick={print} disabled={!filtered.length} className="ml-auto"><Printer className="h-4 w-4 mr-2" />Print</Button>
            </div>
            <div className="overflow-auto max-h-[500px] border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>{["Date", "Batch", "Coffee", "Total kg", "Out kg", "Remaining kg", "Deliveries", "Suppliers", "Status", "Sold out"].map((h) => <th key={h} className="text-left p-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{r.date}</td><td className="p-2">{r.code}</td><td className="p-2">{r.coffeeType}</td>
                      <td className="p-2 text-right">{fmt(r.total)}</td><td className="p-2 text-right">{fmt(r.sold)}</td><td className="p-2 text-right">{fmt(r.remaining)}</td>
                      <td className="p-2 text-right">{r.deliveries}</td><td className="p-2">{r.suppliers}</td><td className="p-2">{r.status}</td><td className="p-2">{r.soldOut}</td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">No batches in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryBatchesReport;
