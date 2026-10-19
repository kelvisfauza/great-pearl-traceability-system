import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Package, TrendingDown, Users, Calendar, CheckCircle2, AlertCircle, DollarSign, Printer } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { batchDateLabel, batchAgeDays, qualityRange, remainingPurchaseValue } from "./batchPresentation";
import { BatchWithDetails, BatchSource } from "@/hooks/useInventoryBatches";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatSupplierDisplay, SupplierRef } from "@/utils/supplierDisplay";

interface BatchCardProps {
  batch: BatchWithDetails;
}

interface QualityInfo {
  id: string;
  store_record_id: string | null;
  moisture: number | null;
  outturn: number | null;
  fm: number | null;
  date_assessed: string;
  status: string;
  assessment_ref: string | null;
  assessed_by: string;
}
interface DeliveryMeta { inputBy?: string; deliveryDate?: string; reference?: string; bags?: number }
interface SaleDetail { status: string; truck_details: string | null; driver_details: string | null }


const BatchCard = ({ batch }: BatchCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [supplierMap, setSupplierMap] = useState<Record<string, SupplierRef>>({});
  const [sourceMetaMap, setSourceMetaMap] = useState<Record<string, DeliveryMeta>>({});
  const [priceInfo, setPriceInfo] = useState<{ avgPrice: number; totalCost: number; pricedKg: number } | null>(null);
  const [sourcePriceMap, setSourcePriceMap] = useState<Record<string, { unitPrice: number; totalCost: number }>>({});
  
  const [qualityMap, setQualityMap] = useState<Record<string, QualityInfo>>({});
  const [saleDetails, setSaleDetails] = useState<Record<string, SaleDetail>>({});
  const [qualityLoading, setQualityLoading] = useState(true);
  const [qualityError, setQualityError] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadQuality = async () => {
      setQualityLoading(true);
      setQualityError(false);
      const ids = [...new Set(batch.sources.map(source => source.coffee_record_id))];
      if (!ids.length) { setQualityMap({}); setQualityLoading(false); return; }
      const { data, error } = await supabase.from('quality_assessments')
        .select('id, store_record_id, moisture, outturn, fm, date_assessed, status, assessment_ref, assessed_by')
        .in('store_record_id', ids).order('created_at', { ascending: false });
      if (cancelled) return;
      const map: Record<string, QualityInfo> = {};
      for (const row of data || []) {
        if (row.store_record_id && !map[row.store_record_id]) map[row.store_record_id] = row;
      }
      setQualityMap(map);
      setQualityError(Boolean(error));
      setQualityLoading(false);
    };
    loadQuality();
    return () => { cancelled = true; };
  }, [batch.sources]);

  useEffect(() => {
    if (!isOpen) return;
    const ids = [...new Set(batch.sales.map(sale => sale.sale_transaction_id).filter((id): id is string => Boolean(id)))];
    if (!ids.length) { setSaleDetails({}); return; }
    let cancelled = false;
    supabase.from('sales_transactions').select('id, status, truck_details, driver_details').in('id', ids)
      .then(({ data }) => {
        if (!cancelled) setSaleDetails(Object.fromEntries((data || []).map(row => [row.id, row])));
      });
    return () => { cancelled = true; };
  }, [isOpen, batch.sales]);

  // Fetch supplier codes and price info for sources
  useEffect(() => {
    const fetchDetails = async () => {
      if (batch.sources.length === 0) return;
      
      setDetailsLoading(true);
      setDetailsError(false);
      const recordIds = batch.sources.map(s => s.coffee_record_id);
      
      const { data: records, error } = await supabase
        .from('coffee_records')
        .select('id, supplier_id, kilograms, created_by, date, batch_number, bags')
        .in('id', recordIds);
      
      if (error || !records?.length) { setDetailsError(Boolean(error)); setDetailsLoading(false); return; }

      // Resolve inputter names
      const userIds = Array.from(new Set(records.map(r => r.created_by).filter(Boolean))) as string[];
      let userNameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: emps } = await supabase
          .from('employees')
          .select('auth_user_id, name')
          .in('auth_user_id', userIds);
        if (emps) {
          emps.forEach((e: any) => { if (e.auth_user_id) userNameMap[e.auth_user_id] = e.name; });
        }
      }

      const metaMap: Record<string, DeliveryMeta> = {};
      records.forEach((r: any) => {
        metaMap[r.id] = {
          inputBy: r.created_by ? (userNameMap[r.created_by] || 'Not recorded') : undefined,
          deliveryDate: r.date,
          reference: r.batch_number,
          bags: r.bags,
        };
      });
      setSourceMetaMap(metaMap);
      setDetailsLoading(false);

      // Fetch supplier info
      const supplierIds = records.map(r => r.supplier_id).filter(Boolean);
      if (supplierIds.length > 0) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, name, code')
          .in('id', supplierIds);
        
        if (suppliers) {
          const recordToSupplier: Record<string, SupplierRef> = {};
          for (const record of records) {
            if (record.supplier_id) {
              const supplier = suppliers.find(s => s.id === record.supplier_id);
              if (supplier) {
                recordToSupplier[record.id] = { id: supplier.id, name: supplier.name, code: supplier.code || '' };
              }
            }
          }
          setSupplierMap(recordToSupplier);
        }
      }
    };
    
    if (isOpen) {
      fetchDetails();
    }
  }, [isOpen, batch.sources]);

  // Fetch average price from finance lots, then fall back to quality assessments
  useEffect(() => {
    const fetchPriceInfo = async () => {
      setPriceInfo(null);
      setSourcePriceMap({});
      const sourceWeights = new Map(
        batch.sources.map((source) => [source.coffee_record_id, Number(source.kilograms) || 0])
      );

      const sourceRecordIds = batch.sources.map((source) => source.coffee_record_id);
      let recordIds = sourceRecordIds;

      if (recordIds.length === 0) {
        const { data: records } = await supabase
          .from('coffee_records')
          .select('id, kilograms')
          .eq('date', batch.batch_date)
          .ilike('coffee_type', `%${batch.coffee_type}%`)
          .eq('status', 'inventory');

        if (records && records.length > 0) {
          recordIds = records.map((record) => record.id);
          records.forEach((record) => {
            sourceWeights.set(record.id, Number(record.kilograms) || 0);
          });
        }
      }

      if (recordIds.length === 0) {
        setPriceInfo(null);
        return;
      }

      const perSource: Record<string, { unitPrice: number; totalCost: number }> = {};

      // 1) Prefer finance_coffee_lots (authoritative paid price)
      const { data: lots } = await supabase
        .from('finance_coffee_lots')
        .select('coffee_record_id, unit_price_ugx, quantity_kg, total_amount_ugx')
        .in('coffee_record_id', recordIds);

      if (lots && lots.length > 0) {
        for (const lot of lots) {
          const quantityKg = Number(lot.quantity_kg) || sourceWeights.get(lot.coffee_record_id) || 0;
          const cost = Number(lot.total_amount_ugx) || ((Number(lot.unit_price_ugx) || 0) * quantityKg);
          const unit = quantityKg > 0 ? cost / quantityKg : Number(lot.unit_price_ugx) || 0;
          if (unit > 0) {
            perSource[lot.coffee_record_id] = { unitPrice: unit, totalCost: cost };
          }
        }
      }

      // 2) Fill gaps from quality_assessments for any source still missing a price
      const missingIds = recordIds.filter((id) => !perSource[id]);
      if (missingIds.length > 0) {
        const { data: assessments } = await supabase
          .from('quality_assessments')
          .select('store_record_id, final_price, suggested_price')
          .in('store_record_id', missingIds).order('created_at', { ascending: false });

        if (assessments && assessments.length > 0) {
          for (const assessment of assessments) {
            const unitPrice = Number(assessment.final_price) || Number(assessment.suggested_price) || 0;
            const quantityKg = sourceWeights.get(assessment.store_record_id) || 0;
            if (assessment.store_record_id && !perSource[assessment.store_record_id] && unitPrice > 0) {
              perSource[assessment.store_record_id] = {
                unitPrice,
                totalCost: quantityKg * unitPrice,
              };
            }
          }
        }
      }

      // 3) Aggregate across all sources we found prices for
      let totalCost = 0;
      let totalKg = 0;
      for (const id of recordIds) {
        const p = perSource[id];
        const kg = sourceWeights.get(id) || 0;
        if (p && kg > 0) {
          totalCost += kg * p.unitPrice;
          totalKg += kg;
        }
      }

      setSourcePriceMap(perSource);
      setPriceInfo(totalKg > 0 ? { avgPrice: totalCost / totalKg, totalCost, pricedKg: totalKg } : null);
    };

    fetchPriceInfo();
  }, [batch.sources, batch.batch_date, batch.coffee_type]);

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sourcesHtml = batch.sources.map((s) => {
      const display = getSupplierDisplay(s);
      const meta = sourceMetaMap[s.coffee_record_id] || {};
      const price = sourcePriceMap[s.coffee_record_id];
      return `<tr>
        <td>${display.displayName}</td>
        <td>${format(new Date(meta.deliveryDate || s.purchase_date), 'PP')}</td>
        <td>${meta.inputBy || '—'}</td>
        <td style="text-align:right">${Number(s.kilograms).toLocaleString()} kg</td>
        <td style="text-align:right">${price ? 'UGX ' + Math.round(price.unitPrice).toLocaleString() : '—'}</td>
        <td style="text-align:right">${price ? 'UGX ' + Math.round(price.totalCost).toLocaleString() : '—'}</td>
      </tr>`;
    }).join('');

    const salesHtml = batch.sales.map((sale) => `
      <tr>
        <td>${sale.customer_name || 'Unknown Customer'}</td>
        <td>${format(new Date(sale.sale_date), 'PP')}</td>
        <td style="text-align:right">${Number(sale.kilograms_deducted).toLocaleString()} kg</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><title>Batch ${batch.batch_code}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { margin: 0 0 4px; font-size: 20px; }
        h2 { font-size: 14px; margin: 18px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; margin-top: 12px; font-size: 12px; }
        .meta div span { color: #666; display: block; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: left; }
        th { background: #f5f5f5; font-size: 11px; text-transform: uppercase; }
        .footer { margin-top: 24px; font-size: 10px; color: #888; text-align: center; }
      </style></head><body>
      <h1>Batch Report — ${batch.batch_code}</h1>
      <p style="font-size:12px;color:#666;margin:0">Great Pearl Coffee Factory</p>
      <div class="meta">
        <div><span>Coffee Type</span>${batch.coffee_type}</div>
        <div><span>Batch Date</span>${format(new Date(batch.batch_date), 'PP')}</div>
        <div><span>Status</span>${batch.status}</div>
        <div><span>Total Volume</span>${batch.total_kilograms.toLocaleString()} kg</div>
        <div><span>Remaining</span>${batch.remaining_kilograms.toLocaleString()} kg</div>
        <div><span>Sold</span>${soldKg.toLocaleString()} kg</div>
        <div><span>Avg Paid Price</span>${priceInfo ? 'UGX ' + Math.round(priceInfo.avgPrice).toLocaleString() + '/kg' : '—'}</div>
        <div><span>Total Cost</span>${priceInfo ? 'UGX ' + Math.round(priceInfo.totalCost).toLocaleString() : '—'}</div>
      </div>
      <h2>Source Purchases (${batch.sources.length})</h2>
      <table><thead><tr><th>Supplier</th><th>Delivered</th><th>Input By</th><th style="text-align:right">Quantity</th><th style="text-align:right">Price/kg</th><th style="text-align:right">Total Paid</th></tr></thead>
      <tbody>${sourcesHtml || '<tr><td colspan="6" style="text-align:center;color:#888">No sources</td></tr>'}</tbody></table>
      ${batch.sales.length > 0 ? `<h2>Sales History (${batch.sales.length})</h2>
      <table><thead><tr><th>Customer</th><th>Date</th><th style="text-align:right">Qty Sold</th></tr></thead>
      <tbody>${salesHtml}</tbody></table>` : ''}
      <p class="footer">Printed on ${format(new Date(), 'PPpp')}</p>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script>
      </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };
  
  const getSupplierDisplay = (source: BatchSource) => {
    const supplier = supplierMap[source.coffee_record_id];
    return formatSupplierDisplay({ supplier, fallbackName: source.supplier_name });
  };
  
  const percentRemaining = batch.total_kilograms > 0 ? (batch.remaining_kilograms / batch.total_kilograms) * 100 : 0;
  const percentSold = batch.total_kilograms > 0 
    ? ((batch.total_kilograms - batch.remaining_kilograms) / batch.total_kilograms) * 100 
    : 0;
  const soldKg = batch.total_kilograms - batch.remaining_kilograms;
  const isDepleted = batch.remaining_kilograms === 0 || batch.status === 'sold_out';
  const isLowStock = percentRemaining < 20 && !isDepleted;

  const supplierCount = new Set(batch.sources.map(source => source.supplier_name.trim().toLowerCase()).filter(Boolean)).size;
  const deliveryCount = new Set(batch.sources.map(source => source.coffee_record_id)).size;
  const age = batchAgeDays(batch.batch_date);
  const qualityRows = Object.values(qualityMap);
  const stockValue = priceInfo ? remainingPurchaseValue(batch.remaining_kilograms, batch.total_kilograms, priceInfo.pricedKg, priceInfo.avgPrice) : null;
  const qualitySummary = qualityLoading ? 'Loading quality…' : qualityError ? 'Quality unavailable' : !qualityRows.length ? 'Not assessed' :
    `Moisture ${qualityRange(qualityRows.map(row => row.moisture))} · Outturn ${qualityRange(qualityRows.map(row => row.outturn))} · Total FM ${qualityRange(qualityRows.map(row => row.fm))}`;
  const history = [
    { id: 'created', date: batch.created_at, title: 'Batch created', detail: batch.batch_code },
    ...batch.sources.map(source => ({ id: `source-${source.id}`, date: source.purchase_date, title: 'Delivery added', detail: `${source.supplier_name || 'Supplier not recorded'} · ${source.kilograms.toLocaleString()} kg · ${sourceMetaMap[source.coffee_record_id]?.reference || source.coffee_record_id}` })),
    ...qualityRows.map(row => ({ id: `quality-${row.id}`, date: row.date_assessed, title: 'Quality assessed', detail: `${row.assessment_ref || row.id} · ${row.status}` })),
    ...batch.sales.map(sale => ({ id: `sale-${sale.id}`, date: sale.sale_date, title: 'Sale allocated', detail: `${sale.customer_name || 'Customer not recorded'} · ${sale.kilograms_deducted.toLocaleString()} kg · ${sale.sale_transaction_id || 'Reference not recorded'}` })),
    ...(batch.sold_out_at ? [{ id: 'depleted', date: batch.sold_out_at, title: 'Batch sold out', detail: 'No stock remaining' }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const money = (value: number) => `UGX ${Math.round(value).toLocaleString()}`;

  return (
    <Card className={`rounded-lg transition-all duration-200 ${isDepleted ? 'border-border' : isLowStock ? 'border-warning/50' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary"><Package className="h-5 w-5" /></div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg font-semibold">{batch.coffee_type} · {batchDateLabel(batch.batch_date)}</CardTitle>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{batch.batch_code}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={isDepleted ? 'secondary' : 'outline'} className={isLowStock ? 'border-warning/50 text-foreground' : ''}>
                    {isDepleted ? 'Sold out' : isLowStock ? 'Low stock' : batch.status === 'selling' ? 'Selling' : 'Available'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{age == null ? 'Age not recorded' : `${age} days since receipt`}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrint} title="Print batch report" aria-label={`Print batch ${batch.batch_code}`}><Printer className="h-4 w-4" /></Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" title={isOpen ? 'Hide batch details' : 'View batch details'} aria-label={`View details for ${batch.batch_code}`}>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ['Received', `${batch.total_kilograms.toLocaleString()} kg`],
              ['Sold / allocated', `${soldKg.toLocaleString()} kg`],
              ['Remaining', `${batch.remaining_kilograms.toLocaleString()} kg`],
              ['Average buying cost', priceInfo ? `${money(priceInfo.avgPrice)}/kg` : 'Not recorded'],
              ['Remaining purchase value', stockValue == null ? 'Not recorded' : money(stockValue)],
            ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`mt-1 break-words text-sm font-semibold ${label === 'Remaining' ? 'text-primary' : 'text-foreground'}`}>{value}</dd></div>)}
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{supplierCount} suppliers · {deliveryCount} deliveries</span>
            <span>{percentRemaining.toFixed(0)}% stock remaining</span>
          </div>
          <progress aria-label="Stock remaining" className="mt-2 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" max={100} value={Math.max(0, Math.min(100, percentRemaining))} />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Quality{qualityRows.length ? ' (recorded range)' : ''}:</span> {qualitySummary}{qualityRows.length > 0 && ` · ${qualityRows.length}/${deliveryCount} deliveries assessed`}</p>
          {priceInfo && stockValue == null && <p className="text-xs text-muted-foreground">Buying cost recorded for {priceInfo.pricedKg.toLocaleString()} of {batch.total_kilograms.toLocaleString()} kg</p>}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="border-t px-4 pt-4 sm:px-5">
            <Tabs defaultValue="deliveries">
              <TabsList className="mb-4 flex h-auto w-full justify-start overflow-x-auto">
                <TabsTrigger value="deliveries">Deliveries ({deliveryCount})</TabsTrigger>
                <TabsTrigger value="quality">Quality</TabsTrigger>
                <TabsTrigger value="sales">Sales ({batch.sales.length})</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="deliveries" className="space-y-3">
                {detailsLoading && <p className="text-sm text-muted-foreground">Loading delivery details…</p>}
                {detailsError && <p className="text-sm text-destructive">Delivery details unavailable. Close and reopen to retry.</p>}
                {!batch.sources.length && <p className="py-4 text-sm text-muted-foreground">No delivery records linked to this batch.</p>}
                {batch.sources.map(source => {
                  const meta = sourceMetaMap[source.coffee_record_id];
                  const price = sourcePriceMap[source.coffee_record_id];
                  return <div key={source.id} className="grid gap-2 border-b border-border pb-3 last:border-0 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0"><p className="break-words text-sm font-semibold">{getSupplierDisplay(source).displayName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Delivered {batchDateLabel(meta?.deliveryDate || source.purchase_date)} · {meta?.bags == null ? 'Bags not recorded' : `${meta.bags} bags`}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">Delivery ref: {meta?.reference || source.coffee_record_id}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Recorded by: {meta?.inputBy || 'Not recorded'}</p>
                    </div>
                    <div className="text-sm sm:text-right"><p className="font-semibold text-primary">{source.kilograms.toLocaleString()} kg</p><p className="mt-1 text-xs text-muted-foreground">Buying cost: {price ? `${money(price.unitPrice)}/kg` : 'Not recorded'}</p><p className="mt-1 text-xs">Allocated purchase cost: {price ? money(source.kilograms * price.unitPrice) : 'Not recorded'}</p></div>
                  </div>;
                })}
              </TabsContent>
              <TabsContent value="quality" className="space-y-3">
                {qualityLoading ? <p className="text-sm text-muted-foreground">Loading quality…</p> : qualityError ? <p className="text-sm text-destructive">Quality results unavailable.</p> : !batch.sources.length ? <p className="text-sm text-muted-foreground">No linked deliveries to assess.</p> : batch.sources.map(source => {
                  const quality = qualityMap[source.coffee_record_id];
                  return <div key={source.id} className="border-b pb-3 last:border-0"><p className="text-sm font-semibold">{getSupplierDisplay(source).displayName}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{sourceMetaMap[source.coffee_record_id]?.reference || source.coffee_record_id}</p>
                    {!quality ? <Badge variant="secondary" className="mt-2">Not assessed</Badge> : <><dl className="mt-3 grid grid-cols-3 gap-3">{[['Moisture', quality.moisture], ['Outturn', quality.outturn], ['Total FM', quality.fm]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-semibold">{qualityRange([typeof value === 'number' ? value : null])}</dd></div>)}</dl>
                    <p className="mt-3 break-words text-xs text-muted-foreground">Latest assessment: {batchDateLabel(quality.date_assessed)} · {quality.status} · {quality.assessment_ref || quality.id}</p></>}
                  </div>;
                })}
              </TabsContent>
              <TabsContent value="sales" className="space-y-3">
                {!batch.sales.length && <p className="py-4 text-sm text-muted-foreground">No sales allocated to this batch.</p>}
                {batch.sales.map(sale => { const detail = sale.sale_transaction_id ? saleDetails[sale.sale_transaction_id] : undefined; return <div key={sale.id} className="flex flex-wrap justify-between gap-3 border-b pb-3 last:border-0"><div className="min-w-0"><p className="text-sm font-semibold">{sale.customer_name || 'Customer not recorded'}</p><p className="mt-1 text-xs text-muted-foreground">Sale date: {batchDateLabel(sale.sale_date)}</p><p className="mt-1 break-all text-xs text-muted-foreground">Sale ref: {sale.sale_transaction_id || 'Not recorded'}</p><p className="mt-1 text-xs text-muted-foreground">Status: {detail?.status || 'Not recorded'} · Truck: {detail?.truck_details || 'Not recorded'}</p><p className="mt-1 text-xs text-muted-foreground">Driver: {detail?.driver_details || 'Not recorded'}</p></div><div><p className="text-sm font-semibold">{sale.kilograms_deducted.toLocaleString()} kg</p><p className="text-xs text-muted-foreground">Allocated from this batch</p></div></div>; })}
              </TabsContent>
              <TabsContent value="history"><ol className="space-y-4">{history.map(event => <li key={event.id} className="grid gap-1 border-l-2 border-primary/30 pl-3 sm:grid-cols-[110px_1fr]"><p className="text-xs text-muted-foreground">{batchDateLabel(event.date)}</p><div><p className="text-sm font-medium">{event.title}</p><p className="mt-1 break-words text-xs text-muted-foreground">{event.detail}</p></div></li>)}</ol></TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default BatchCard;
