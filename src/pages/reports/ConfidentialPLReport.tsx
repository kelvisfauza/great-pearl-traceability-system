import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subMonths } from "date-fns";
import { ArrowLeft, FileLock, Printer, Loader2, AlertTriangle, Wand2 } from "lucide-react";
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

const normalizeType = (t: string | null | undefined): "Arabica" | "Robusta" | "Other" => {
  const v = (t || "").toString().trim().toLowerCase();
  if (v.startsWith("arab")) return "Arabica";
  if (v.startsWith("rob")) return "Robusta";
  return "Other";
};

type Opening = Record<"Arabica" | "Robusta" | "Other", number>;
const EMPTY_OPENING: Opening = { Arabica: 0, Robusta: 0, Other: 0 };

const ConfidentialPLReport = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [openingStock, setOpeningStock] = useState<Opening>(EMPTY_OPENING);
  const [generated, setGenerated] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

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

      // Opening stock per coffee type (all history strictly before period)
      const opening: Opening = { Arabica: 0, Robusta: 0, Other: 0 };
      const PAGE = 1000;
      // Purchases before period
      for (let from = 0; from < 200000; from += PAGE) {
        const { data, error } = await supabase
          .from("coffee_records")
          .select("coffee_type, kilograms")
          .lt("date", dateFrom)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data || []) as any[];
        rows.forEach((r) => {
          const t = normalizeType(r.coffee_type);
          opening[t] += Number(r.kilograms) || 0;
        });
        if (rows.length < PAGE) break;
      }
      // Sales before period (deducted)
      for (let from = 0; from < 200000; from += PAGE) {
        const { data, error } = await supabase
          .from("sales_transactions")
          .select("coffee_type, weight")
          .lt("date", dateFrom)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data || []) as any[];
        rows.forEach((r) => {
          const t = normalizeType(r.coffee_type);
          opening[t] -= Number(r.weight) || 0;
        });
        if (rows.length < PAGE) break;
      }
      setOpeningStock(opening);

      setGenerated(true);
      toast.success("Report generated");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const reportSales = (() : SaleRow[] => {
    if (!generated) return [];

    const purchaseByTypeDate = new Map<string, number>();
    purchases.forEach((p) => {
      const type = normalizeType(p.coffee_type);
      const key = `${type}__${p.date}`;
      purchaseByTypeDate.set(key, (purchaseByTypeDate.get(key) || 0) + p.kilograms);
    });

    const available: Opening = { ...openingStock };
    const purchasesApplied = new Set<string>();

    return [...sales]
      .sort((a, b) => a.date.localeCompare(b.date))
      .flatMap((s) => {
        const type = normalizeType(s.coffee_type);
        const dateKey = `${type}__${s.date}`;

        if (!purchasesApplied.has(dateKey)) {
          available[type] += purchaseByTypeDate.get(dateKey) || 0;
          purchasesApplied.add(dateKey);
        }

        const requestedWeight = Number(s.weight) || 0;
        const matchedWeight = Math.max(0, Math.min(requestedWeight, available[type] || 0));

        if (matchedWeight <= 0.01) return [];

        available[type] -= matchedWeight;

        const unitPrice = Number(s.unit_price) || 0;
        const matchedAmount = unitPrice > 0
          ? matchedWeight * unitPrice
          : requestedWeight > 0
            ? (Number(s.total_amount) || 0) * (matchedWeight / requestedWeight)
            : 0;

        return [{
          ...s,
          coffee_type: type === "Other" ? (s.coffee_type || "Other") : type,
          weight: matchedWeight,
          total_amount: matchedAmount,
        }];
      });
  })();

  const totals = (() => {
    const purchKg = purchases.reduce((s, p) => s + p.kilograms, 0);
    const purchCost = purchases.reduce((s, p) => s + p.cost, 0);
    const salesKg = reportSales.reduce((s, p) => s + p.weight, 0);
    const salesRev = reportSales.reduce((s, p) => s + p.total_amount, 0);
    const paymentsTotal = payments.reduce((s, p) => s + p.amount_paid_ugx, 0);
    const avgBuy = purchKg > 0 ? purchCost / purchKg : 0;
    const avgSell = salesKg > 0 ? salesRev / salesKg : 0;
    const grossProfit = salesRev - cogs;
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
    reportSales.forEach((s) => {
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

  // Per coffee-type matched P&L
  const TYPES: Array<"Arabica" | "Robusta"> = ["Arabica", "Robusta"];
  const byType = TYPES.map((type) => {
    const tp = purchases.filter((p) => normalizeType(p.coffee_type) === type);
    const ts = reportSales.filter((s) => normalizeType(s.coffee_type) === type);
    const purchKg = tp.reduce((a, b) => a + b.kilograms, 0);
    const purchCost = tp.reduce((a, b) => a + b.cost, 0);
    const salesKg = ts.reduce((a, b) => a + b.weight, 0);
    const salesRev = ts.reduce((a, b) => a + b.total_amount, 0);
    const avgBuy = purchKg > 0 ? purchCost / purchKg : 0;
    const avgSell = salesKg > 0 ? salesRev / salesKg : 0;
    const cogs = salesKg * avgBuy;
    const matchedProfit = salesRev - cogs;
    const marginPct = salesRev > 0 ? (matchedProfit / salesRev) * 100 : 0;
    const openStock = openingStock[type] || 0;
    const closeStock = openStock + purchKg - salesKg;
    return { type, purchKg, purchCost, salesKg, salesRev, avgBuy, avgSell, cogs, matchedProfit, marginPct, openStock, closeStock };
  });

  // Daily flow per type — running stock from opening, flags impossibilities (running < 0)
  const dailyFlow = (type: "Arabica" | "Robusta") => {
    const days = new Map<string, { bought: number; sold: number; cost: number; revenue: number }>();
    purchases.filter((p) => normalizeType(p.coffee_type) === type).forEach((p) => {
      const d = days.get(p.date) || { bought: 0, sold: 0, cost: 0, revenue: 0 };
      d.bought += p.kilograms; d.cost += p.cost;
      days.set(p.date, d);
    });
    reportSales.filter((s) => normalizeType(s.coffee_type) === type).forEach((s) => {
      const d = days.get(s.date) || { bought: 0, sold: 0, cost: 0, revenue: 0 };
      d.sold += s.weight; d.revenue += s.total_amount;
      days.set(s.date, d);
    });
    let running = openingStock[type] || 0;
    return Array.from(days.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        running += v.bought - v.sold;
        return { date, ...v, running, impossible: running < -0.01, soldMoreThanDay: v.sold > v.bought && v.bought > 0 };
      });
  };

  const arabicaDaily = generated ? dailyFlow("Arabica") : [];
  const robustaDaily = generated ? dailyFlow("Robusta") : [];
  const impossibleDays = [...arabicaDaily, ...robustaDaily].filter((d) => d.impossible);

  // Compute per-day deficits to backfill: walks flow in order, whenever running<0
  // records the gap and resets running to 0 (next deficit is incremental).
  const computeDeficits = (type: "Arabica" | "Robusta") => {
    const rows = type === "Arabica" ? arabicaDaily : robustaDaily;
    const deficits: Array<{ date: string; missingKg: number }> = [];
    let running = openingStock[type] || 0;
    rows.forEach((d) => {
      running += d.bought - d.sold;
      if (running < -0.01) {
        deficits.push({ date: d.date, missingKg: Math.ceil(-running) });
        running = 0;
      }
    });
    return deficits;
  };

  const handleAutoFill = async () => {
    const plan: Array<{ type: "Arabica" | "Robusta"; date: string; missingKg: number; price: number }> = [];
    for (const type of TYPES) {
      const t = byType.find((b) => b.type === type)!;
      // Period avg buy price; fallback to avg sell - 1500 (rough margin) or 8000 default
      let price = t.avgBuy;
      if (!price || price <= 0) price = Math.max(0, t.avgSell - 1500);
      if (!price || price <= 0) price = type === "Arabica" ? 12000 : 8000;
      const defs = computeDeficits(type);
      defs.forEach((d) => plan.push({ type, date: d.date, missingKg: d.missingKg, price: Math.round(price) }));
    }
    if (plan.length === 0) {
      toast.info("No missing purchases detected for this period");
      return;
    }
    const totalKg = plan.reduce((s, p) => s + p.missingKg, 0);
    if (!window.confirm(
      `Auto-create ${plan.length} synthetic purchase record(s) totaling ${totalKg.toLocaleString()} kg ` +
      `to cover the missing stock?\n\nEach record will use the period's average buy price per type. ` +
      `They will be tagged with supplier "SYSTEM AUTO-FILL" and a special batch number so you can find them later.`
    )) return;

    setAutoFilling(true);
    try {
      let inserted = 0;
      for (const item of plan) {
        const ts = Date.now();
        const batch = `AUTOFILL-${item.type.slice(0, 3).toUpperCase()}-${item.date}-${ts}`;
        const recordId = `autofill-${item.type.toLowerCase()}-${item.date}-${ts}`;
        const bags = Math.max(1, Math.round(item.missingKg / 60));
        const { error: crErr } = await (supabase as any)
          .from("coffee_records")
          .insert({
            id: recordId,
            date: item.date,
            coffee_type: item.type,
            kilograms: item.missingKg,
            bags,
            supplier_name: "SYSTEM AUTO-FILL",
            batch_number: batch,
            status: "inventory",
            created_by: "system-auto-fill",
          });
        if (crErr) throw crErr;
        const { error: qaErr } = await (supabase as any)
          .from("quality_assessments")
          .insert({
            store_record_id: recordId,
            batch_number: batch,
            final_price: item.price,
            suggested_price: item.price,
            status: "approved",
            date_assessed: item.date,
            assessed_by: "system-auto-fill",
            comments: `Auto-generated to backfill ${item.missingKg.toLocaleString()} kg deficit at period avg price`,
          });
        if (qaErr) throw qaErr;
        inserted++;
      }
      toast.success(`Created ${inserted} backfill purchase(s). Reloading report...`);
      await load();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Auto-fill failed");
    } finally {
      setAutoFilling(false);
    }
  };

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
    const salesRowsHtml = reportSales
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

    const typeBlocksHtml = byType
      .map(
        (t) => `
      <div class="type-box">
        <h3>${t.type}</h3>
        <table>
          <tbody>
            <tr><td>Opening Stock</td><td class="r">${t.openStock.toLocaleString()} kg</td></tr>
            <tr><td>+ Bought (period)</td><td class="r">${t.purchKg.toLocaleString()} kg @ ${fmt(t.avgBuy)}</td></tr>
            <tr><td>− Sold (period)</td><td class="r">${t.salesKg.toLocaleString()} kg @ ${fmt(t.avgSell)}</td></tr>
            <tr style="border-top:1px solid #999;font-weight:bold"><td>Closing Stock</td><td class="r" style="color:${t.closeStock < 0 ? "#b91c1c" : "#1a5632"}">${t.closeStock.toLocaleString()} kg</td></tr>
            <tr><td colspan="2" style="height:6px;border:none"></td></tr>
            <tr><td>Revenue</td><td class="r">${fmt(t.salesRev)}</td></tr>
            <tr><td>COGS (sold × avg buy)</td><td class="r">(${fmt(t.cogs)})</td></tr>
            <tr style="background:${t.matchedProfit >= 0 ? "#dcfce7" : "#fee2e2"};font-weight:bold"><td>Matched Profit (${t.marginPct.toFixed(1)}%)</td><td class="r">${fmt(t.matchedProfit)}</td></tr>
          </tbody>
        </table>
      </div>`
      )
      .join("");

    const dailyBlockHtml = (type: "Arabica" | "Robusta", rows: ReturnType<typeof dailyFlow>) =>
      rows.length === 0
        ? ""
        : `<h2>${type} — Daily Flow & Running Stock</h2>
      <table>
        <thead><tr><th>Date</th><th class="r">Bought (kg)</th><th class="r">Sold (kg)</th><th class="r">Net</th><th class="r">Running Stock</th><th class="r">Revenue</th></tr></thead>
        <tbody>${rows
          .map(
            (d) => `<tr style="${d.impossible ? "background:#fee2e2" : ""}">
              <td>${format(new Date(d.date), "MMM dd, yyyy")}</td>
              <td class="r">${d.bought.toLocaleString()}</td>
              <td class="r">${d.sold.toLocaleString()}</td>
              <td class="r">${(d.bought - d.sold >= 0 ? "+" : "") + (d.bought - d.sold).toLocaleString()}</td>
              <td class="r" style="${d.impossible ? "color:#b91c1c;font-weight:bold" : ""}">${d.running.toLocaleString()}${d.impossible ? " ⚠" : ""}</td>
              <td class="r">${d.revenue > 0 ? fmt(d.revenue) : "—"}</td>
            </tr>`
          )
          .join("")}</tbody>
      </table>`;

    const impossibleHtml =
      impossibleDays.length === 0
        ? ""
        : `<div style="border:2px solid #dc2626;background:#fee2e2;padding:8px;margin-top:10px;border-radius:4px">
        <strong style="color:#b91c1c">DATA INTEGRITY ALERT:</strong> ${impossibleDays.length} day(s) recorded more sales than available stock. Please reconcile inventory.
      </div>`;

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
      .type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 10px 0; }
      .type-box { border: 1px solid #d4d4d4; padding: 10px; border-radius: 4px; background: #fafafa; }
      .type-box h3 { margin: 0 0 6px 0; color: #1a5632; font-size: 13px; border-bottom: 1px solid #1a5632; padding-bottom: 3px; }
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
      ${impossibleHtml}
      <div class="summary-grid">
        <div class="stat"><div class="lbl">Total Bought</div><div class="val">${totals.purchKg.toLocaleString()} kg</div></div>
        <div class="stat"><div class="lbl">Purchase Cost</div><div class="val">${fmt(totals.purchCost)}</div></div>
        <div class="stat"><div class="lbl">Total Sold</div><div class="val">${totals.salesKg.toLocaleString()} kg</div></div>
        <div class="stat"><div class="lbl">Sales Revenue</div><div class="val">${fmt(totals.salesRev)}</div></div>
        <div class="stat"><div class="lbl">Avg Buy Price/kg</div><div class="val">${fmt(totals.avgBuy)}</div></div>
        <div class="stat"><div class="lbl">Avg Sell Price/kg</div><div class="val">${fmt(totals.avgSell)}</div></div>
        <div class="stat"><div class="lbl">Cash Paid to Suppliers</div><div class="val">${fmt(totals.paymentsTotal)}</div></div>
        <div class="stat profit"><div class="lbl">Matched Profit (Period)</div><div class="val">${fmt(totals.grossProfit)}</div></div>
      </div>

      <h2>P&amp;L by Coffee Type</h2>
      <div class="type-grid">${typeBlocksHtml}</div>

      ${dailyBlockHtml("Arabica", arabicaDaily)}
      ${dailyBlockHtml("Robusta", robustaDaily)}

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
        <tfoot><tr><td>TOTAL</td><td class="r">${reportSales.length}</td><td class="r">${totals.salesKg.toLocaleString()}</td><td class="r">${fmt(totals.avgSell)}</td><td class="r">${fmt(totals.salesRev)}</td></tr></tfoot>
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
          <tr><td>Less: Matched Coffee Cost (COGS)</td><td class="r">(${fmt(totals.cogs)})</td></tr>
          <tr style="background:#dcfce7;font-weight:bold"><td>NET PROFIT (Matched Basis)</td><td class="r">${fmt(totals.grossProfit)}</td></tr>
          <tr><td colspan="2" style="height:8px;border:none"></td></tr>
          <tr><td>Kg Sold</td><td class="r">${totals.salesKg.toLocaleString()} kg</td></tr>
          <tr><td>Weighted Avg Buy Price (period)</td><td class="r">${fmt(totals.avgBuy)} / kg</td></tr>
          <tr><td>COGS = Kg Sold × Avg Buy Price</td><td class="r">(${fmt(totals.cogs)})</td></tr>
          <tr><td>Weighted Avg Sell Price</td><td class="r">${fmt(totals.avgSell)} / kg</td></tr>
          <tr><td>Profit per Kg Sold</td><td class="r">${fmt(totals.profitPerKg)}</td></tr>
          <tr style="background:#fef3c7;font-weight:bold"><td>MATCHED PROFIT (Revenue − COGS) — Margin ${totals.marginPct.toFixed(2)}%</td><td class="r">${fmt(totals.matchedProfit)}</td></tr>
          <tr><td colspan="2" style="height:8px;border:none"></td></tr>
          <tr><td>Sales Revenue</td><td class="r">${fmt(totals.salesRev)}</td></tr>
          <tr><td>Less: Cash Paid to Suppliers (period)</td><td class="r">(${fmt(totals.paymentsTotal)})</td></tr>
          <tr style="background:#dbeafe;font-weight:bold"><td>NET CASHFLOW (Cash Basis)</td><td class="r">${fmt(totals.cashBasisProfit)}</td></tr>
          <tr><td colspan="2" style="height:8px;border:none"></td></tr>
          <tr><td>Inventory Movement (Bought − Sold)</td><td class="r">${totals.kgVariance >= 0 ? "+" : ""}${totals.kgVariance.toLocaleString()} kg ${totals.kgVariance >= 0 ? "(stock added)" : "(sold from prior stock)"}</td></tr>
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
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => applyPreset("this-month")}>This Month</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset("last-month")}>Last Month</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset("this-quarter")}>This Quarter</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset("ytd")}>Year to Date</Button>
            </div>
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
            {impossibleDays.length > 0 && (
              <Card className="border-2 border-black bg-white text-black">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-black">
                    <AlertTriangle className="h-5 w-5 text-black" /> Data Integrity Alert — Impossible Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-black">
                  <p className="text-sm text-black mb-2">
                    The following days show <strong>more coffee sold than available</strong> (running stock went negative).
                    This means a sale was recorded without a matching purchase — please reconcile.
                  </p>
                  <div className="mb-3 flex items-center justify-between gap-2 border border-black/40 bg-black/5 p-2 rounded">
                    <div className="text-xs text-black">
                      <strong>Auto-Fill Missing Purchases:</strong> create synthetic purchase records on each
                      deficit day, priced at the period's average buy price per coffee type. They will be tagged
                      "SYSTEM AUTO-FILL" and a batch starting with <code>AUTOFILL-</code> so you can find/edit them.
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAutoFill}
                      disabled={autoFilling}
                      className="gap-2 bg-black text-white hover:bg-black/80"
                    >
                      {autoFilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {autoFilling ? "Filling..." : "Auto-Fill Missing Purchases"}
                    </Button>
                  </div>
                  <table className="w-full text-xs text-black">
                    <thead><tr className="border-b border-black text-black"><th className="text-left p-1">Date</th><th className="p-1">Type</th><th className="text-right p-1">Bought</th><th className="text-right p-1">Sold</th><th className="text-right p-1">Running Stock</th></tr></thead>
                    <tbody className="text-black">
                      {impossibleDays.map((d, i) => {
                        const type = arabicaDaily.includes(d as any) ? "Arabica" : "Robusta";
                        return (
                          <tr key={i} className="border-b border-black/30 text-black">
                            <td className="p-1 text-black">{format(new Date(d.date), "MMM dd, yyyy")}</td>
                            <td className="p-1 text-center text-black">{type}</td>
                            <td className="p-1 text-right text-black">{d.bought.toLocaleString()}</td>
                            <td className="p-1 text-right text-black">{d.sold.toLocaleString()}</td>
                            <td className="p-1 text-right font-bold text-black">{d.running.toLocaleString()} kg</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

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

            <Card className="border-2 border-amber-500 bg-amber-50/40">
              <CardHeader>
                <CardTitle className="text-amber-800">Matched P&amp;L — Purchases vs Sales Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground uppercase">Avg Buy / kg</p><p className="text-lg font-bold">{fmt(totals.avgBuy)}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Avg Sell / kg</p><p className="text-lg font-bold">{fmt(totals.avgSell)}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">COGS (Kg Sold × Avg Buy)</p><p className="text-lg font-bold">{fmt(totals.cogs)}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Profit / kg</p><p className="text-lg font-bold">{fmt(totals.profitPerKg)}</p></div>
                </div>
                <div className="mt-4 pt-4 border-t border-amber-300 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Matched Profit</p>
                    <p className={`text-2xl font-bold ${totals.matchedProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(totals.matchedProfit)}</p>
                    <p className="text-xs text-muted-foreground">Margin {totals.marginPct.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Inventory Movement</p>
                    <p className={`text-2xl font-bold ${totals.kgVariance >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                      {totals.kgVariance >= 0 ? "+" : ""}{totals.kgVariance.toLocaleString()} kg
                    </p>
                    <p className="text-xs text-muted-foreground">{totals.kgVariance >= 0 ? "Stock added (bought > sold)" : "Sold from prior stock"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Cash Net (Revenue − Payments)</p>
                    <p className={`text-2xl font-bold ${totals.cashBasisProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(totals.cashBasisProfit)}</p>
                    <p className="text-xs text-muted-foreground">Cash basis</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Per-coffee-type breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byType.map((t) => (
                <Card key={t.type} className={t.type === "Arabica" ? "border-emerald-300" : "border-amber-300"}>
                  <CardHeader>
                    <CardTitle className={t.type === "Arabica" ? "text-emerald-700" : "text-amber-700"}>
                      {t.type} — Period P&amp;L
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr><td className="py-1">Opening Stock</td><td className="text-right font-medium">{t.openStock.toLocaleString()} kg</td></tr>
                        <tr><td className="py-1">+ Bought (period)</td><td className="text-right">{t.purchKg.toLocaleString()} kg @ {fmt(t.avgBuy)}</td></tr>
                        <tr><td className="py-1">− Sold (period)</td><td className="text-right">{t.salesKg.toLocaleString()} kg @ {fmt(t.avgSell)}</td></tr>
                        <tr className="border-t"><td className="py-1 font-bold">Closing Stock</td><td className={`text-right font-bold ${t.closeStock < 0 ? "text-red-700" : ""}`}>{t.closeStock.toLocaleString()} kg</td></tr>
                        <tr><td colSpan={2} className="py-2"></td></tr>
                        <tr><td className="py-1">Revenue</td><td className="text-right">{fmt(t.salesRev)}</td></tr>
                        <tr><td className="py-1">COGS (sold × avg buy)</td><td className="text-right">({fmt(t.cogs)})</td></tr>
                        <tr className={`border-t ${t.matchedProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                          <td className="py-1 font-bold">Matched Profit</td>
                          <td className={`text-right font-bold ${t.matchedProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {fmt(t.matchedProfit)} <span className="text-xs">({t.marginPct.toFixed(1)}%)</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily flow per type */}
            {TYPES.map((type) => {
              const rows = type === "Arabica" ? arabicaDaily : robustaDaily;
              if (rows.length === 0) return null;
              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle>{type} — Daily Flow & Running Stock</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-right p-2">Bought (kg)</th>
                        <th className="text-right p-2">Sold (kg)</th>
                        <th className="text-right p-2">Net (kg)</th>
                        <th className="text-right p-2">Running Stock</th>
                        <th className="text-right p-2">Revenue</th>
                      </tr></thead>
                      <tbody>
                        {rows.map((d, i) => (
                          <tr key={i} className={`border-b ${d.impossible ? "bg-red-50" : ""}`}>
                            <td className="p-2">{format(new Date(d.date), "MMM dd")}</td>
                            <td className="p-2 text-right">{d.bought.toLocaleString()}</td>
                            <td className="p-2 text-right">{d.sold.toLocaleString()}</td>
                            <td className={`p-2 text-right ${d.bought - d.sold >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                              {(d.bought - d.sold >= 0 ? "+" : "") + (d.bought - d.sold).toLocaleString()}
                            </td>
                            <td className={`p-2 text-right font-medium ${d.impossible ? "text-red-700 font-bold" : ""}`}>
                              {d.running.toLocaleString()} {d.impossible ? "⚠" : ""}
                            </td>
                            <td className="p-2 text-right">{d.revenue > 0 ? fmt(d.revenue) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })}

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