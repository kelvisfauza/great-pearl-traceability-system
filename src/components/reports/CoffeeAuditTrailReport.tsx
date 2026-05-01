import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer, Search, GitBranch, Package, ShoppingCart, ArrowRight, Store, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SaleLeg {
  sale_id: string;
  sale_date: string | null;
  customer: string;
  kilograms_deducted: number;
  unit_price: number | null;
  total_amount: number | null;
  contract_ref: string | null;
  buyer_contract_price: number | null;
  contract_allocated_by: string | null;
}

interface SourceLeg {
  coffee_record_id: string;
  supplier_name: string;
  purchase_date: string | null;
  kilograms: number;
  buying_price: number | null;
  source_value: number;
  assessed_by: string | null;
  received_by: string | null;
  is_discretion: boolean;
  batch_number: string | null;
  quality: {
    moisture: number | null;
    group1_defects: number | null;
    group2_defects: number | null;
    below12: number | null;
    pods: number | null;
    husks: number | null;
    stones: number | null;
    fm: number | null;
    clean_d14: number | null;
    outturn: number | null;
    outturn_price: number | null;
    suggested_price: number | null;
    final_price: number | null;
    status: string | null;
    quality_note: string | null;
    comments: string | null;
    date_assessed: string | null;
  } | null;
}

interface BatchTrail {
  batch_id: string;
  batch_code: string;
  coffee_type: string;
  batch_date: string;
  total_kilograms: number;
  remaining_kilograms: number;
  status: string;
  sold_kg: number;
  sources: SourceLeg[];
  sales: SaleLeg[];
  movements: Array<{ created_at: string; movement_type: string; quantity_kg: number; created_by: string | null; notes: string | null }>;
  avg_buying_price: number;
  avg_selling_price: number;
  total_cost: number;
  total_revenue: number;
  margin: number;
}

const CoffeeAuditTrailReport = () => {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  // Default to last 90 days so users immediately see existing batches/sales
  const defaultStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  })();

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [coffeeType, setCoffeeType] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [trails, setTrails] = useState<BatchTrail[]>([]);
  const [generated, setGenerated] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Pick a date range", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch batches that intersect the date range:
      //    a) batch_date falls in range, OR
      //    b) batch had a sale/movement in range
      const endIso = endDate + "T23:59:59";
      const [batchesByDateRes, salesInRangeRes, movesInRangeRes] = await Promise.all([
        (() => {
          let q = supabase
            .from("inventory_batches")
            .select("id, batch_code, coffee_type, batch_date, total_kilograms, remaining_kilograms, status")
            .gte("batch_date", startDate)
            .lte("batch_date", endDate);
          if (coffeeType !== "all") q = q.eq("coffee_type", coffeeType);
          if (batchFilter.trim()) q = q.ilike("batch_code", `%${batchFilter.trim()}%`);
          return q;
        })(),
        supabase.from("inventory_batch_sales")
          .select("batch_id")
          .gte("sale_date", startDate)
          .lte("sale_date", endDate),
        supabase.from("inventory_movements")
          .select("reference_id, reference_type")
          .gte("created_at", startDate)
          .lte("created_at", endIso)
          .eq("reference_type", "batch"),
      ]);
      if (batchesByDateRes.error) throw batchesByDateRes.error;

      const extraIds = new Set<string>();
      (salesInRangeRes.data || []).forEach((s: any) => s.batch_id && extraIds.add(s.batch_id));
      (movesInRangeRes.data || []).forEach((m: any) => m.reference_id && extraIds.add(m.reference_id));
      const knownIds = new Set((batchesByDateRes.data || []).map((b: any) => b.id));
      const missingIds = [...extraIds].filter(id => !knownIds.has(id));

      let extraBatches: any[] = [];
      if (missingIds.length > 0) {
        let q = supabase
          .from("inventory_batches")
          .select("id, batch_code, coffee_type, batch_date, total_kilograms, remaining_kilograms, status")
          .in("id", missingIds);
        if (coffeeType !== "all") q = q.eq("coffee_type", coffeeType);
        if (batchFilter.trim()) q = q.ilike("batch_code", `%${batchFilter.trim()}%`);
        const { data, error: extraErr } = await q;
        if (extraErr) throw extraErr;
        extraBatches = data || [];
      }

      const batches = [...(batchesByDateRes.data || []), ...extraBatches]
        .sort((a, b) => (b.batch_date || "").localeCompare(a.batch_date || ""));
      const batchIds = batches.map((b: any) => b.id);
      if (batchIds.length === 0) {
        setTrails([]);
        setGenerated(true);
        toast({ title: "No batches", description: "No batches match the filters." });
        return;
      }

      // 2. Fetch sources, sales, movements in parallel
      const [srcRes, salesLinkRes, movesRes] = await Promise.all([
        supabase.from("inventory_batch_sources")
          .select("batch_id, coffee_record_id, kilograms, supplier_name, purchase_date")
          .in("batch_id", batchIds),
        supabase.from("inventory_batch_sales")
          .select("batch_id, sale_transaction_id, kilograms_deducted, customer_name, sale_date")
          .in("batch_id", batchIds),
        supabase.from("inventory_movements")
          .select("created_at, movement_type, quantity_kg, created_by, notes, reference_id, reference_type, coffee_record_id")
          .gte("created_at", startDate)
          .lte("created_at", endDate + "T23:59:59")
          .order("created_at", { ascending: true }),
      ]);

      const sources = srcRes.data || [];
      const salesLinks = salesLinkRes.data || [];
      const allMoves = movesRes.data || [];

      // 3. Enrich sources with coffee_records (assessor / received_by) + quality_assessments price
      const recordIds = [...new Set(sources.map(s => s.coffee_record_id).filter(Boolean))];
      const [crRes, qaRes] = await Promise.all([
        recordIds.length ? supabase.from("coffee_records")
          .select("id, batch_number, created_by, supplier_name, discretion_bought")
          .in("id", recordIds) : Promise.resolve({ data: [] as any[] }),
        Promise.resolve({ data: [] as any[] }),
      ]);
      const crMap = new Map<string, any>();
      (crRes.data || []).forEach((r: any) => crMap.set(r.id, r));
      const batchNums = [...new Set((crRes.data || []).map((r: any) => r.batch_number).filter(Boolean))];
      const qaData = batchNums.length ? (await supabase.from("quality_assessments")
        .select("batch_number, final_price, suggested_price, admin_discretion_price, admin_discretion_buy, assessed_by, moisture, group1_defects, group2_defects, below12, pods, husks, stones, fm, clean_d14, outturn, outturn_price, status, quality_note, comments, date_assessed")
        .in("batch_number", batchNums)).data || [] : [];
      const qaMap = new Map<string, any>();
      qaData.forEach((q: any) => qaMap.set(q.batch_number, q));

      // 4. Enrich sales with sales_transactions + contract_allocations
      const saleIds = [...new Set(salesLinks.map(s => s.sale_transaction_id).filter(Boolean))];
      const [stRes, allocRes] = await Promise.all([
        saleIds.length ? supabase.from("sales_transactions")
          .select("id, date, customer, unit_price, total_amount, weight, driver_details, truck_details") : Promise.resolve({ data: [] as any[] }),
        saleIds.length ? supabase.from("contract_allocations")
          .select("sale_id, contract_id, allocated_kg, allocated_by, notes")
          .in("sale_id", saleIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const stMap = new Map<string, any>();
      (stRes.data || []).filter((s: any) => saleIds.includes(s.id)).forEach((s: any) => stMap.set(s.id, s));
      const allocs = allocRes.data || [];
      const contractIds = [...new Set(allocs.map((a: any) => a.contract_id).filter(Boolean))];
      const contractsData = contractIds.length ? (await supabase.from("buyer_contracts")
        .select("id, contract_ref, buyer_name, price_per_kg")
        .in("id", contractIds)).data || [] : [];
      const contractMap = new Map<string, any>();
      contractsData.forEach((c: any) => contractMap.set(c.id, c));
      const allocBySale = new Map<string, any>();
      allocs.forEach((a: any) => allocBySale.set(a.sale_id, a));

      // 5. Build trails
      const built: BatchTrail[] = (batches || []).map((b: any) => {
        const bSources = sources.filter(s => s.batch_id === b.id).map((s: any): SourceLeg => {
          const cr = crMap.get(s.coffee_record_id);
          const qa = cr ? qaMap.get(cr.batch_number) : null;
          const isDisc = !!(cr?.discretion_bought || qa?.admin_discretion_buy);
          const price = isDisc
            ? (qa?.admin_discretion_price ?? qa?.final_price ?? qa?.suggested_price ?? null)
            : (qa?.final_price ?? qa?.suggested_price ?? null);
          const kg = Number(s.kilograms || 0);
          return {
            coffee_record_id: s.coffee_record_id,
            supplier_name: s.supplier_name || cr?.supplier_name || "—",
            purchase_date: s.purchase_date,
            kilograms: kg,
            buying_price: price ? Number(price) : null,
            source_value: price ? Number(price) * kg : 0,
            assessed_by: qa?.assessed_by || null,
            received_by: cr?.created_by || null,
            is_discretion: isDisc,
            batch_number: cr?.batch_number || null,
            quality: qa ? {
              moisture: qa.moisture ?? null,
              group1_defects: qa.group1_defects ?? null,
              group2_defects: qa.group2_defects ?? null,
              below12: qa.below12 ?? null,
              pods: qa.pods ?? null,
              husks: qa.husks ?? null,
              stones: qa.stones ?? null,
              fm: qa.fm ?? null,
              clean_d14: qa.clean_d14 ?? null,
              outturn: qa.outturn ?? null,
              outturn_price: qa.outturn_price ?? null,
              suggested_price: qa.suggested_price ?? null,
              final_price: qa.final_price ?? null,
              status: qa.status ?? null,
              quality_note: qa.quality_note ?? null,
              comments: qa.comments ?? null,
              date_assessed: qa.date_assessed ?? null,
            } : null,
          };
        });

        const bSales = salesLinks.filter(s => s.batch_id === b.id).map((s: any): SaleLeg => {
          const st = stMap.get(s.sale_transaction_id);
          const alloc = allocBySale.get(s.sale_transaction_id);
          const contract = alloc ? contractMap.get(alloc.contract_id) : null;
          return {
            sale_id: s.sale_transaction_id,
            sale_date: s.sale_date || st?.date || null,
            customer: s.customer_name || st?.customer || "—",
            kilograms_deducted: Number(s.kilograms_deducted || 0),
            unit_price: st?.unit_price ? Number(st.unit_price) : null,
            total_amount: st?.total_amount ? Number(st.total_amount) : null,
            contract_ref: contract?.contract_ref || null,
            buyer_contract_price: contract?.price_per_kg ? Number(contract.price_per_kg) : null,
            contract_allocated_by: alloc?.allocated_by || null,
          };
        });

        const bMoves = allMoves
          .filter((m: any) => m.reference_id === b.id || m.reference_type === 'batch' || bSources.some(src => src.coffee_record_id === m.coffee_record_id))
          .map((m: any) => ({
            created_at: m.created_at,
            movement_type: m.movement_type,
            quantity_kg: Number(m.quantity_kg || 0),
            created_by: m.created_by,
            notes: m.notes,
          }));

        const totalSrcKg = bSources.reduce((s, x) => s + x.kilograms, 0);
        const totalCost = bSources.reduce((s, x) => s + x.source_value, 0);
        const soldKg = bSales.reduce((s, x) => s + x.kilograms_deducted, 0);
        const totalRevenue = bSales.reduce((s, x) => s + (x.total_amount || (x.unit_price ? x.unit_price * x.kilograms_deducted : 0)), 0);
        const avgBuy = totalSrcKg > 0 ? totalCost / totalSrcKg : 0;
        const avgSell = soldKg > 0 ? totalRevenue / soldKg : 0;

        return {
          batch_id: b.id,
          batch_code: b.batch_code,
          coffee_type: b.coffee_type,
          batch_date: b.batch_date,
          total_kilograms: Number(b.total_kilograms || 0),
          remaining_kilograms: Number(b.remaining_kilograms || 0),
          status: b.status,
          sold_kg: soldKg,
          sources: bSources,
          sales: bSales,
          movements: bMoves,
          avg_buying_price: avgBuy,
          avg_selling_price: avgSell,
          total_cost: totalCost,
          total_revenue: totalRevenue,
          margin: totalRevenue - (avgBuy * soldKg),
        };
      });

      // Apply secondary text filters
      const filtered = built.filter(t => {
        if (supplierFilter.trim() && !t.sources.some(s => s.supplier_name?.toLowerCase().includes(supplierFilter.trim().toLowerCase()))) return false;
        if (customerFilter.trim() && !t.sales.some(s => s.customer?.toLowerCase().includes(customerFilter.trim().toLowerCase()))) return false;
        if (contractFilter.trim() && !t.sales.some(s => s.contract_ref?.toLowerCase().includes(contractFilter.trim().toLowerCase()))) return false;
        if (actorFilter.trim()) {
          const a = actorFilter.trim().toLowerCase();
          const inAny =
            t.sources.some(s => s.received_by?.toLowerCase().includes(a) || s.assessed_by?.toLowerCase().includes(a)) ||
            t.sales.some(s => s.contract_allocated_by?.toLowerCase().includes(a)) ||
            t.movements.some(m => m.created_by?.toLowerCase().includes(a));
          if (!inAny) return false;
        }
        return true;
      });

      setTrails(filtered);
      setGenerated(true);
      toast({ title: "Audit trail built", description: `${filtered.length} batches traced.` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalBatches = trails.length;
    const totalReceived = trails.reduce((s, t) => s + t.total_kilograms, 0);
    const totalSold = trails.reduce((s, t) => s + t.sold_kg, 0);
    const totalRemaining = trails.reduce((s, t) => s + t.remaining_kilograms, 0);
    const totalCost = trails.reduce((s, t) => s + t.total_cost, 0);
    const totalRevenue = trails.reduce((s, t) => s + t.total_revenue, 0);
    const totalMargin = trails.reduce((s, t) => s + t.margin, 0);
    const avgBuy = totalReceived > 0 ? totalCost / totalReceived : 0;
    const avgSell = totalSold > 0 ? totalRevenue / totalSold : 0;
    return { totalBatches, totalReceived, totalSold, totalRemaining, totalCost, totalRevenue, totalMargin, avgBuy, avgSell };
  }, [trails]);

  const fmt = (n: number) => Math.round(n).toLocaleString();

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1200,height=800");
    if (!w) return;
    const html = `<!doctype html><html><head><title>Coffee Audit Trail</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: Arial, sans-serif; color:#111; font-size:10px; }
        .header-row { display:flex; align-items:center; justify-content:space-between; padding-bottom:8px; border-bottom:3px double #000; }
        .logo-block { background:#0d3d1f; padding:6px 12px; border-radius:4px; }
        .logo-block img { height:42px; display:block; }
        .company-block { text-align:center; flex:1; padding:0 12px; }
        .company-name { font-size:18px; font-weight:900; letter-spacing:1.5px; margin:0; }
        .company-sub { font-size:9px; margin:1px 0; }
        .doc-meta { text-align:right; font-size:9px; }
        .title-bar { background:#0d3d1f; color:#fff; text-align:center; padding:6px 0; margin-top:8px; border-radius:3px; font-weight:bold; letter-spacing:1px; }
        h2 { font-size:12px; color:#0d3d1f; border-bottom:1px solid #d1d5db; padding-bottom:3px; margin:12px 0 6px;}
        .grid { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin:8px 0;}
        .stat { border:1px solid #e5e7eb; border-radius:4px; padding:6px;}
        .stat .label { font-size:8px; color:#6b7280; text-transform:uppercase;}
        .stat .val { font-size:13px; font-weight:bold;}
        table { width:100%; border-collapse:collapse; margin-top:4px;}
        th, td { border:1px solid #d1d5db; padding:3px 5px; text-align:left;}
        th { background:#0d3d1f; color:#fff; font-size:9px;}
        .right { text-align:right;}
        .batch-card { border:2px solid #0d3d1f; border-radius:6px; margin:10px 0; padding:8px; page-break-inside: avoid; }
        .batch-head { background:#0d3d1f; color:#fff; padding:6px 8px; margin:-8px -8px 8px; border-radius:4px 4px 0 0; display:flex; justify-content:space-between; }
        .leg-title { background:#f3f4f6; padding:3px 6px; font-weight:bold; font-size:10px; border-left:4px solid #0d3d1f; margin-top:6px; }
        .footer { margin-top:18px; border-top:1px solid #d1d5db; padding-top:6px; font-size:8px; color:#6b7280; display:flex; justify-content:space-between;}
        .pos { color:#16a34a; font-weight:bold;} .neg { color:#dc2626; font-weight:bold;}
      </style></head><body>
      <div class="header-row">
        <div class="logo-block"><img src="${window.location.origin}/lovable-uploads/great-agro-coffee-logo.png" alt="Logo"/></div>
        <div class="company-block">
          <h1 class="company-name">GREAT AGRO COFFEE LTD</h1>
          <p class="company-sub">Kasese, Uganda · Tel: +256 393 001 626 · info@greatpearlcoffee.com</p>
          <p class="company-sub">UCDA Licensed</p>
        </div>
        <div class="doc-meta">
          <strong>COFFEE AUDIT TRAIL</strong><br/>
          Period: <b>${startDate}</b> → <b>${endDate}</b><br/>
          Generated: ${format(new Date(), "PPpp")}<br/>
          ${coffeeType !== "all" ? `Type: ${coffeeType}<br/>` : ""}
          ${supplierFilter ? `Supplier: ${supplierFilter}<br/>` : ""}
          ${customerFilter ? `Customer: ${customerFilter}<br/>` : ""}
          ${contractFilter ? `Contract: ${contractFilter}<br/>` : ""}
          ${actorFilter ? `Actor: ${actorFilter}<br/>` : ""}
          ${batchFilter ? `Batch: ${batchFilter}<br/>` : ""}
        </div>
      </div>
      <div class="title-bar">END-TO-END COFFEE AUDIT TRAIL · STORE → INVENTORY → SALES</div>

      <h2>Executive Summary</h2>
      <div class="grid">
        <div class="stat"><div class="label">Batches Traced</div><div class="val">${stats.totalBatches}</div></div>
        <div class="stat"><div class="label">Received (kg)</div><div class="val">${fmt(stats.totalReceived)}</div></div>
        <div class="stat"><div class="label">Sold (kg)</div><div class="val">${fmt(stats.totalSold)}</div></div>
        <div class="stat"><div class="label">Remaining (kg)</div><div class="val">${fmt(stats.totalRemaining)}</div></div>
        <div class="stat"><div class="label">Avg Buy / Sell</div><div class="val">${fmt(stats.avgBuy)} → ${fmt(stats.avgSell)}</div></div>
        <div class="stat"><div class="label">Total Cost (UGX)</div><div class="val">${fmt(stats.totalCost)}</div></div>
        <div class="stat"><div class="label">Total Revenue (UGX)</div><div class="val">${fmt(stats.totalRevenue)}</div></div>
        <div class="stat"><div class="label">Gross Margin (UGX)</div><div class="val ${stats.totalMargin>=0?'pos':'neg'}">${fmt(stats.totalMargin)}</div></div>
      </div>

      ${trails.map(t => `
        <div class="batch-card">
          <div class="batch-head">
            <div><strong>Batch ${t.batch_code}</strong> · ${t.coffee_type} · ${t.batch_date}</div>
            <div>${fmt(t.total_kilograms)} kg total · ${fmt(t.sold_kg)} sold · ${fmt(t.remaining_kilograms)} remaining · status: ${t.status}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:10px;margin-bottom:6px;">
            <div><b>Avg Buy:</b> ${fmt(t.avg_buying_price)} UGX/kg</div>
            <div><b>Avg Sell:</b> ${fmt(t.avg_selling_price)} UGX/kg</div>
            <div><b>Cost:</b> ${fmt(t.total_cost)} · <b>Rev:</b> ${fmt(t.total_revenue)}</div>
            <div><b>Margin:</b> <span class="${t.margin>=0?'pos':'neg'}">${fmt(t.margin)}</span></div>
          </div>

          <div class="leg-title">① STORE — Sources of this batch</div>
          <table><thead><tr>
            <th>Date</th><th>Batch #</th><th>Supplier</th><th class="right">Kg</th><th class="right">Buy Price</th><th class="right">Value</th><th>Received By</th><th>Assessed By</th><th>Flag</th>
          </tr></thead><tbody>
            ${t.sources.map(s => `<tr>
              <td>${s.purchase_date || '—'}</td>
              <td style="font-family:monospace;font-size:9px;">${s.batch_number || s.coffee_record_id.slice(0,8)}</td>
              <td>${s.supplier_name}</td>
              <td class="right">${fmt(s.kilograms)}</td>
              <td class="right">${s.buying_price ? fmt(s.buying_price) : '—'}</td>
              <td class="right">${fmt(s.source_value)}</td>
              <td>${s.received_by || '—'}</td>
              <td>${s.assessed_by || '—'}</td>
              <td>${s.is_discretion ? '<b style="color:#dc2626">DISCRETION</b>' : ''}</td>
            </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:#6b7280;">No source records linked.</td></tr>'}
          </tbody></table>

          <div class="leg-title">①·B QUALITY — Assessment details per source</div>
          <table><thead><tr>
            <th>Batch #</th><th class="right">MC %</th><th class="right">G1</th><th class="right">G2</th><th class="right">&lt;12</th><th class="right">Pods</th><th class="right">Husks</th><th class="right">Stones</th><th class="right">FM</th><th class="right">Clean D14</th><th class="right">Outturn</th><th class="right">Sugg.</th><th class="right">Final</th><th>Status</th><th>Note</th>
          </tr></thead><tbody>
            ${t.sources.filter(s => s.quality).map(s => {
              const q = s.quality!;
              return `<tr>
                <td style="font-family:monospace;font-size:9px;">${s.batch_number || '—'}</td>
                <td class="right">${q.moisture ?? '—'}</td>
                <td class="right">${q.group1_defects ?? '—'}</td>
                <td class="right">${q.group2_defects ?? '—'}</td>
                <td class="right">${q.below12 ?? '—'}</td>
                <td class="right">${q.pods ?? '—'}</td>
                <td class="right">${q.husks ?? '—'}</td>
                <td class="right">${q.stones ?? '—'}</td>
                <td class="right">${q.fm ?? '—'}</td>
                <td class="right">${q.clean_d14 ?? '—'}</td>
                <td class="right">${q.outturn ?? '—'}</td>
                <td class="right">${q.suggested_price ? fmt(q.suggested_price) : '—'}</td>
                <td class="right">${q.final_price ? fmt(q.final_price) : '—'}</td>
                <td>${q.status || '—'}</td>
                <td>${(q.quality_note || q.comments || '').toString().slice(0,80)}</td>
              </tr>`;
            }).join('') || '<tr><td colspan="15" style="text-align:center;color:#6b7280;">No quality assessments linked.</td></tr>'}
          </tbody></table>

          <div class="leg-title">② INVENTORY — Movements</div>
          <table><thead><tr><th>Timestamp</th><th>Type</th><th class="right">Qty (kg)</th><th>By</th><th>Notes</th></tr></thead><tbody>
            ${t.movements.slice(0, 20).map(m => `<tr>
              <td>${format(new Date(m.created_at), 'PP p')}</td>
              <td>${m.movement_type}</td>
              <td class="right">${fmt(m.quantity_kg)}</td>
              <td>${m.created_by || '—'}</td>
              <td>${m.notes || '—'}</td>
            </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#6b7280;">No movements.</td></tr>'}
          </tbody></table>

          <div class="leg-title">③ SALES — Where this batch went</div>
          <table><thead><tr>
            <th>Date</th><th>Customer</th><th class="right">Kg Sold</th><th class="right">Sale Price</th><th class="right">Revenue</th><th>Buyer Contract</th><th class="right">Contract Price</th><th>Allocated By</th>
          </tr></thead><tbody>
            ${t.sales.map(s => `<tr>
              <td>${s.sale_date || '—'}</td>
              <td>${s.customer}</td>
              <td class="right">${fmt(s.kilograms_deducted)}</td>
              <td class="right">${s.unit_price ? fmt(s.unit_price) : '—'}</td>
              <td class="right">${s.total_amount ? fmt(s.total_amount) : '—'}</td>
              <td>${s.contract_ref || '—'}</td>
              <td class="right">${s.buyer_contract_price ? fmt(s.buyer_contract_price) : '—'}</td>
              <td>${s.contract_allocated_by || '—'}</td>
            </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:#6b7280;">No sales linked yet.</td></tr>'}
          </tbody></table>
        </div>
      `).join('')}

      <div class="footer">
        <span>Great Agro Coffee Ltd · Confidential Audit Document</span>
        <span>Generated by System · ${format(new Date(), "PPpp")}</span>
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
          <GitBranch className="h-5 w-5 text-primary" />
          Coffee Audit Trail — Store → Inventory → Sales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={coffeeType} onChange={e => setCoffeeType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="Arabica">Arabica</option>
              <option value="Robusta">Robusta</option>
              <option value="Drugar">Drugar</option>
              <option value="Wugar">Wugar</option>
            </select>
          </div>
          <div>
            <Label>Batch Code</Label>
            <Input placeholder="Search batch..." value={batchFilter} onChange={e => setBatchFilter(e.target.value)} />
          </div>
          <div>
            <Label>Supplier</Label>
            <Input placeholder="Search supplier..." value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} />
          </div>
          <div>
            <Label>Customer / Buyer</Label>
            <Input placeholder="Search customer..." value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} />
          </div>
          <div>
            <Label>Contract Reference</Label>
            <Input placeholder="e.g. BC-2026-001" value={contractFilter} onChange={e => setContractFilter(e.target.value)} />
          </div>
          <div>
            <Label>Actor (any user)</Label>
            <Input placeholder="Email / name..." value={actorFilter} onChange={e => setActorFilter(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={fetchReport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Build Audit Trail
          </Button>
          {generated && trails.length > 0 && (
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" /> Print Full Trail
            </Button>
          )}
        </div>

        {generated && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <StatBox label="Batches" value={stats.totalBatches.toString()} icon={<Package className="h-4 w-4" />} />
              <StatBox label="Received (kg)" value={fmt(stats.totalReceived)} icon={<Store className="h-4 w-4" />} />
              <StatBox label="Sold (kg)" value={fmt(stats.totalSold)} icon={<ShoppingCart className="h-4 w-4" />} />
              <StatBox label="Remaining (kg)" value={fmt(stats.totalRemaining)} icon={<Package className="h-4 w-4" />} />
              <StatBox label="Avg Buy (UGX/kg)" value={fmt(stats.avgBuy)} icon={<ArrowRight className="h-4 w-4" />} />
              <StatBox label="Avg Sell (UGX/kg)" value={fmt(stats.avgSell)} icon={<ArrowRight className="h-4 w-4" />} />
              <StatBox label="Total Cost" value={fmt(stats.totalCost)} icon={<Store className="h-4 w-4" />} />
              <StatBox label="Gross Margin" value={fmt(stats.totalMargin)} icon={<ShoppingCart className="h-4 w-4" />}
                valueClass={stats.totalMargin >= 0 ? "text-green-600" : "text-red-600"} />
            </div>

            <div className="space-y-3">
              {trails.length === 0 && (
                <div className="text-center text-muted-foreground py-8 border rounded-lg">No batches match the filters.</div>
              )}
              {trails.map(t => {
                const open = expanded[t.batch_id];
                return (
                  <div key={t.batch_id} className="border-2 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggle(t.batch_id)}
                      className="w-full bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between hover:opacity-90"
                    >
                      <div className="flex items-center gap-2">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-bold">Batch {t.batch_code}</span>
                        <Badge variant="secondary">{t.coffee_type}</Badge>
                        <span className="text-xs opacity-90">{t.batch_date}</span>
                      </div>
                      <div className="text-xs flex gap-3">
                        <span>{fmt(t.total_kilograms)} kg</span>
                        <span>Sold: {fmt(t.sold_kg)}</span>
                        <span>Margin: <b className={t.margin >= 0 ? "text-green-300" : "text-red-300"}>{fmt(t.margin)}</b></span>
                      </div>
                    </button>

                    {open && (
                      <div className="p-4 space-y-4 bg-muted/30">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Avg Buy:</span> <b>{fmt(t.avg_buying_price)} UGX/kg</b></div>
                          <div><span className="text-muted-foreground">Avg Sell:</span> <b>{fmt(t.avg_selling_price)} UGX/kg</b></div>
                          <div><span className="text-muted-foreground">Cost:</span> <b>{fmt(t.total_cost)}</b></div>
                          <div><span className="text-muted-foreground">Revenue:</span> <b>{fmt(t.total_revenue)}</b></div>
                        </div>

                        <Section title="① STORE — Sources">
                          <MiniTable
                            head={["Date","Coffee Record","Supplier","Kg","Buy Price","Value","Received By","Assessed By","Flag"]}
                            rows={t.sources.map(s => [
                              s.purchase_date || "—",
                              <span className="font-mono text-xs">{s.coffee_record_id.slice(0, 12)}…</span>,
                              s.supplier_name,
                              fmt(s.kilograms),
                              s.buying_price ? fmt(s.buying_price) : "—",
                              fmt(s.source_value),
                              s.received_by || "—",
                              s.assessed_by || "—",
                              s.is_discretion ? <Badge variant="destructive">DISCRETION</Badge> : "",
                            ])}
                            empty="No source records linked."
                          />
                        </Section>

                        <Section title="② INVENTORY — Movements">
                          <MiniTable
                            head={["Timestamp","Type","Qty (kg)","By","Notes"]}
                            rows={t.movements.slice(0, 20).map(m => [
                              format(new Date(m.created_at), 'PP p'),
                              <Badge variant="outline">{m.movement_type}</Badge>,
                              fmt(m.quantity_kg),
                              m.created_by || "—",
                              m.notes || "—",
                            ])}
                            empty="No movements recorded."
                          />
                        </Section>

                        <Section title="③ SALES — Where it went">
                          <MiniTable
                            head={["Date","Customer","Kg Sold","Sale Price","Revenue","Buyer Contract","Contract Price","Allocated By"]}
                            rows={t.sales.map(s => [
                              s.sale_date || "—",
                              s.customer,
                              fmt(s.kilograms_deducted),
                              s.unit_price ? fmt(s.unit_price) : "—",
                              s.total_amount ? fmt(s.total_amount) : "—",
                              s.contract_ref || <span className="text-muted-foreground">—</span>,
                              s.buyer_contract_price ? fmt(s.buyer_contract_price) : "—",
                              s.contract_allocated_by || "—",
                            ])}
                            empty="No sales linked yet."
                          />
                        </Section>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const StatBox = ({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
    <div className={`text-lg font-bold mt-1 ${valueClass || ""}`}>{value}</div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="bg-primary/10 border-l-4 border-primary px-3 py-1.5 font-semibold text-sm mb-2">{title}</div>
    {children}
  </div>
);

const MiniTable = ({ head, rows, empty }: { head: string[]; rows: any[][]; empty: string }) => (
  <div className="border rounded overflow-x-auto">
    <table className="w-full text-xs">
      <thead className="bg-muted">
        <tr>{head.map((h, i) => <th key={i} className="p-2 text-left font-semibold">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={head.length} className="p-3 text-center text-muted-foreground">{empty}</td></tr>
        ) : rows.map((r, i) => (
          <tr key={i} className="border-t">
            {r.map((c, j) => <td key={j} className="p-2">{c as any}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default CoffeeAuditTrailReport;