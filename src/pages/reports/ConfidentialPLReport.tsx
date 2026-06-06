import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subMonths } from "date-fns";
import { ArrowLeft, FileLock, Printer, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PurchaseRow = {
  id: string;
  date: string;
  supplier_name: string;
  batch_number: string;
  coffee_type: string;
  kilograms: number;
  final_price: number | null;
  cost: number;
};
type SaleRow = {
  date: string;
  customer: string;
  coffee_type: string;
  weight: number;
  unit_price: number;
  total_amount: number;
};
type PaymentRow = {
  date: string;
  supplier_id: string | null;
  amount_paid_ugx: number;
};

const fmt = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;
const kg = (n: number) => `${Number(n || 0).toLocaleString()} kg`;

const ConfidentialPLReport = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [generated, setGenerated] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const startISO = `${dateFrom}T00:00:00`;
      const endISO = `${dateTo}T23:59:59`;

      // Purchases: coffee_records + quality_assessments (final_price)
      const { data: crData, error: crErr } = await supabase
        .from("coffee_records")
        .select("id, date, supplier_name, supplier_id, batch_number, coffee_type, kilograms")
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: true })
        .limit(10000);
      if (crErr) throw crErr;

      const batchNumbers = (crData || []).map((r: any) => r.batch_number).filter(Boolean);
      let qaMap = new Map<string, { final_price: number | null; suggested_price: number | null }>();
      if (batchNumbers.length) {
        const { data: qaData } = await supabase
          .from("quality_assessments")
          .select("batch_number, final_price, suggested_price")
          .in("batch_number", batchNumbers);
        (qaData || []).forEach((q: any) =>
          qaMap.set(q.batch_number, { final_price: q.final_price, suggested_price: q.suggested_price })
        );
      }
      const purchaseRows: PurchaseRow[] = (crData || []).map((r: any) => {
        const q = qaMap.get(r.batch_number);
        const price = (q?.final_price ?? q?.suggested_price ?? 0) as number;
        const kgVal = Number(r.kilograms) || 0;
        return {
          id: r.id,
          date: r.date,
          supplier_name: r.supplier_name || "Unknown",
          batch_number: r.batch_number || "-",
          coffee_type: r.coffee_type || "-",
          kilograms: kgVal,
          final_price: price || null,
          cost: kgVal * (price || 0),
        };
      });
      setPurchases(purchaseRows);

      // Sales
      const { data: sData, error: sErr } = await supabase
        .from("sales_transactions")
        .select("date, customer, coffee_type, weight, unit_price, total_amount")
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("date", { ascending: true })
        .limit(10000);
      if (sErr) throw sErr;
      setSales(
        (sData || []).map((s: any) => ({
          date: s.date,
          customer: s.customer || "Unknown",
          coffee_type: s.coffee_type || "-",
          weight: Number(s.weight) || 0,
          unit_price: Number(s.unit_price) || 0,
          total_amount: Number(s.total_amount) || 0,
        }))
      );

      // Payments
      const { data: pData, error: pErr } = await supabase
        .from("supplier_payments")
        .select("payment_date, processed_at, created_at, supplier_id, amount_paid_ugx, status")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .limit(10000);
      if (pErr) throw pErr;
      setPayments(
        (pData || [])
          .filter((p: any) => (p.status || "").toLowerCase() !== "cancelled")
          .map((p: any) => ({
            date: p.payment_date || p.processed_at || p.created_at,
            supplier_id: p.supplier_id,
            amount_paid_ugx: Number(p.amount_paid_ugx) || 0,
          }))
      );

      setGenerated(true);
      toast.success("Report generated");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const totals = (() => {
    const purchKg = purchases.reduce((s, p) => s + p.kilograms, 0);
    const purchCost = purchases.reduce((s, p) => s + p.cost, 0);
    const salesKg = sales.reduce((s, p) => s + p.weight, 0);
    const salesRev = sales.reduce((s, p) => s + p.total_amount, 0);
    const paymentsTotal = payments.reduce((s, p) => s + p.amount_paid_ugx, 0);
    const avgBuy = purchKg > 0 ? purchCost / purchKg : 0;
    const avgSell = salesKg > 0 ? salesRev / salesKg : 0;
    const grossProfit = salesRev - purchCost;
    const cashBasisProfit = salesRev - paymentsTotal;
    // Matched P&L: apply weighted-average buy price to kg actually sold
    const cogs = salesKg * avgBuy;
    const matchedProfit = salesRev - cogs;
    const marginPct = salesRev > 0 ? (matchedProfit / salesRev) * 100 : 0;
    const profitPerKg = salesKg > 0 ? matchedProfit / salesKg : 0;
    const kgVariance = purchKg - salesKg; // + surplus stock, - sold from prior stock
    return {
      purchKg, purchCost, salesKg, salesRev, paymentsTotal,
      avgBuy, avgSell, grossProfit, cashBasisProfit,
      cogs, matchedProfit, marginPct, profitPerKg, kgVariance,
    };
  })();

  const applyPreset = (preset: string) => {
    const now = new Date();
    let from: Date, to: Date;
    switch (preset) {
      case "this-month": from = startOfMonth(now); to = endOfMonth(now); break;
      case "last-month": {
        const lm = subMonths(now, 1);
        from = startOfMonth(lm); to = endOfMonth(lm); break;
      }
      case "this-quarter": from = startOfQuarter(now); to = endOfQuarter(now); break;
      case "ytd": from = startOfYear(now); to = now; break;
      default: return;
    }
    setDateFrom(format(from, "yyyy-MM-dd"));
    setDateTo(format(to, "yyyy-MM-dd"));
  };

  // Group purchases by supplier
  const supplierBreakdown = (() => {
    const m = new Map<string, { kg: number; cost: number; batches: number }>();
    purchases.forEach((p) => {
      const cur = m.get(p.supplier_name) || { kg: 0, cost: 0, batches: 0 };
      cur.kg += p.kilograms;
      cur.cost += p.cost;
      cur.batches += 1;
      m.set(p.supplier_name, cur);
    });
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, ...v, avg: v.kg > 0 ? v.cost / v.kg : 0 }))
      .sort((a, b) => b.cost - a.cost);
  })();

  const customerBreakdown = (() => {
    const m = new Map<string, { kg: number; revenue: number; orders: number }>();
    sales.forEach((s) => {
      const cur = m.get(s.customer) || { kg: 0, revenue: 0, orders: 0 };
      cur.kg += s.weight;
      cur.revenue += s.total_amount;
      cur.orders += 1;
      m.set(s.customer, cur);
    });
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, ...v, avg: v.kg > 0 ? v.revenue / v.kg : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  })();

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Please allow pop-ups to print");
      return;
    }
    const periodStr = `${format(new Date(dateFrom), "MMM dd, yyyy")} – ${format(new Date(dateTo), "MMM dd, yyyy")}`;
    const purchaseRowsHtml = purchases
      .map(
        (p) => `
      <tr>
        <td>${format(new Date(p.date), "MMM dd, yyyy")}</td>
        <td>${p.supplier_name}</td>
        <td>${p.batch_number}</td>
        <td>${p.coffee_type}</td>
        <td class="r">${p.kilograms.toLocaleString()}</td>
        <td class="r">${p.final_price ? "UGX " + p.final_price.toLocaleString() : "—"}</td>
        <td class="r">${fmt(p.cost)}</td>
      </tr>`
      )
      .join("");
    const salesRowsHtml = sales
      .map(
        (s) => `
      <tr>
        <td>${format(new Date(s.date), "MMM dd, yyyy")}</td>
        <td>${s.customer}</td>
        <td>${s.coffee_type}</td>
        <td class="r">${s.weight.toLocaleString()}</td>
        <td class="r">UGX ${s.unit_price.toLocaleString()}</td>
        <td class="r">${fmt(s.total_amount)}</td>
      </tr>`
      )
      .join("");
    const supplierRowsHtml = supplierBreakdown
      .map(
        (s) => `
      <tr>
        <td>${s.name}</td>
        <td class="r">${s.batches}</td>
        <td class="r">${s.kg.toLocaleString()}</td>
        <td class="r">${fmt(s.avg)}</td>
        <td class="r">${fmt(s.cost)}</td>
      </tr>`
      )
      .join("");
    const customerRowsHtml = customerBreakdown
      .map(
        (c) => `
      <tr>
        <td>${c.name}</td>
        <td class="r">${c.orders}</td>
        <td class="r">${c.kg.toLocaleString()}</td>
        <td class="r">${fmt(c.avg)}</td>
        <td class="r">${fmt(c.revenue)}</td>
      </tr>`
      )
      .join("");

    w.document.write(`<!DOCTYPE html><html><head><title>Confidential P&L — ${periodStr}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      body { font-family: 'Helvetica', Arial, sans-serif; color: #1a1a1a; font-size: 11px; position: relative; }
      .watermark { position: fixed; top: 38%; left: 0; right: 0; text-align: center; font-size: 110px; color: rgba(220,38,38,0.08); font-weight: 900; transform: rotate(-28deg); pointer-events: none; z-index: 0; letter-spacing: 8px; }
      .header { border-bottom: 3px double #1a5632; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
      .brand h1 { margin: 0; color: #1a5632; font-size: 22px; letter-spacing: 1px; }
      .brand p { margin: 2px 0; color: #555; font-size: 10px; }
      .conf { text-align: right; }
      .conf .badge { background: #dc2626; color: #fff; padding: 4px 10px; font-weight: bold; font-size: 11px; letter-spacing: 2px; border-radius: 2px; }
      .conf .ref { font-size: 9px; color: #777; margin-top: 6px; }
      h2 { color: #1a5632; border-bottom: 1px solid #1a5632; padding-bottom: 3px; margin-top: 18px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th, td { padding: 4px 6px; border-bottom: 1px solid #e5e5e5; text-align: left; font-size: 10px; }
      th { background: #f1f5f4; color: #1a5632; font-weight: bold; text-transform: uppercase; font-size: 9px; }
      td.r, th.r { text-align: right; }
      tfoot td { font-weight: bold; background: #f1f5f4; border-top: 2px solid #1a5632; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
      .stat { border: 1px solid #d4d4d4; padding: 10px; border-radius: 4px; background: #fafafa; }
      .stat .lbl { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .stat .val { font-size: 14px; font-weight: bold; color: #1a1a1a; margin-top: 4px; }
      .stat.profit { background: ${totals.grossProfit >= 0 ? "#dcfce7" : "#fee2e2"}; border-color: ${totals.grossProfit >= 0 ? "#16a34a" : "#dc2626"}; }
      .stat.profit .val { color: ${totals.grossProfit >= 0 ? "#15803d" : "#b91c1c"}; }
      .footer { margin-top: 24px; border-top: 1px solid #999; padding-top: 8px; font-size: 9px; color: #666; }
      .footer strong { color: #dc2626; }
    </style></head><body>
      <div class="watermark">CONFIDENTIAL</div>
      <div class="header">
        <div class="brand">
          <h1>GREAT AGRO COFFEE</h1>
          <p>Coffee Trading & Export • Uganda</p>
          <p>Confidential Profit &amp; Loss Statement</p>
        </div>
        <div class="conf">
          <span class="badge">CONFIDENTIAL</span>
          <div class="ref">Ref: PL-${format(new Date(), "yyyyMMdd-HHmmss")}</div>
          <div class="ref">Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}</div>
          <div class="ref">Period: ${periodStr}</div>
        </div>
      </div>

      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="stat"><div class="lbl">Total Bought</div><div class="val">${totals.purchKg.toLocaleString()} kg</div></div>
        <div class="stat"><div class="lbl">Purchase Cost</div><div class="val">${fmt(totals.purchCost)}</div></div>
        <div class="stat"><div class="lbl">Total Sold</div><div class="val">${totals.salesKg.toLocaleString()} kg</div></div>
        <div class="stat"><div class="lbl">Sales Revenue</div><div class="val">${fmt(totals.salesRev)}</div></div>
        <div class="stat"><div class="lbl">Avg Buy Price/kg</div><div class="val">${fmt(totals.avgBuy)}</div></div>
        <div class="stat"><div class="lbl">Avg Sell Price/kg</div><div class="val">${fmt(totals.avgSell)}</div></div>
        <div class="stat"><div class="lbl">Cash Paid to Suppliers</div><div class="val">${fmt(totals.paymentsTotal)}</div></div>
        <div class="stat profit"><div class="lbl">Net Profit (Period)</div><div class="val">${fmt(totals.grossProfit)}</div></div>
      </div>

      <h2>Supplier Deliveries (Purchases)</h2>
      <table>
        <thead><tr><th>Supplier</th><th class="r">Batches</th><th class="r">Kg Delivered</th><th class="r">Avg Price/kg</th><th class="r">Total Cost</th></tr></thead>
        <tbody>${supplierRowsHtml || `<tr><td colspan="5" style="text-align:center;color:#999">No purchases in this period</td></tr>`}</tbody>
        <tfoot><tr><td>TOTAL</td><td class="r">${purchases.length}</td><td class="r">${totals.purchKg.toLocaleString()}</td><td class="r">${fmt(totals.avgBuy)}</td><td class="r">${fmt(totals.purchCost)}</td></tr></tfoot>
      </table>

      <h2>Sales by Customer</h2>
      <table>
        <thead><tr><th>Customer</th><th class="r">Orders</th><th class="r">Kg Sold</th><th class="r">Avg Price/kg</th><th class="r">Revenue</th></tr></thead>
        <tbody>${customerRowsHtml || `<tr><td colspan="5" style="text-align:center;color:#999">No sales in this period</td></tr>`}</tbody>
        <tfoot><tr><td>TOTAL</td><td class="r">${sales.length}</td><td class="r">${totals.salesKg.toLocaleString()}</td><td class="r">${fmt(totals.avgSell)}</td><td class="r">${fmt(totals.salesRev)}</td></tr></tfoot>
      </table>

      <h2>Detailed Purchases (Batch Level)</h2>
      <table>
        <thead><tr><th>Date</th><th>Supplier</th><th>Batch</th><th>Type</th><th class="r">Kg</th><th class="r">Price/kg</th><th class="r">Cost</th></tr></thead>
        <tbody>${purchaseRowsHtml || `<tr><td colspan="7" style="text-align:center;color:#999">—</td></tr>`}</tbody>
      </table>

      <h2>Detailed Sales</h2>
      <table>
        <thead><tr><th>Date</th><th>Customer</th><th>Type</th><th class="r">Kg</th><th class="r">Price/kg</th><th class="r">Revenue</th></tr></thead>
        <tbody>${salesRowsHtml || `<tr><td colspan="6" style="text-align:center;color:#999">—</td></tr>`}</tbody>
      </table>

      <h2>Profitability Analysis</h2>
      <table>
        <tbody>
          <tr><td>Sales Revenue</td><td class="r">${fmt(totals.salesRev)}</td></tr>
          <tr><td>Less: Cost of Coffee Purchased (period)</td><td class="r">(${fmt(totals.purchCost)})</td></tr>
          <tr style="background:#dcfce7;font-weight:bold"><td>NET PROFIT (Accrual Basis)</td><td class="r">${fmt(totals.grossProfit)}</td></tr>
          <tr><td colspan="2" style="height:8px;border:none"></td></tr>
          <tr><td>Sales Revenue</td><td class="r">${fmt(totals.salesRev)}</td></tr>
          <tr><td>Less: Cash Paid to Suppliers (period)</td><td class="r">(${fmt(totals.paymentsTotal)})</td></tr>
          <tr style="background:#dbeafe;font-weight:bold"><td>NET CASHFLOW (Cash Basis)</td><td class="r">${fmt(totals.cashBasisProfit)}</td></tr>
        </tbody>
      </table>

      <div class="footer">
        <strong>STRICTLY CONFIDENTIAL.</strong> This document contains proprietary financial information of Great Agro Coffee.
        Unauthorized disclosure, reproduction, or distribution is strictly prohibited and may result in legal action.
        Intended solely for the executive recipient.
      </div>
      <script>window.onload = () => { window.print(); };</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <Layout title="Confidential P&L Report" subtitle="Executive profit & loss — buying, selling, net profit">
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate("/reports")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Button>

        <Card className="border-red-300 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <FileLock className="h-5 w-5" /> Strictly Confidential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-900">
              This report contains sensitive financial information. The printable version is watermarked
              <strong> CONFIDENTIAL </strong> with company header and is intended for executive use only.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from">From</Label>
                <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={load} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileLock className="h-4 w-4" />}
                  {loading ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {generated && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase">Total Bought</p>
                <p className="text-2xl font-bold">{kg(totals.purchKg)}</p>
                <p className="text-xs text-muted-foreground">{fmt(totals.purchCost)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase">Total Sold</p>
                <p className="text-2xl font-bold">{kg(totals.salesKg)}</p>
                <p className="text-xs text-muted-foreground">{fmt(totals.salesRev)}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase">Cash Paid</p>
                <p className="text-2xl font-bold">{fmt(totals.paymentsTotal)}</p>
                <p className="text-xs text-muted-foreground">to suppliers</p>
              </CardContent></Card>
              <Card className={totals.grossProfit >= 0 ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase">Net Profit</p>
                  <p className={`text-2xl font-bold ${totals.grossProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(totals.grossProfit)}</p>
                  <p className="text-xs text-muted-foreground">Revenue − Cost</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Supplier Breakdown ({supplierBreakdown.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left p-2">Supplier</th>
                    <th className="text-right p-2">Batches</th>
                    <th className="text-right p-2">Kg</th>
                    <th className="text-right p-2">Avg Price</th>
                    <th className="text-right p-2">Cost</th>
                  </tr></thead>
                  <tbody>
                    {supplierBreakdown.map((s) => (
                      <tr key={s.name} className="border-b">
                        <td className="p-2">{s.name}</td>
                        <td className="p-2 text-right">{s.batches}</td>
                        <td className="p-2 text-right">{s.kg.toLocaleString()}</td>
                        <td className="p-2 text-right">{fmt(s.avg)}</td>
                        <td className="p-2 text-right font-medium">{fmt(s.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Breakdown ({customerBreakdown.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left p-2">Customer</th>
                    <th className="text-right p-2">Orders</th>
                    <th className="text-right p-2">Kg</th>
                    <th className="text-right p-2">Avg Price</th>
                    <th className="text-right p-2">Revenue</th>
                  </tr></thead>
                  <tbody>
                    {customerBreakdown.map((c) => (
                      <tr key={c.name} className="border-b">
                        <td className="p-2">{c.name}</td>
                        <td className="p-2 text-right">{c.orders}</td>
                        <td className="p-2 text-right">{c.kg.toLocaleString()}</td>
                        <td className="p-2 text-right">{fmt(c.avg)}</td>
                        <td className="p-2 text-right font-medium">{fmt(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handlePrint} size="lg" className="gap-2 bg-red-700 hover:bg-red-800">
                <Printer className="h-4 w-4" /> Print Confidential Report
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ConfidentialPLReport;