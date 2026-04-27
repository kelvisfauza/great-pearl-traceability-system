import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Search, FileText, Package, Scale, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DeliveryRow {
  id: string;
  date: string;
  batch_number: string;
  supplier_name: string;
  coffee_type: string;
  bags: number;
  kilograms: number;
  status: string;
  final_price: number | null;
  total_value: number;
}

const ComprehensiveStoreAuditReport = () => {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [coffeeType, setCoffeeType] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [generated, setGenerated] = useState(false);

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Pick a date range", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Fetch deliveries
      let q = supabase
        .from("coffee_records")
        .select("id, date, batch_number, supplier_name, coffee_type, bags, kilograms, status")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (coffeeType !== "all") q = q.eq("coffee_type", coffeeType);
      if (supplierFilter.trim()) q = q.ilike("supplier_name", `%${supplierFilter.trim()}%`);

      const { data: records, error } = await q;
      if (error) throw error;

      // Fetch matching quality assessment final prices in one go
      const batches = (records || []).map(r => r.batch_number).filter(Boolean);
      let priceMap = new Map<string, number>();
      if (batches.length) {
        const { data: qa } = await supabase
          .from("quality_assessments")
          .select("batch_number, final_price, suggested_price")
          .in("batch_number", batches);
        (qa || []).forEach((a: any) => {
          const p = a.final_price ?? a.suggested_price ?? 0;
          if (p) priceMap.set(a.batch_number, Number(p));
        });
      }

      const enriched: DeliveryRow[] = (records || []).map((r: any) => {
        const price = priceMap.get(r.batch_number) ?? null;
        const kg = Number(r.kilograms || 0);
        return {
          id: r.id,
          date: r.date,
          batch_number: r.batch_number,
          supplier_name: r.supplier_name,
          coffee_type: r.coffee_type,
          bags: Number(r.bags || 0),
          kilograms: kg,
          status: r.status,
          final_price: price,
          total_value: price ? price * kg : 0,
        };
      });

      setRows(enriched);
      setGenerated(true);
      toast({ title: "Report generated", description: `${enriched.length} delivery records loaded.` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to generate", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalKg = rows.reduce((s, r) => s + r.kilograms, 0);
    const totalBags = rows.reduce((s, r) => s + r.bags, 0);
    const totalValue = rows.reduce((s, r) => s + r.total_value, 0);
    const pricedKg = rows.filter(r => r.final_price).reduce((s, r) => s + r.kilograms, 0);
    const avgPrice = pricedKg > 0 ? totalValue / pricedKg : 0;
    const uniqueSuppliers = new Set(rows.map(r => r.supplier_name)).size;
    const byType = rows.reduce((acc: Record<string, { kg: number; value: number; bags: number }>, r) => {
      const k = r.coffee_type || "Unknown";
      acc[k] = acc[k] || { kg: 0, value: 0, bags: 0 };
      acc[k].kg += r.kilograms;
      acc[k].value += r.total_value;
      acc[k].bags += r.bags;
      return acc;
    }, {});
    return { totalKg, totalBags, totalValue, avgPrice, uniqueSuppliers, byType };
  }, [rows]);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return;
    const fmt = (n: number) => n.toLocaleString("en-UG", { maximumFractionDigits: 2 });
    const html = `<!doctype html><html><head><title>Store Audit Report</title>
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: Arial, sans-serif; color: #111; font-size: 11px; }
        .header { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #166534; padding-bottom:10px; margin-bottom:14px;}
        .brand h1 { margin:0; font-size:20px; color:#166534;}
        .brand p { margin:2px 0; font-size:10px; color:#555;}
        .meta { text-align:right; font-size:10px;}
        h2 { font-size:14px; color:#166534; border-bottom:1px solid #d1d5db; padding-bottom:4px; margin-top:18px;}
        .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:10px 0;}
        .stat { border:1px solid #e5e7eb; border-radius:6px; padding:8px;}
        .stat .label { font-size:9px; color:#6b7280; text-transform:uppercase;}
        .stat .val { font-size:14px; font-weight:bold; color:#111;}
        table { width:100%; border-collapse:collapse; margin-top:8px;}
        th, td { border:1px solid #d1d5db; padding:5px 6px; text-align:left;}
        th { background:#166534; color:#fff; font-size:10px;}
        tbody tr:nth-child(even){ background:#f9fafb;}
        tfoot td { font-weight:bold; background:#f3f4f6;}
        .right { text-align:right;}
        .footer { margin-top:24px; border-top:1px solid #d1d5db; padding-top:8px; font-size:9px; color:#6b7280; display:flex; justify-content:space-between;}
        .sig { margin-top:30px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:30px;}
        .sig div { border-top:1px solid #111; padding-top:4px; text-align:center; font-size:10px;}
      </style></head><body>
      <div class="header">
        <div class="brand">
          <h1>GREAT PEARL COFFEE FACTORY</h1>
          <p>Plot 123, Industrial Area, Kampala — Uganda</p>
          <p>Tel: +256 781 121 639 · info@greatpearlcoffee.com</p>
        </div>
        <div class="meta">
          <strong>COMPREHENSIVE STORE AUDIT REPORT</strong><br/>
          Period: <b>${startDate}</b> to <b>${endDate}</b><br/>
          Generated: ${format(new Date(), "PPpp")}<br/>
          ${coffeeType !== "all" ? `Type filter: ${coffeeType}<br/>` : ""}
          ${supplierFilter ? `Supplier: ${supplierFilter}<br/>` : ""}
        </div>
      </div>

      <h2>Summary</h2>
      <div class="grid">
        <div class="stat"><div class="label">Total Deliveries</div><div class="val">${rows.length}</div></div>
        <div class="stat"><div class="label">Total Weight (kg)</div><div class="val">${fmt(stats.totalKg)}</div></div>
        <div class="stat"><div class="label">Total Bags</div><div class="val">${fmt(stats.totalBags)}</div></div>
        <div class="stat"><div class="label">Unique Suppliers</div><div class="val">${stats.uniqueSuppliers}</div></div>
        <div class="stat"><div class="label">Avg Buying Price (UGX/kg)</div><div class="val">${fmt(stats.avgPrice)}</div></div>
        <div class="stat"><div class="label">Total Procurement Value (UGX)</div><div class="val">${fmt(stats.totalValue)}</div></div>
        <div class="stat"><div class="label">Coffee Types</div><div class="val">${Object.keys(stats.byType).length}</div></div>
        <div class="stat"><div class="label">Period (days)</div><div class="val">${Math.max(1, Math.ceil((+new Date(endDate) - +new Date(startDate))/86400000)+1)}</div></div>
      </div>

      <h2>Breakdown by Coffee Type</h2>
      <table><thead><tr><th>Type</th><th class="right">Bags</th><th class="right">Kilograms</th><th class="right">Total Value (UGX)</th><th class="right">Avg Price (UGX/kg)</th></tr></thead>
      <tbody>
        ${Object.entries(stats.byType).map(([t, v]) => `
          <tr><td>${t}</td><td class="right">${fmt(v.bags)}</td><td class="right">${fmt(v.kg)}</td><td class="right">${fmt(v.value)}</td><td class="right">${fmt(v.kg ? v.value/v.kg : 0)}</td></tr>
        `).join("")}
      </tbody></table>

      <h2>Detailed Delivery Records</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Date</th><th>Batch</th><th>Supplier</th><th>Type</th>
          <th class="right">Bags</th><th class="right">Kg</th><th class="right">Price/kg</th><th class="right">Value (UGX)</th><th>Status</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td>${i+1}</td><td>${r.date}</td><td>${r.batch_number}</td>
              <td>${r.supplier_name}</td><td>${r.coffee_type}</td>
              <td class="right">${fmt(r.bags)}</td>
              <td class="right">${fmt(r.kilograms)}</td>
              <td class="right">${r.final_price ? fmt(r.final_price) : "—"}</td>
              <td class="right">${r.total_value ? fmt(r.total_value) : "—"}</td>
              <td>${r.status}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot><tr>
          <td colspan="5">TOTALS</td>
          <td class="right">${fmt(stats.totalBags)}</td>
          <td class="right">${fmt(stats.totalKg)}</td>
          <td class="right">${fmt(stats.avgPrice)}</td>
          <td class="right">${fmt(stats.totalValue)}</td>
          <td></td>
        </tr></tfoot>
      </table>

      <div class="sig">
        <div>Prepared By (Store)</div>
        <div>Verified By (Audit)</div>
        <div>Approved By (Management)</div>
      </div>

      <div class="footer">
        <span>Great Pearl Coffee Factory · Confidential Audit Document</span>
        <span>Page 1 · Generated by System</span>
      </div>
      <script>window.onload = () => { window.print(); }</script>
      </body></html>`;
    w.document.write(html);
    w.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Comprehensive Store Audit Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>Coffee Type</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={coffeeType}
              onChange={e => setCoffeeType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="Arabica">Arabica</option>
              <option value="Robusta">Robusta</option>
              <option value="Drugar">Drugar</option>
              <option value="Wugar">Wugar</option>
            </select>
          </div>
          <div>
            <Label>Supplier (optional)</Label>
            <Input placeholder="Search supplier..." value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={fetchReport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Generate Report
          </Button>
          {generated && (
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" /> Print Audit Report
            </Button>
          )}
        </div>

        {generated && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <StatBox icon={<Package className="h-4 w-4" />} label="Deliveries" value={rows.length.toString()} />
              <StatBox icon={<Scale className="h-4 w-4" />} label="Total Kg" value={stats.totalKg.toLocaleString()} />
              <StatBox icon={<TrendingUp className="h-4 w-4" />} label="Avg Price (UGX/kg)" value={Math.round(stats.avgPrice).toLocaleString()} />
              <StatBox icon={<Wallet className="h-4 w-4" />} label="Total Value (UGX)" value={Math.round(stats.totalValue).toLocaleString()} />
            </div>

            <div className="border rounded-lg overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Batch</th>
                    <th className="p-2 text-left">Supplier</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-right">Bags</th>
                    <th className="p-2 text-right">Kg</th>
                    <th className="p-2 text-right">Price/kg</th>
                    <th className="p-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.date}</td>
                      <td className="p-2 font-mono text-xs">{r.batch_number}</td>
                      <td className="p-2">{r.supplier_name}</td>
                      <td className="p-2">{r.coffee_type}</td>
                      <td className="p-2 text-right">{r.bags}</td>
                      <td className="p-2 text-right">{r.kilograms.toLocaleString()}</td>
                      <td className="p-2 text-right">{r.final_price ? r.final_price.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right">{r.total_value ? Math.round(r.total_value).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No deliveries in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const StatBox = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
    <div className="text-lg font-bold mt-1">{value}</div>
  </div>
);

export default ComprehensiveStoreAuditReport;