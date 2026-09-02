import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileBarChart, Printer, Package, Leaf, ClipboardList, ShoppingCart } from "lucide-react";
import { COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_PHONES } from "@/utils/companyBrand";

const n = (v: any) => (v === "" || v === null || v === undefined ? 0 : Number(v) || 0);
const fmt = (v: number) => n(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

const ComprehensiveReports = () => {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);

  const { data, isLoading } = useQuery({
    queryKey: ["procurement-comprehensive-reports", from, to],
    queryFn: async () => {
      const [purchases, eudr, clearance, sales, contracts, allocations] = await Promise.all([
        (supabase as any).from("coffee_records").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }).limit(1000),
        (supabase as any).from("eudr_dispatch_reports").select("*").gte("dispatch_date", from).lte("dispatch_date", to).order("dispatch_date", { ascending: false }).limit(500),
        (supabase as any).from("store_clearance_forms").select("*").gte("clearance_date", from).lte("clearance_date", to).order("clearance_date", { ascending: false }).limit(500),
        (supabase as any).from("sales_transactions").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }).limit(1000),
        (supabase as any).from("buyer_contracts").select("*").order("created_at", { ascending: false }).limit(300),
        (supabase as any).from("contract_allocations").select("*").limit(2000),
      ]);
      return {
        purchases: (purchases.data || []) as any[],
        eudr: (eudr.data || []) as any[],
        clearance: (clearance.data || []) as any[],
        sales: (sales.data || []) as any[],
        contracts: (contracts.data || []) as any[],
        allocations: (allocations.data || []) as any[],
      };
    },
  });

  const purchases = data?.purchases || [];
  const eudr = data?.eudr || [];
  const clearance = data?.clearance || [];
  const sales = data?.sales || [];
  const contracts = data?.contracts || [];
  const allocations = data?.allocations || [];

  const byContract = useMemo(() => {
    const norm = (v: any) => String(v || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const salesById = new Map(sales.map((s: any) => [s.id, s]));
    return contracts.map((c: any) => {
      const contractClearances = clearance.filter((f: any) => f.contract_id === c.id);
      const released = contractClearances.reduce((s2: number, f: any) => s2 + n(f.total_weight_kg), 0);
      const dispatched = contractClearances.reduce((s2: number, f: any) => {
        const rep = eudr.find((r: any) =>
          f.dispatch_report_id ? r.id === f.dispatch_report_id
            : norm(f.vehicle_registration).length > 3 && norm(r.vehicle_registrations).includes(norm(f.vehicle_registration)));
        if (!rep || !Array.isArray(rep.trucks)) return s2;
        return s2 + rep.trucks.reduce((t: number, x: any) => t + n(x.total_weight_store), 0);
      }, 0);
      const contractAllocs = allocations.filter((a: any) => a.contract_id === c.id);
      const allocated = contractAllocs.reduce((s2: number, a: any) => s2 + n(a.allocated_kg), 0) || n(c.allocated_quantity);
      const sold = contractAllocs.reduce((s2: number, a: any) => {
        const sale: any = salesById.get(a.sale_id);
        return s2 + (sale ? n(sale.weight) : n(a.allocated_kg));
      }, 0);
      return {
        contract: c,
        forms: contractClearances.length,
        contracted: n(c.total_quantity),
        allocated, released, dispatched, sold,
        releasedVsDispatched: dispatched - released,
        allocatedVsReleased: released - allocated,
        releasedVsSold: sold - released,
      };
    }).sort((a: any, b: any) => b.released - a.released);
  }, [contracts, clearance, eudr, allocations, sales]);

  const totals = useMemo(() => {
    const purchasedKg = purchases.reduce((s, r) => s + n(r.kilograms), 0);
    const purchasedBags = purchases.reduce((s, r) => s + n(r.bags), 0);
    const soldKg = sales.reduce((s, r) => s + n(r.weight), 0);
    const salesValue = sales.reduce((s, r) => s + n(r.total_amount), 0);
    const clearedKg = clearance.reduce((s, r) => s + n(r.total_weight_kg), 0);
    const clearedBags = clearance.reduce((s, r) => s + n(r.total_bags), 0);
    const dispatchedKg = eudr.reduce(
      (s, r) => s + (Array.isArray(r.trucks) ? r.trucks.reduce((t: number, x: any) => t + n(x.total_weight_store), 0) : 0),
      0,
    );
    const buyerKg = eudr.reduce(
      (s, r) => s + (Array.isArray(r.buyer_verification) ? r.buyer_verification.reduce((t: number, x: any) => t + n(x.buyer_weight), 0) : 0),
      0,
    );
    return {
      purchasedKg, purchasedBags, soldKg, salesValue, clearedKg, clearedBags, dispatchedKg, buyerKg,
      clearedVsDispatched: dispatchedKg - clearedKg,
      dispatchedVsBuyer: buyerKg - dispatchedKg,
      soldVsCleared: clearedKg - soldKg,
      stockMovementBalance: purchasedKg - clearedKg,
    };
  }, [purchases, eudr, clearance, sales]);

  const printComprehensive = () => {
    const rows = (arr: any[][], head: string[]) => `
      <table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${arr.length === 0 ? `<tr><td colspan="${head.length}" style="text-align:center;color:#777">No records</td></tr>` : arr.map((r) => `<tr>${r.map((c) => `<td>${c ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comprehensive Procurement Report</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:11px}
      h1{font-size:18px;margin:0}
      h2{font-size:13px;margin:18px 0 6px;border-bottom:2px solid #111;padding-bottom:3px;text-transform:uppercase}
      .head{text-align:center;border-bottom:3px double #111;padding-bottom:8px;margin-bottom:12px}
      .muted{color:#555;font-size:10px}
      table{width:100%;border-collapse:collapse;margin-top:4px}
      th,td{border:1px solid #999;padding:4px 5px;text-align:left}
      th{background:#eee;font-size:10px;text-transform:uppercase}
      .summary td{font-weight:bold}
      .sig{display:flex;justify-content:space-between;margin-top:36px}
      .sig div{width:30%;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:10px}
      @media print{body{margin:10mm}}
    </style></head><body>
    <div class="head">
      <h1>${COMPANY_NAME}</h1>
      <div class="muted">${COMPANY_TAGLINE} · ${COMPANY_ADDRESS} · ${COMPANY_PHONES}</div>
      <h2 style="border:none;margin:8px 0 0">Comprehensive Procurement Report</h2>
      <div class="muted">Period: ${from} to ${to} · Generated: ${new Date().toLocaleString()}</div>
    </div>

    <h2>Executive Summary</h2>
    <table class="summary">
      <tr><td>Coffee purchased (store)</td><td>${fmt(totals.purchasedKg)} kg / ${fmt(totals.purchasedBags)} bags</td>
          <td>Coffee cleared from store</td><td>${fmt(totals.clearedKg)} kg / ${fmt(totals.clearedBags)} bags</td></tr>
      <tr><td>Dispatch weighed (store scale)</td><td>${fmt(totals.dispatchedKg)} kg</td>
          <td>Buyer weighed</td><td>${fmt(totals.buyerKg)} kg</td></tr>
      <tr><td>Coffee sold</td><td>${fmt(totals.soldKg)} kg</td>
          <td>Sales value</td><td>UGX ${fmt(totals.salesValue)}</td></tr>
      <tr><td>Cleared vs Dispatch variance</td><td>${fmt(totals.clearedVsDispatched)} kg</td>
          <td>Dispatch vs Buyer variance</td><td>${fmt(totals.dispatchedVsBuyer)} kg</td></tr>
      <tr><td>Purchases minus clearances</td><td>${fmt(totals.stockMovementBalance)} kg</td>
          <td>Cleared vs Sold variance</td><td>${fmt(totals.soldVsCleared)} kg</td></tr>
    </table>

    <h2>1. Store Purchase Report</h2>
    ${rows(purchases.map((r) => [r.date, r.batch_number, r.supplier_name, r.coffee_type, fmt(r.bags), fmt(r.kilograms), r.status]),
      ["Date", "Batch", "Supplier", "Type", "Bags", "Kg", "Status"])}

    <h2>2. EUDR / Dispatch Report</h2>
    ${rows(eudr.map((r) => [r.dispatch_date, r.destination_buyer, r.coffee_type, r.vehicle_registrations,
      fmt(Array.isArray(r.trucks) ? r.trucks.reduce((t: number, x: any) => t + n(x.total_weight_store), 0) : 0),
      fmt(Array.isArray(r.buyer_verification) ? r.buyer_verification.reduce((t: number, x: any) => t + n(x.buyer_weight), 0) : 0),
      r.status]),
      ["Date", "Buyer", "Type", "Vehicle", "Store Kg", "Buyer Kg", "Status"])}

    <h2>3. Store Clearance Report</h2>
    ${rows(clearance.map((r) => [r.clearance_date, r.form_number, r.warehouse, r.destination_buyer, r.vehicle_registration,
      fmt(r.total_bags), fmt(r.total_weight_kg)]),
      ["Date", "Form No.", "Warehouse", "Buyer", "Vehicle", "Bags", "Kg"])}

    <h2>4. Contract Reconciliation (Allocated vs Released vs Dispatched vs Sold)</h2>
    ${rows(byContract.map((r) => [r.contract.contract_ref || "—", r.contract.buyer_name, fmt(r.contracted), fmt(r.allocated),
      fmt(r.released), fmt(r.dispatched), fmt(r.sold), fmt(r.releasedVsDispatched), fmt(r.releasedVsSold)]),
      ["Contract", "Buyer", "Contracted Kg", "Allocated Kg", "Released Kg", "Dispatched Kg", "Sold Kg", "Rel vs Disp", "Rel vs Sold"])}

    <h2>5. Sales Report</h2>
    ${rows(sales.map((r) => [r.date, r.customer, r.coffee_type, fmt(r.weight), fmt(r.unit_price), fmt(r.total_amount), r.status]),
      ["Date", "Customer", "Type", "Kg", "Unit Price", "Total (UGX)", "Status"])}

    <div class="sig"><div>Procurement Manager</div><div>Store Manager</div><div>Administrator</div></div>
    </body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const StatCard = ({ icon: Icon, label, value, sub }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5" /> Procurement Reports Hub</CardTitle>
          <CardDescription>Review store purchases, EUDR dispatches, store clearances and sales, then generate one comprehensive report.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={printComprehensive} disabled={isLoading}>
            <Printer className="h-4 w-4 mr-2" /> Create Comprehensive Report
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Package} label="Purchased" value={`${fmt(totals.purchasedKg)} kg`} sub={`${fmt(totals.purchasedBags)} bags`} />
            <StatCard icon={ClipboardList} label="Cleared from store" value={`${fmt(totals.clearedKg)} kg`} sub={`${clearance.length} forms`} />
            <StatCard icon={Leaf} label="Dispatch weighed" value={`${fmt(totals.dispatchedKg)} kg`} sub={`buyer: ${fmt(totals.buyerKg)} kg`} />
            <StatCard icon={ShoppingCart} label="Sold" value={`${fmt(totals.soldKg)} kg`} sub={`UGX ${fmt(totals.salesValue)}`} />
          </div>

          <Tabs defaultValue="purchases">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="purchases">Store Purchases</TabsTrigger>
              <TabsTrigger value="eudr">EUDR / Dispatch</TabsTrigger>
              <TabsTrigger value="clearance">Store Clearance</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            </TabsList>

            <TabsContent value="purchases" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Batch</TableHead><TableHead>Supplier</TableHead>
                    <TableHead>Type</TableHead><TableHead className="text-right">Bags</TableHead>
                    <TableHead className="text-right">Kg</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {purchases.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No purchases in this period</TableCell></TableRow>
                      : purchases.slice(0, 200).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.date}</TableCell>
                          <TableCell className="font-mono text-xs">{r.batch_number || "—"}</TableCell>
                          <TableCell>{r.supplier_name || "—"}</TableCell>
                          <TableCell>{r.coffee_type || "—"}</TableCell>
                          <TableCell className="text-right">{fmt(r.bags)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(r.kilograms)}</TableCell>
                          <TableCell><Badge variant="secondary">{r.status || "—"}</Badge></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="eudr" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Buyer</TableHead><TableHead>Type</TableHead>
                    <TableHead>Vehicle</TableHead><TableHead className="text-right">Store Kg</TableHead>
                    <TableHead className="text-right">Buyer Kg</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {eudr.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No dispatch reports in this period</TableCell></TableRow>
                      : eudr.map((r) => {
                        const store = Array.isArray(r.trucks) ? r.trucks.reduce((t: number, x: any) => t + n(x.total_weight_store), 0) : 0;
                        const buyer = Array.isArray(r.buyer_verification) ? r.buyer_verification.reduce((t: number, x: any) => t + n(x.buyer_weight), 0) : 0;
                        return (
                          <TableRow key={r.id}>
                            <TableCell>{r.dispatch_date}</TableCell>
                            <TableCell>{r.destination_buyer || "—"}</TableCell>
                            <TableCell>{r.coffee_type || "—"}</TableCell>
                            <TableCell className="font-mono text-xs">{r.vehicle_registrations || "—"}</TableCell>
                            <TableCell className="text-right">{fmt(store)}</TableCell>
                            <TableCell className="text-right">{fmt(buyer)}</TableCell>
                            <TableCell><Badge variant="secondary">{r.status || "—"}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="clearance" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Form No.</TableHead><TableHead>Warehouse</TableHead>
                    <TableHead>Buyer</TableHead><TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Bags</TableHead><TableHead className="text-right">Kg</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {clearance.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No clearance forms in this period</TableCell></TableRow>
                      : clearance.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.clearance_date}</TableCell>
                          <TableCell className="font-mono text-xs">{r.form_number || "—"}</TableCell>
                          <TableCell>{r.warehouse || "—"}</TableCell>
                          <TableCell>{r.destination_buyer || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{r.vehicle_registration}</TableCell>
                          <TableCell className="text-right">{fmt(r.total_bags)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(r.total_weight_kg)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="sales" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Type</TableHead>
                    <TableHead className="text-right">Kg</TableHead><TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total (UGX)</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {sales.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No sales in this period</TableCell></TableRow>
                      : sales.slice(0, 200).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>{r.customer || "—"}</TableCell>
                          <TableCell>{r.coffee_type || "—"}</TableCell>
                          <TableCell className="text-right">{fmt(r.weight)}</TableCell>
                          <TableCell className="text-right">{fmt(r.unit_price)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(r.total_amount)}</TableCell>
                          <TableCell><Badge variant="secondary">{r.status || "—"}</Badge></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="contracts" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Contract — Allocated vs Released vs Dispatched vs Sold</CardTitle>
                  <CardDescription>Store clearances linked to a buyer contract, matched to their dispatch reports and allocated sales.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Contract</TableHead><TableHead>Buyer</TableHead>
                      <TableHead className="text-right">Contracted</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Released</TableHead>
                      <TableHead className="text-right">Dispatched</TableHead>
                      <TableHead className="text-right">Sold</TableHead>
                      <TableHead className="text-right">Rel vs Disp</TableHead>
                      <TableHead className="text-right">Rel vs Sold</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {byContract.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No contracts yet</TableCell></TableRow>
                      ) : byContract.map((r: any) => (
                        <TableRow key={r.contract.id}>
                          <TableCell className="font-mono text-xs">{r.contract.contract_ref || "—"}</TableCell>
                          <TableCell>{r.contract.buyer_name || "—"}</TableCell>
                          <TableCell className="text-right">{fmt(r.contracted)}</TableCell>
                          <TableCell className="text-right">{fmt(r.allocated)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(r.released)} <span className="text-xs text-muted-foreground">({r.forms})</span></TableCell>
                          <TableCell className="text-right">{fmt(r.dispatched)}</TableCell>
                          <TableCell className="text-right">{fmt(r.sold)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Math.abs(r.releasedVsDispatched) < 0.5 ? "secondary" : r.releasedVsDispatched < 0 ? "destructive" : "default"}>{fmt(r.releasedVsDispatched)} kg</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Math.abs(r.releasedVsSold) < 0.5 ? "secondary" : r.releasedVsSold < 0 ? "destructive" : "default"}>{fmt(r.releasedVsSold)} kg</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reconciliation" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Period Reconciliation</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow><TableCell>Purchased into store</TableCell><TableCell className="text-right font-semibold">{fmt(totals.purchasedKg)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Cleared / released from store</TableCell><TableCell className="text-right font-semibold">{fmt(totals.clearedKg)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Purchases minus clearances</TableCell><TableCell className="text-right font-semibold">{fmt(totals.stockMovementBalance)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Dispatch weighed at store</TableCell><TableCell className="text-right font-semibold">{fmt(totals.dispatchedKg)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Cleared vs Dispatch variance</TableCell><TableCell className="text-right font-semibold">{fmt(totals.clearedVsDispatched)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Buyer weighed</TableCell><TableCell className="text-right font-semibold">{fmt(totals.buyerKg)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Dispatch vs Buyer variance</TableCell><TableCell className="text-right font-semibold">{fmt(totals.dispatchedVsBuyer)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Sold</TableCell><TableCell className="text-right font-semibold">{fmt(totals.soldKg)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Cleared vs Sold variance</TableCell><TableCell className="text-right font-semibold">{fmt(totals.soldVsCleared)} kg</TableCell></TableRow>
                      <TableRow><TableCell>Sales value</TableCell><TableCell className="text-right font-semibold">UGX {fmt(totals.salesValue)}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ComprehensiveReports;
