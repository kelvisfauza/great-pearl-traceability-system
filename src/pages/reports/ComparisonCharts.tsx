import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, TrendingUp, TrendingDown, Activity, Wallet, Package, Receipt, BarChart3, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import StandardPrintHeader from "@/components/print/StandardPrintHeader";
import { format } from "date-fns";

interface WeekBucket {
  purchasesKg: number;
  salesKg: number;
  revenue: number;
  expenses: number;
  qualityCount: number;
  millingKg: number;
}

const emptyWeek = (): WeekBucket => ({
  purchasesKg: 0, salesKg: 0, revenue: 0, expenses: 0, qualityCount: 0, millingKg: 0,
});

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "11px",
  boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)",
};

const ComparisonCharts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  // 8 weekly buckets, index 0 = oldest, 7 = current
  const [weeks, setWeeks] = useState<Array<{ label: string; start: Date; end: Date } & WeekBucket>>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Build 8 weekly buckets ending today (each week = 7 days)
      const buckets: Array<{ label: string; start: Date; end: Date } & WeekBucket> = [];
      for (let i = 7; i >= 0; i--) {
        const end = new Date(today); end.setDate(end.getDate() - i * 7);
        const start = new Date(end); start.setDate(start.getDate() - 6);
        buckets.push({
          start, end,
          label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          ...emptyWeek(),
        });
      }
      const windowStart = buckets[0].start.toISOString().split("T")[0];
      const windowEnd = buckets[buckets.length - 1].end.toISOString().split("T")[0];

      const [coffee, sales, expenses, quality, milling] = await Promise.all([
        supabase.from("coffee_records").select("kilograms, date").gte("date", windowStart).lte("date", windowEnd),
        supabase.from("sales_transactions").select("weight, total_amount, date").gte("date", windowStart).lte("date", windowEnd),
        supabase.from("finance_expenses").select("amount, date").gte("date", windowStart).lte("date", windowEnd),
        supabase.from("quality_assessments").select("id, created_at").gte("created_at", `${windowStart}T00:00:00`).lte("created_at", `${windowEnd}T23:59:59`),
        supabase.from("milling_transactions").select("kgs_hulled, date").gte("date", windowStart).lte("date", windowEnd),
      ]);

      const findBucket = (dateStr?: string | null) => {
        if (!dateStr) return null;
        const d = new Date(dateStr.split("T")[0]);
        const t = d.getTime();
        return buckets.find(b => t >= b.start.getTime() && t <= b.end.getTime() + 86399999) ?? null;
      };

      coffee.data?.forEach((r: any) => { const b = findBucket(r.date); if (b) b.purchasesKg += Number(r.kilograms) || 0; });
      sales.data?.forEach((r: any) => { const b = findBucket(r.date); if (b) { b.salesKg += Number(r.weight) || 0; b.revenue += Number(r.total_amount) || 0; } });
      expenses.data?.forEach((r: any) => { const b = findBucket(r.date); if (b) b.expenses += Number(r.amount) || 0; });
      quality.data?.forEach((r: any) => { const b = findBucket(r.created_at); if (b) b.qualityCount += 1; });
      milling.data?.forEach((r: any) => { const b = findBucket(r.date); if (b) b.millingKg += Number(r.kgs_hulled) || 0; });

      setWeeks(buckets);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fmtNum = (n: number) => Math.round(n).toLocaleString();
  const fmtUGX = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

  const buildSingle = (pick: (b: WeekBucket) => number, label: string) =>
    weeks.map(w => ({ week: w.label, [label]: Math.round(pick(w)) }));

  const buildDual = (a: (b: WeekBucket) => number, b: (x: WeekBucket) => number, aLabel: string, bLabel: string) =>
    weeks.map(w => ({ week: w.label, [aLabel]: Math.round(a(w)), [bLabel]: Math.round(b(w)) }));

  const pctChange = (curr: number, prev: number) => {
    if (!prev) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const summarize = (pick: (b: WeekBucket) => number, formatter: (n: number) => string) => {
    const curr = weeks.length ? pick(weeks[weeks.length - 1]) : 0;
    const prev = weeks.length > 1 ? pick(weeks[weeks.length - 2]) : 0;
    const total = weeks.reduce((s, w) => s + pick(w), 0);
    const avg = weeks.length ? total / weeks.length : 0;
    const peak = weeks.reduce((m, w) => Math.max(m, pick(w)), 0);
    const change = pctChange(curr, prev);
    return { curr, prev, total, avg, peak, change, formatter };
  };

  const chartCards: Array<{
    id: string; title: string; icon: any; description: string;
    series: { key: string; label: string }[];
    data: any[]; valueFormat: (n: number) => string;
    summary: ReturnType<typeof summarize>;
    insight: string;
  }> = [
    {
      id: "purchases", title: "Coffee Purchases (kg)", icon: Package,
      description: "Total green coffee received from suppliers each week, sourced from store coffee receipts (coffee_records).",
      series: [{ key: "Purchases", label: "Purchases" }],
      data: buildSingle(w => w.purchasesKg, "Purchases"),
      valueFormat: (n) => `${fmtNum(n)} kg`,
      summary: summarize(w => w.purchasesKg, (n) => `${fmtNum(n)} kg`),
      insight: "Use this to monitor supply velocity. A drop usually signals reduced supplier deliveries, price disagreements, or off-season periods. A spike indicates strong inflow that the store must be ready to receive.",
    },
    {
      id: "sales", title: "Coffee Sales Volume (kg)", icon: TrendingUp,
      description: "Weekly weight of coffee dispatched to buyers (sales_transactions.weight).",
      series: [{ key: "Sales", label: "Sales" }],
      data: buildSingle(w => w.salesKg, "Sales"),
      valueFormat: (n) => `${fmtNum(n)} kg`,
      summary: summarize(w => w.salesKg, (n) => `${fmtNum(n)} kg`),
      insight: "Measures throughput out of the warehouse. Compare with purchases to ensure stock is moving and not aging. Sustained low sales while purchases continue means inventory is accumulating.",
    },
    {
      id: "pvs", title: "Purchases vs Sales (kg)", icon: BarChart3,
      description: "Side-by-side weekly comparison of coffee bought versus coffee sold.",
      series: [{ key: "Purchases", label: "Purchases" }, { key: "Sales", label: "Sales" }],
      data: buildDual(w => w.purchasesKg, w => w.salesKg, "Purchases", "Sales"),
      valueFormat: (n) => `${fmtNum(n)} kg`,
      summary: summarize(w => w.purchasesKg - w.salesKg, (n) => `${fmtNum(n)} kg net`),
      insight: "When the Purchases bar exceeds Sales, stock is building up. When Sales exceed Purchases, the store is drawing down inventory and reorder planning is needed.",
    },
    {
      id: "revenue", title: "Sales Revenue (UGX)", icon: Wallet,
      description: "Total amount invoiced for sales each week (sales_transactions.total_amount).",
      series: [{ key: "Revenue", label: "Revenue" }],
      data: buildSingle(w => w.revenue, "Revenue"),
      valueFormat: fmtUGX,
      summary: summarize(w => w.revenue, fmtUGX),
      insight: "Top-line income trend. Compare with sales volume — if volume is flat but revenue grew, prices improved; if revenue dropped on stable volume, average selling price weakened.",
    },
    {
      id: "rve", title: "Revenue vs Expenses (UGX)", icon: Receipt,
      description: "Weekly revenue from sales against operating expenses recorded in finance_expenses.",
      series: [{ key: "Revenue", label: "Revenue" }, { key: "Expenses", label: "Expenses" }],
      data: buildDual(w => w.revenue, w => w.expenses, "Revenue", "Expenses"),
      valueFormat: fmtUGX,
      summary: summarize(w => w.revenue - w.expenses, fmtUGX),
      insight: "A direct read on weekly profitability. Weeks where the Expenses bar approaches or exceeds Revenue need management review — either revenue is delayed or costs are out of pattern.",
    },
    {
      id: "expenses", title: "Operating Expenses (UGX)", icon: Receipt,
      description: "All recorded finance expenses for the week (excludes salaries paid via payroll runs).",
      series: [{ key: "Expenses", label: "Expenses" }],
      data: buildSingle(w => w.expenses, "Expenses"),
      valueFormat: fmtUGX,
      summary: summarize(w => w.expenses, fmtUGX),
      insight: "Track spend discipline. Sudden spikes warrant a drill-down into the expenses report to identify the category responsible.",
    },
    {
      id: "quality", title: "Quality Assessments Completed", icon: Activity,
      description: "Number of quality assessments performed by the lab each week.",
      series: [{ key: "Assessments", label: "Assessments" }],
      data: buildSingle(w => w.qualityCount, "Assessments"),
      valueFormat: (n) => `${fmtNum(n)} lots`,
      summary: summarize(w => w.qualityCount, (n) => `${fmtNum(n)} lots`),
      insight: "Indicator of lab workload and intake processing speed. Low counts during high-purchase weeks point to a quality bottleneck that delays payment release.",
    },
    {
      id: "milling", title: "Milling Output (kg)", icon: BarChart3,
      description: "Total kilograms hulled by the milling line each week (milling_transactions.kgs_hulled).",
      series: [{ key: "Milled", label: "Milled" }],
      data: buildSingle(w => w.millingKg, "Milled"),
      valueFormat: (n) => `${fmtNum(n)} kg`,
      summary: summarize(w => w.millingKg, (n) => `${fmtNum(n)} kg`),
      insight: "Captures processing capacity utilisation. Compare with sales — milling must stay ahead of dispatch to avoid order delays.",
    },
  ];

  const handlePrint = () => window.print();

  const ChangeChip = ({ change }: { change: number }) => {
    const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
    const tone = change > 0 ? "text-emerald-600 bg-emerald-50" : change < 0 ? "text-rose-600 bg-rose-50" : "text-muted-foreground bg-muted";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tone}`}>
        <Icon className="h-3 w-3" />
        {change > 0 ? "+" : ""}{change.toFixed(1)}% WoW
      </span>
    );
  };

  return (
    <>
      <div className="print-only p-6">
        <StandardPrintHeader
          title="Comparison Charts Report"
          subtitle="14-day weekly comparison across key operations"
          additionalInfo={`Generated: ${format(new Date(), "PPP 'at' pp")}`}
          includeDate
        />
      </div>

      <Layout title="Comparison Charts" subtitle="Weekly comparisons across the business — 8-week window">
        <div className="space-y-6 no-print">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/reports")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Reports
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print (one chart per page)
            </Button>
          </div>

          {loading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading comparison data...</CardContent></Card>
          ) : null}
        </div>

        <div className="grid gap-6 grid-cols-1">
          {chartCards.map((c, idx) => {
            const Icon = c.icon;
            const s = c.summary;
            return (
              <Card key={c.id} className="border-border/40 overflow-hidden print:break-after-page print:shadow-none">
                <div className="h-1 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
                <CardHeader className="pb-3 pt-5 px-6">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-chart-1/10 rounded-lg">
                        <Icon className="h-5 w-5 text-chart-1" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Chart {idx + 1}: {c.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{c.description}</p>
                      </div>
                    </div>
                    <ChangeChip change={s.change} />
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0 space-y-4">
                  {/* Summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Current Week</div>
                      <div className="text-sm font-bold mt-1">{s.formatter(s.curr)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Previous Week</div>
                      <div className="text-sm font-bold mt-1">{s.formatter(s.prev)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">8-Week Average</div>
                      <div className="text-sm font-bold mt-1">{s.formatter(s.avg)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">8-Week Total</div>
                      <div className="text-sm font-bold mt-1">{s.formatter(s.total)}</div>
                    </div>
                  </div>

                  <Tabs defaultValue="bar" className="w-full">
                    <TabsList className="grid w-full max-w-xs grid-cols-2 h-8 mb-3 no-print">
                      <TabsTrigger value="bar" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" /> Bar</TabsTrigger>
                      <TabsTrigger value="line" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Line</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bar" className="mt-0">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={c.data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => c.valueFormat(Number(v))} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                          {c.series.map((s, i) => (
                            <Bar key={s.key} dataKey={s.key} name={s.label}
                              fill={i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-3))"}
                              radius={[4, 4, 0, 0]} maxBarSize={48} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                    <TabsContent value="line" className="mt-0">
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={c.data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => c.valueFormat(Number(v))} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                          {c.series.map((s, i) => (
                            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                              stroke={i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-3))"}
                              strokeWidth={2.5} dot={{ r: 4 }} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  </Tabs>

                  {/* Insight & explanation */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg bg-chart-1/5 border border-chart-1/20">
                      <div className="text-[10px] uppercase tracking-wide text-chart-1 font-bold mb-1">What this shows</div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{c.description}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <div className="text-[10px] uppercase tracking-wide text-amber-700 font-bold mb-1">How to read it</div>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {c.insight} The peak in this 8-week window was <strong>{c.valueFormat(s.peak)}</strong>; current week sits at <strong>{c.valueFormat(s.curr)}</strong>, a <strong>{s.change >= 0 ? "+" : ""}{s.change.toFixed(1)}%</strong> change versus the previous week.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Layout>
    </>
  );
};

export default ComparisonCharts;