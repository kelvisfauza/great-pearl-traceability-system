import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Loader2, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import StandardPrintHeader from "@/components/print/StandardPrintHeader";
import { getStandardPrintStyles } from "@/utils/printStyles";

type PeriodMetrics = {
  label: string;
  startDate: string;
  endDate: string;
  purchaseKg: number;
  purchaseCount: number;
  salesKg: number;
  salesAmount: number;
  salesCount: number;
  dispatchKg: number;
  dispatchCount: number;
};

const sumTruckWeight = (trucks: any): number => {
  if (!Array.isArray(trucks)) return 0;
  return trucks.reduce((s, t) => s + Number(t?.total_weight_store || t?.weight || t?.netWeight || 0), 0);
};

const fetchPeriod = async (label: string, start: Date, end: Date): Promise<PeriodMetrics> => {
  const s = format(start, "yyyy-MM-dd");
  const e = format(end, "yyyy-MM-dd");

  const [purchases, sales, dispatches] = await Promise.all([
    supabase.from("coffee_records").select("kilograms").gte("date", s).lte("date", e),
    supabase.from("sales_transactions").select("weight, total_amount").gte("date", s).lte("date", e),
    supabase.from("eudr_dispatch_reports").select("trucks").gte("dispatch_date", s).lte("dispatch_date", e),
  ]);

  const purchaseKg = (purchases.data || []).reduce((sum, r: any) => sum + Number(r.kilograms || 0), 0);
  const salesKg = (sales.data || []).reduce((sum, r: any) => sum + Number(r.weight || 0), 0);
  const salesAmount = (sales.data || []).reduce((sum, r: any) => sum + Number(r.total_amount || 0), 0);
  const dispatchKg = (dispatches.data || []).reduce((sum, r: any) => sum + sumTruckWeight(r.trucks), 0);

  return {
    label,
    startDate: s,
    endDate: e,
    purchaseKg,
    purchaseCount: purchases.data?.length || 0,
    salesKg,
    salesAmount,
    salesCount: sales.data?.length || 0,
    dispatchKg,
    dispatchCount: dispatches.data?.length || 0,
  };
};

const monthOptions = (): { value: string; label: string }[] => {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 18; i++) {
    const d = subMonths(now, i);
    opts.push({ value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") });
  }
  return opts;
};

const fmtKg = (n: number) => `${Math.round(n).toLocaleString()} kg`;
const fmtUgx = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;
const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);

const Delta = ({ current, prior, money = false }: { current: number; prior: number; money?: boolean }) => {
  const diff = current - prior;
  const p = pct(current, prior);
  const up = diff > 0;
  const flat = Math.abs(diff) < 1;
  const Icon = flat ? null : up ? TrendingUp : TrendingDown;
  const color = flat ? "text-muted-foreground" : up ? "text-green-600" : "text-red-600";
  return (
    <div className={`flex items-center gap-1 text-sm ${color}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{money ? fmtUgx(Math.abs(diff)) : fmtKg(Math.abs(diff))}</span>
      <span className="text-xs opacity-75">({p.toFixed(1)}%)</span>
    </div>
  );
};

const MatchStatus = ({ a, b, tolerancePct = 5 }: { a: number; b: number; tolerancePct?: number }) => {
  const diff = Math.abs(a - b);
  const base = Math.max(a, b);
  const p = base > 0 ? (diff / base) * 100 : 0;
  const ok = p <= tolerancePct;
  return (
    <Badge variant={ok ? "default" : "destructive"} className={ok ? "bg-green-600" : ""}>
      {ok ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
      {ok ? "Matched" : `${p.toFixed(1)}% gap`}
    </Badge>
  );
};

const StoreAuditComparison = () => {
  const navigate = useNavigate();
  const now = new Date();

  const [comparisonMonth, setComparisonMonth] = useState<string>(format(subMonths(now, 1), "yyyy-MM"));
  const [current, setCurrent] = useState<PeriodMetrics | null>(null);
  const [prior, setPrior] = useState<PeriodMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const options = useMemo(() => monthOptions(), []);

  const load = async () => {
    setLoading(true);
    try {
      const curStart = startOfMonth(now);
      const curEnd = now;
      const [yy, mm] = comparisonMonth.split("-").map(Number);
      const prevAnchor = new Date(yy, mm - 1, 1);
      const prevStart = startOfMonth(prevAnchor);
      const prevEnd = endOfMonth(prevAnchor);

      const [a, b] = await Promise.all([
        fetchPeriod(`${format(curStart, "MMM d")} – ${format(curEnd, "MMM d, yyyy")}`, curStart, curEnd),
        fetchPeriod(format(prevAnchor, "MMMM yyyy"), prevStart, prevEnd),
      ]);
      setCurrent(a);
      setPrior(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonMonth]);

  const handlePrint = () => {
    if (!current || !prior) return;
    const w = window.open("", "_blank", "width=1024,height=768");
    if (!w) return;

    const row = (label: string, a: string | number, b: string | number, c: string | number = "") =>
      `<tr><td>${label}</td><td class="amount">${a}</td><td class="amount">${b}</td><td class="amount">${c}</td></tr>`;

    const salesVsDispatchDiff = Math.abs(current.salesKg - current.dispatchKg);
    const svdBase = Math.max(current.salesKg, current.dispatchKg);
    const svdPct = svdBase > 0 ? (salesVsDispatchDiff / svdBase) * 100 : 0;
    const svdOk = svdPct <= 5;

    const html = `
      <html><head><title>Store Management Audit</title>
      <style>${getStandardPrintStyles()}</style>
      </head><body>
        <div class="print-header" style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:15px;">
          <h1 class="company-name">GREAT AGRO COFFEE</h1>
          <div class="company-details">
            <p>Kasese, Uganda · +256 393 001 626</p>
            <p>www.greatagrocoffee.com | info@greatpearlcoffee.com</p>
          </div>
          <h2 class="document-title">Store Management Audit</h2>
          <div class="document-info">
            <p>${current.label} vs ${prior.label}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <div class="content-section">
          <h3 class="section-title">Period Summary</h3>
          <table>
            <thead><tr><th>Period</th><th class="amount">Purchases</th><th class="amount">Sales (kg)</th><th class="amount">Sales (UGX)</th><th class="amount">EUDR Dispatched</th></tr></thead>
            <tbody>
              <tr><td><strong>Current</strong> — ${current.label}</td><td class="amount">${fmtKg(current.purchaseKg)} (${current.purchaseCount})</td><td class="amount">${fmtKg(current.salesKg)} (${current.salesCount})</td><td class="amount">${fmtUgx(current.salesAmount)}</td><td class="amount">${fmtKg(current.dispatchKg)} (${current.dispatchCount})</td></tr>
              <tr><td><strong>Comparison</strong> — ${prior.label}</td><td class="amount">${fmtKg(prior.purchaseKg)} (${prior.purchaseCount})</td><td class="amount">${fmtKg(prior.salesKg)} (${prior.salesCount})</td><td class="amount">${fmtUgx(prior.salesAmount)}</td><td class="amount">${fmtKg(prior.dispatchKg)} (${prior.dispatchCount})</td></tr>
            </tbody>
          </table>
        </div>

        <div class="content-section">
          <h3 class="section-title">Traceability Audit — Current Period</h3>
          <table>
            <thead><tr><th>Flow</th><th class="amount">Value A</th><th class="amount">Value B</th><th class="amount">Difference</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Sales vs EUDR Dispatch</td><td class="amount">${fmtKg(current.salesKg)}</td><td class="amount">${fmtKg(current.dispatchKg)}</td><td class="amount">${fmtKg(salesVsDispatchDiff)}</td><td class="${svdOk ? 'positive' : 'negative'}">${svdOk ? 'Matched' : svdPct.toFixed(1) + '% gap'}</td></tr>
              <tr><td>Purchases vs Sales</td><td class="amount">${fmtKg(current.purchaseKg)}</td><td class="amount">${fmtKg(current.salesKg)}</td><td class="amount">${fmtKg(current.purchaseKg - current.salesKg)}</td><td class="${current.purchaseKg >= current.salesKg ? 'positive' : 'negative'}">${current.purchaseKg >= current.salesKg ? 'Healthy surplus' : 'Oversold'}</td></tr>
              <tr><td>Purchases vs EUDR Dispatch</td><td class="amount">${fmtKg(current.purchaseKg)}</td><td class="amount">${fmtKg(current.dispatchKg)}</td><td class="amount">${fmtKg(current.purchaseKg - current.dispatchKg)}</td><td>Throughput ${current.purchaseKg > 0 ? ((current.dispatchKg / current.purchaseKg) * 100).toFixed(1) : '0'}%</td></tr>
            </tbody>
          </table>
        </div>

        <div class="content-section">
          <h3 class="section-title">Month-over-Month Comparison</h3>
          <table>
            <thead><tr><th>Metric</th><th class="amount">${current.label}</th><th class="amount">${prior.label}</th><th class="amount">Change</th></tr></thead>
            <tbody>
              ${row("Purchases (kg)", fmtKg(current.purchaseKg), fmtKg(prior.purchaseKg), `${pct(current.purchaseKg, prior.purchaseKg).toFixed(1)}%`)}
              ${row("Purchase Receipts", current.purchaseCount, prior.purchaseCount, `${current.purchaseCount - prior.purchaseCount > 0 ? '+' : ''}${current.purchaseCount - prior.purchaseCount}`)}
              ${row("Sales (kg)", fmtKg(current.salesKg), fmtKg(prior.salesKg), `${pct(current.salesKg, prior.salesKg).toFixed(1)}%`)}
              ${row("Sales Revenue", fmtUgx(current.salesAmount), fmtUgx(prior.salesAmount), `${pct(current.salesAmount, prior.salesAmount).toFixed(1)}%`)}
              ${row("Sales Transactions", current.salesCount, prior.salesCount, `${current.salesCount - prior.salesCount > 0 ? '+' : ''}${current.salesCount - prior.salesCount}`)}
              ${row("EUDR Dispatched (kg)", fmtKg(current.dispatchKg), fmtKg(prior.dispatchKg), `${pct(current.dispatchKg, prior.dispatchKg).toFixed(1)}%`)}
              ${row("Dispatch Reports", current.dispatchCount, prior.dispatchCount, `${current.dispatchCount - prior.dispatchCount > 0 ? '+' : ''}${current.dispatchCount - prior.dispatchCount}`)}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Tolerance for Sales↔Dispatch match is 5%. Differences beyond may indicate untracked dispatches, unreconciled sales, or weighbridge variances.</p>
          <p>Great Agro Coffee — Store Management Audit</p>
        </div>
      </body></html>`;

    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 250);
  };

  return (
    <Layout title="Store Management Audit" subtitle="Purchases ↔ Sales ↔ EUDR Dispatch comparison & month-over-month">
      <div className="space-y-6 print:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button variant="outline" onClick={() => navigate("/reports")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Compare current month to:</span>
              <Select value={comparisonMonth} onValueChange={setComparisonMonth}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
          </div>
        </div>

        <div className="hidden print:block">
          <StandardPrintHeader title="Store Management Audit" subtitle={`${current?.label} vs ${prior?.label}`} />
        </div>

        {loading || !current || !prior ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <>
            {/* Period summary cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {[current, prior].map((p, idx) => (
                <Card key={idx} className={idx === 0 ? "border-primary" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{idx === 0 ? "Current Period" : "Comparison Period"}</CardTitle>
                      <Badge variant="outline">{p.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Purchases</p>
                      <p className="font-bold text-lg">{fmtKg(p.purchaseKg)}</p>
                      <p className="text-xs text-muted-foreground">{p.purchaseCount} receipts</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sales</p>
                      <p className="font-bold text-lg">{fmtKg(p.salesKg)}</p>
                      <p className="text-xs text-muted-foreground">{fmtUgx(p.salesAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">EUDR Dispatched</p>
                      <p className="font-bold text-lg">{fmtKg(p.dispatchKg)}</p>
                      <p className="text-xs text-muted-foreground">{p.dispatchCount} dispatches</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cross-flow audit (current period) */}
            <Card>
              <CardHeader><CardTitle className="text-base">Traceability Audit — Current Period</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flow</TableHead>
                      <TableHead className="text-right">Value A</TableHead>
                      <TableHead className="text-right">Value B</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                      <TableHead>Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Sales vs EUDR Dispatch</TableCell>
                      <TableCell className="text-right">{fmtKg(current.salesKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(current.dispatchKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(Math.abs(current.salesKg - current.dispatchKg))}</TableCell>
                      <TableCell><MatchStatus a={current.salesKg} b={current.dispatchKg} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Purchases vs Sales</TableCell>
                      <TableCell className="text-right">{fmtKg(current.purchaseKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(current.salesKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(current.purchaseKg - current.salesKg)} {current.purchaseKg >= current.salesKg ? "stock surplus" : "deficit"}</TableCell>
                      <TableCell>
                        <Badge variant={current.purchaseKg >= current.salesKg ? "default" : "destructive"} className={current.purchaseKg >= current.salesKg ? "bg-blue-600" : ""}>
                          {current.purchaseKg >= current.salesKg ? "Healthy" : "Oversold"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Purchases vs EUDR Dispatch</TableCell>
                      <TableCell className="text-right">{fmtKg(current.purchaseKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(current.dispatchKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(current.purchaseKg - current.dispatchKg)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Throughput {current.purchaseKg > 0 ? ((current.dispatchKg / current.purchaseKg) * 100).toFixed(1) : "0"}%</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Month-over-month comparison */}
            <Card>
              <CardHeader><CardTitle className="text-base">Month-over-Month Comparison</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">{current.label}</TableHead>
                      <TableHead className="text-right">{prior.label}</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Purchases (kg)</TableCell>
                      <TableCell className="text-right font-medium">{fmtKg(current.purchaseKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(prior.purchaseKg)}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end"><Delta current={current.purchaseKg} prior={prior.purchaseKg} /></div></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Purchase Receipts</TableCell>
                      <TableCell className="text-right font-medium">{current.purchaseCount}</TableCell>
                      <TableCell className="text-right">{prior.purchaseCount}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{current.purchaseCount - prior.purchaseCount > 0 ? "+" : ""}{current.purchaseCount - prior.purchaseCount}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Sales (kg)</TableCell>
                      <TableCell className="text-right font-medium">{fmtKg(current.salesKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(prior.salesKg)}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end"><Delta current={current.salesKg} prior={prior.salesKg} /></div></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Sales Revenue</TableCell>
                      <TableCell className="text-right font-medium">{fmtUgx(current.salesAmount)}</TableCell>
                      <TableCell className="text-right">{fmtUgx(prior.salesAmount)}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end"><Delta current={current.salesAmount} prior={prior.salesAmount} money /></div></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Sales Transactions</TableCell>
                      <TableCell className="text-right font-medium">{current.salesCount}</TableCell>
                      <TableCell className="text-right">{prior.salesCount}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{current.salesCount - prior.salesCount > 0 ? "+" : ""}{current.salesCount - prior.salesCount}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>EUDR Dispatched (kg)</TableCell>
                      <TableCell className="text-right font-medium">{fmtKg(current.dispatchKg)}</TableCell>
                      <TableCell className="text-right">{fmtKg(prior.dispatchKg)}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end"><Delta current={current.dispatchKg} prior={prior.dispatchKg} /></div></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dispatch Reports</TableCell>
                      <TableCell className="text-right font-medium">{current.dispatchCount}</TableCell>
                      <TableCell className="text-right">{prior.dispatchCount}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{current.dispatchCount - prior.dispatchCount > 0 ? "+" : ""}{current.dispatchCount - prior.dispatchCount}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground print:block">
              Tolerance for Sales↔Dispatch match is 5%. Differences beyond that may indicate untracked dispatches, sales not yet reconciled with EUDR, or weighbridge variances.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
};

export default StoreAuditComparison;