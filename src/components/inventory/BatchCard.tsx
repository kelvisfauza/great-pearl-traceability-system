import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Package, TrendingDown, Users, Calendar, CheckCircle2, AlertCircle, DollarSign, Printer } from "lucide-react";
import { format } from "date-fns";
import { BatchWithDetails, BatchSource } from "@/hooks/useInventoryBatches";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatSupplierDisplay, SupplierRef } from "@/utils/supplierDisplay";

interface BatchCardProps {
  batch: BatchWithDetails;
}

interface SourcePriceInfo {
  kilograms: number;
  price_per_kg: number;
  total_cost: number;
}

const BatchCard = ({ batch }: BatchCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [supplierMap, setSupplierMap] = useState<Record<string, SupplierRef>>({});
  const [sourceMetaMap, setSourceMetaMap] = useState<Record<string, { inputBy?: string; deliveryDate?: string }>>({});
  const [priceInfo, setPriceInfo] = useState<{ avgPrice: number; totalCost: number } | null>(null);
  const [sourcePriceMap, setSourcePriceMap] = useState<Record<string, { unitPrice: number; totalCost: number }>>({});
  
  // Fetch supplier codes and price info for sources
  useEffect(() => {
    const fetchDetails = async () => {
      if (batch.sources.length === 0) return;
      
      const recordIds = batch.sources.map(s => s.coffee_record_id);
      
      const { data: records } = await supabase
        .from('coffee_records')
        .select('id, supplier_id, kilograms, created_by, date')
        .in('id', recordIds);
      
      if (!records || records.length === 0) return;

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

      const metaMap: Record<string, { inputBy?: string; deliveryDate?: string }> = {};
      records.forEach((r: any) => {
        metaMap[r.id] = {
          inputBy: r.created_by ? (userNameMap[r.created_by] || 'System') : undefined,
          deliveryDate: r.date,
        };
      });
      setSourceMetaMap(metaMap);

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
          .in('store_record_id', missingIds);

        if (assessments && assessments.length > 0) {
          for (const assessment of assessments) {
            const unitPrice = Number(assessment.final_price) || Number(assessment.suggested_price) || 0;
            const quantityKg = sourceWeights.get(assessment.store_record_id) || 0;
            if (unitPrice > 0) {
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
      setPriceInfo(totalKg > 0 ? { avgPrice: totalCost / totalKg, totalCost } : null);
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

  const getStatusBadge = () => {
    if (isDepleted) {
      return (
        <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Depleted
        </Badge>
      );
    }
    if (isLowStock) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
          <AlertCircle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    }
    switch (batch.status) {
      case 'active':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>;
      case 'selling':
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">Selling</Badge>;
      case 'sold_out':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground border-border">Sold Out</Badge>;
      default:
        return <Badge variant="outline">{batch.status}</Badge>;
    }
  };

  const getCoffeeTypeBadge = () => {
    const isArabica = batch.coffee_type.toLowerCase().includes('arabica');
    const isRobusta = batch.coffee_type.toLowerCase().includes('robusta');
    return (
      <Badge 
        variant="outline" 
        className={isArabica 
          ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
          : isRobusta
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          : "bg-purple-500/10 text-purple-400 border-purple-500/30"
        }
      >
        {batch.coffee_type}
      </Badge>
    );
  };

  return (
    <Card className={`transition-all duration-200 ${isDepleted ? 'opacity-60 border-red-500/30' : isLowStock ? 'border-yellow-500/30' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isDepleted ? 'bg-red-500/10' : 
                  isLowStock ? 'bg-yellow-500/10' : 
                  'bg-primary/10'
                }`}>
                  <Package className={`h-5 w-5 ${
                    isDepleted ? 'text-red-400' : 
                    isLowStock ? 'text-yellow-400' : 
                    'text-primary'
                  }`} />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{batch.batch_code}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {getCoffeeTypeBadge()}
                    {getStatusBadge()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Volume info */}
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {batch.total_kilograms.toLocaleString()} kg
                  </p>
                  <p className="text-xs text-muted-foreground">total volume</p>
                </div>

                {/* Remaining */}
                <div className="text-right">
                  <p className={`text-sm font-bold ${isDepleted ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-green-400'}`}>
                    {batch.remaining_kilograms.toLocaleString()} kg
                  </p>
                  <p className="text-xs text-muted-foreground">remaining</p>
                </div>

                {/* Average price */}
                {priceInfo && priceInfo.avgPrice > 0 && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {Math.round(priceInfo.avgPrice).toLocaleString()} /kg
                    </p>
                    <p className="text-xs text-muted-foreground">avg price</p>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrint}
                  title="Print batch report"
                >
                  <Printer className="h-4 w-4" />
                </Button>

                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            
            <div className="mt-3 space-y-2">
              {/* Remaining bar (green) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">Remaining: {batch.remaining_kilograms.toLocaleString()} kg ({percentRemaining.toFixed(0)}%)</span>
                  {soldKg > 0 && (
                    <span className="text-red-400">Sold: {soldKg.toLocaleString()} kg ({percentSold.toFixed(0)}%)</span>
                  )}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full transition-all ${
                      isDepleted ? 'bg-red-500' : 
                      isLowStock ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.max(percentRemaining, 0)}%` }}
                  />
                  {soldKg > 0 && (
                    <div 
                      className="h-full bg-red-500/50 transition-all"
                      style={{ width: `${Math.max(percentSold, 0)}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Batch Info */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Batch Date</p>
                  <p className="text-sm font-medium">{format(new Date(batch.batch_date), 'PP')}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="text-sm font-medium">{batch.total_kilograms.toLocaleString()} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-sm font-medium">{batch.remaining_kilograms.toLocaleString()} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sold</p>
                <p className="text-sm font-medium">{soldKg.toLocaleString()} kg</p>
              </div>
              {priceInfo && priceInfo.avgPrice > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Price/kg</p>
                    <p className="text-sm font-medium">UGX {Math.round(priceInfo.avgPrice).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {batch.sold_out_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Sold Out On</p>
                  <p className="text-sm font-medium">{format(new Date(batch.sold_out_at), 'PP')}</p>
                </div>
              )}
            </div>

            {/* Source Purchases */}
            {batch.sources.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  Source Purchases ({batch.sources.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {batch.sources.map((source) => {
                    const display = getSupplierDisplay(source);
                    const meta = sourceMetaMap[source.coffee_record_id] || {};
                    const price = sourcePriceMap[source.coffee_record_id];
                    return (
                      <div 
                        key={source.id} 
                        className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                      >
                        <div>
                          <p className="font-medium">{display.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            Delivered: {format(new Date(meta.deliveryDate || source.purchase_date), 'PP')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Input by: {meta.inputBy || '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-500">
                            +{source.kilograms.toLocaleString()} kg
                          </p>
                          {price ? (
                            <>
                              <p className="text-xs text-muted-foreground">
                                @ UGX {Math.round(price.unitPrice).toLocaleString()}/kg
                              </p>
                              <p className="text-xs font-medium text-foreground">
                                Paid: UGX {Math.round(price.totalCost).toLocaleString()}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">price n/a</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sales History */}
            {batch.sales.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4" />
                  Sales History ({batch.sales.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {batch.sales.map((sale) => (
                    <div 
                      key={sale.id} 
                      className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                    >
                      <div>
                        <p className="font-medium">{sale.customer_name || 'Unknown Customer'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.sale_date), 'PP')}
                        </p>
                      </div>
                      <span className="font-semibold text-red-500">
                        -{sale.kilograms_deducted.toLocaleString()} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default BatchCard;
