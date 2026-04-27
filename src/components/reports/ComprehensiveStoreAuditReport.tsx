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
  assessed_by: string | null;
  date_assessed: string | null;
  is_discretion: boolean;
  discretion_by: string | null;
  discretion_notes: string | null;
  quality_status: string | null;
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
        .select("id, date, batch_number, supplier_name, coffee_type, bags, kilograms, status, discretion_bought")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (coffeeType !== "all") q = q.eq("coffee_type", coffeeType);
      if (supplierFilter.trim()) q = q.ilike("supplier_name", `%${supplierFilter.trim()}%`);

      const { data: records, error } = await q;
      if (error) throw error;

      // Fetch matching quality assessment final prices in one go
      const batches = (records || []).map(r => r.batch_number).filter(Boolean);
      let qaMap = new Map<string, any>();
      if (batches.length) {
        const { data: qa } = await supabase
          .from("quality_assessments")
          .select("batch_number, final_price, suggested_price, admin_discretion_price, admin_discretion_buy, admin_discretion_by, admin_discretion_notes, assessed_by, date_assessed, status")
          .in("batch_number", batches);
        (qa || []).forEach((a: any) => qaMap.set(a.batch_number, a));
      }

      const enriched: DeliveryRow[] = (records || []).map((r: any) => {
        const a = qaMap.get(r.batch_number);
        const isDiscretion = !!(r.discretion_bought || a?.admin_discretion_buy);
        const price = isDiscretion
          ? (a?.admin_discretion_price ?? a?.final_price ?? a?.suggested_price ?? null)
          : (a?.final_price ?? a?.suggested_price ?? null);
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
          final_price: price ? Number(price) : null,
          total_value: price ? price * kg : 0,
          assessed_by: a?.assessed_by ?? null,
          date_assessed: a?.date_assessed ?? null,
          is_discretion: isDiscretion,
          discretion_by: a?.admin_discretion_by ?? null,
          discretion_notes: a?.admin_discretion_notes ?? null,
          quality_status: a?.status ?? null,
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
    const discretionRows = rows.filter(r => r.is_discretion);
    const discretionKg = discretionRows.reduce((s, r) => s + r.kilograms, 0);
    const discretionValue = discretionRows.reduce((s, r) => s + r.total_value, 0);
    const byType = rows.reduce((acc: Record<string, { kg: number; value: number; bags: number }>, r) => {
      const k = r.coffee_type || "Unknown";
      acc[k] = acc[k] || { kg: 0, value: 0, bags: 0 };
      acc[k].kg += r.kilograms;
      acc[k].value += r.total_value;
      acc[k].bags += r.bags;
      return acc;
    }, {});
    const byAssessor = rows.reduce((acc: Record<string, { kg: number; value: number; lots: number }>, r) => {
      const k = r.assessed_by || "Not Assessed";
      acc[k] = acc[k] || { kg: 0, value: 0, lots: 0 };
      acc[k].kg += r.kilograms;
      acc[k].value += r.total_value;
      acc[k].lots += 1;
      return acc;
    }, {});
    return { totalKg, totalBags, totalValue, avgPrice, uniqueSuppliers, byType, byAssessor,
      discretionCount: discretionRows.length, discretionKg, discretionValue };
  }, [rows]);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return;
    const fmt = (n: number) => n.toLocaleString("en-UG", { maximumFractionDigits: 2 });
    const html = `<!doctype html><html><head><title>Store Audit Report</title>
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: Arial, sans-serif; color: #111; font-size: 11px; }
        .header-row { display:flex; align-items:center; justify-content:space-between; padding-bottom:8px; border-bottom:3px double #000; }
        .logo-block { background:#0d3d1f; padding:6px 12px; border-radius:4px; flex-shrink:0; }
        .logo-block img { height:42px; width:auto; display:block; }
        .company-block { text-align:center; flex:1; padding:0 12px; }
        .company-name { font-size:18px; font-weight:900; letter-spacing:1.5px; margin:0; }
        .company-sub { font-size:9px; margin:1px 0; }
        .doc-meta { text-align:right; font-size:9px; flex-shrink:0; }
        .title-bar { background:#0d3d1f; color:#fff; text-align:center; padding:6px 0; margin-top:8px; border-radius:3px; font-weight:bold; letter-spacing:1px; }
        h2 { font-size:13px; color:#0d3d1f; border-bottom:1px solid #d1d5db; padding-bottom:4px; margin-top:14px;}
        .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:10px 0;}
        .stat { border:1px solid #e5e7eb; border-radius:6px; padding:8px;}
        .stat .label { font-size:9px; color:#6b7280; text-transform:uppercase;}
        .stat .val { font-size:14px; font-weight:bold; color:#111;}
        table { width:100%; border-collapse:collapse; margin-top:8px;}
        th, td { border:1px solid #d1d5db; padding:5px 6px; text-align:left;}
        th { background:#0d3d1f; color:#fff; font-size:10px;}
        tbody tr:nth-child(even){ background:#f9fafb;}
        tr.discretion { background:#fff7ed !important; }
        .badge { display:inline-block; padding:1px 5px; border-radius:3px; font-size:8px; font-weight:bold; }
        .badge-disc { background:#dc2626; color:#fff; }
        tfoot td { font-weight:bold; background:#f3f4f6;}
        .right { text-align:right;}
        .footer { margin-top:24px; border-top:1px solid #d1d5db; padding-top:8px; font-size:9px; color:#6b7280; display:flex; justify-content:space-between;}
        .sig { margin-top:30px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:30px;}
        .sig div { border-top:1px solid #111; padding-top:4px; text-align:center; font-size:10px;}
      </style></head><body>
      <div class="header-row">
        <div class="logo-block">
          <img src="${window.location.origin}/lovable-uploads/great-agro-coffee-logo.png" alt="Logo" />
        </div>
        <div class="company-block">
          <h1 class="company-name">GREAT AGRO COFFEE LTD</h1>
          <p class="company-sub">Kasese, Uganda.</p>
          <p class="company-sub">Tel: +256 393 001 626 | Email: info@greatpearlcoffee.com</p>
          <p class="company-sub">UCDA Licensed</p>
        </div>
        <div class="doc-meta">
          <strong>STORE AUDIT</strong><br/>
          Period: <b>${startDate}</b> to <b>${endDate}</b><br/>
          Generated: ${format(new Date(), "PPpp")}<br/>
          ${coffeeType !== "all" ? `Type filter: ${coffeeType}<br/>` : ""}
          ${supplierFilter ? `Supplier: ${supplierFilter}<br/>` : ""}
        </div>
      </div>
      <div class="title-bar">COMPREHENSIVE STORE AUDIT REPORT</div>

      <h2>Summary</h2>
      <div class="grid">
        <div class="stat"><div class="label">Total Deliveries</div><div class="val">${rows.length}</div></div>
        <div class="stat"><div class="label">Total Weight (kg)</div><div class="val">${fmt(stats.totalKg)}</div></div>
        <div class="stat"><div class="label">Total Bags</div><div class="val">${fmt(stats.totalBags)}</div></div>
        <div class="stat"><div class="label">Unique Suppliers</div><div class="val">${stats.uniqueSuppliers}</div></div>
        <div class="stat"><div class="label">Avg Buying Price (UGX/kg)</div><div class="val">${fmt(stats.avgPrice)}</div></div>
        <div class="stat"><div class="label">Total Procurement Value (UGX)</div><div class="val">${fmt(stats.totalValue)}</div></div>
        <div class="stat"><div class="label">Discretionary Lots</div><div class="val">${stats.discretionCount}</div></div>
        <div class="stat"><div class="label">Discretionary Value (UGX)</div><div class="val">${fmt(stats.discretionValue)}</div></div>
      </div>

      <h2>Breakdown by Coffee Type</h2>
      <table><thead><tr><th>Type</th><th class="right">Bags</th><th class="right">Kilograms</th><th class="right">Total Value (UGX)</th><th class="right">Avg Price (UGX/kg)</th></tr></thead>
      <tbody>
        ${Object.entries(stats.byType).map(([t, v]) => `
          <tr><td>${t}</td><td class="right">${fmt(v.bags)}</td><td class="right">${fmt(v.kg)}</td><td class="right">${fmt(v.value)}</td><td class="right">${fmt(v.kg ? v.value/v.kg : 0)}</td></tr>
        `).join("")}
      </tbody></table>

      <h2>Quality Assessment Accountability (by Assessor)</h2>
      <table><thead><tr><th>Assessed By</th><th class="right">Lots</th><th class="right">Kilograms</th><th class="right">Total Value (UGX)</th></tr></thead>
      <tbody>
        ${Object.entries(stats.byAssessor).map(([k, v]) => `
          <tr><td>${k}</td><td class="right">${v.lots}</td><td class="right">${fmt(v.kg)}</td><td class="right">${fmt(v.value)}</td></tr>
        `).join("")}
      </tbody></table>

      <h2>Detailed Delivery Records</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Date</th><th>Batch</th><th>Supplier</th><th>Type</th>
          <th class="right">Bags</th><th class="right">Kg</th><th class="right">Price/kg</th><th class="right">Value (UGX)</th>
          <th>Assessed By</th><th>Notes</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr class="${r.is_discretion ? 'discretion' : ''}">
              <td>${i+1}</td><td>${r.date}</td><td>${r.batch_number}</td>
              <td>${r.supplier_name}</td><td>${r.coffee_type}</td>
              <td class="right">${fmt(r.bags)}</td>
              <td class="right">${fmt(r.kilograms)}</td>
              <td class="right">${r.final_price ? fmt(r.final_price) : "—"}</td>
              <td class="right">${r.total_value ? fmt(r.total_value) : "—"}</td>
              <td>${r.assessed_by || "—"}</td>
              <td>${r.is_discretion ? `<span class="badge badge-disc">DISCRETION</span> ${r.discretion_by ? 'by ' + r.discretion_by : ''}${r.discretion_notes ? ' — ' + r.discretion_notes : ''}` : (r.status || '')}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot><tr>
          <td colspan="5">TOTALS</td>
          <td class="right">${fmt(stats.totalBags)}</td>
          <td class="right">${fmt(stats.totalKg)}</td>
          <td class="right">${fmt(stats.avgPrice)}</td>
          <td class="right">${fmt(stats.totalValue)}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>

      ${stats.discretionCount > 0 ? `
      <h2>Discretionary Purchases (Rejected Lots Bought at Admin Discretion)</h2>
      <table>
        <thead><tr><th>Date</th><th>Batch</th><th>Supplier</th><th>Type</th><th class="right">Kg</th><th class="right">Disc. Price</th><th class="right">Value</th><th>Approved By</th><th>Reason / Notes</th></tr></thead>
        <tbody>
          ${rows.filter(r => r.is_discretion).map(r => `
            <tr class="discretion">
              <td>${r.date}</td><td>${r.batch_number}</td><td>${r.supplier_name}</td><td>${r.coffee_type}</td>
              <td class="right">${fmt(r.kilograms)}</td>
              <td class="right">${r.final_price ? fmt(r.final_price) : '—'}</td>
              <td class="right">${fmt(r.total_value)}</td>
              <td>${r.discretion_by || '—'}</td>
              <td>${r.discretion_notes || '—'}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>` : ''}

      <div class="sig">
        <div>Prepared By (Store)</div>
        <div>Verified By (Audit)</div>
        <div>Approved By (Management)</div>
      </div>

      <div class="footer">
        <span>Great Agro Coffee Ltd · Confidential Audit Document</span>
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
                    <th className="p-2 text-left">Assessed By</th>
                    <th className="p-2 text-left">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className={`border-t ${r.is_discretion ? 'bg-orange-50' : ''}`}>
                      <td className="p-2">{r.date}</td>
                      <td className="p-2 font-mono text-xs">{r.batch_number}</td>
                      <td className="p-2">{r.supplier_name}</td>
                      <td className="p-2">{r.coffee_type}</td>
                      <td className="p-2 text-right">{r.bags}</td>
                      <td className="p-2 text-right">{r.kilograms.toLocaleString()}</td>
                      <td className="p-2 text-right">{r.final_price ? r.final_price.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right">{r.total_value ? Math.round(r.total_value).toLocaleString() : "—"}</td>
                      <td className="p-2 text-xs">{r.assessed_by || "—"}</td>
                      <td className="p-2 text-xs">{r.is_discretion ? <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">DISCRETION</span> : (r.quality_status || "")}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">No deliveries in this period.</td></tr>
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