import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, TrendingUp, Activity, Wallet, Package, Receipt, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import StandardPrintHeader from "@/components/print/StandardPrintHeader";
import { format } from "date-fns";

type DayKey = string;

interface DayBucket {
  purchasesKg: number;
  salesKg: number;
  revenue: number;
  expenses: number;
  bags: number;
  qualityCount: number;
  millingKg: number;
}

const emptyBucket = (): DayBucket => ({
  purchasesKg: 0, salesKg: 0, revenue: 0, expenses: 0, bags: 0, qualityCount: 0, millingKg: 0,
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
  const [days, setDays] = useState<Array<{ key: DayKey; label: string } & DayBucket>>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const fourteenAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13)
        .toISOString().split("T")[0];

      const [coffee, sales, expenses, quality, milling] = await Promise.all([
        supabase.from("coffee_records").select("kilograms, bags, date").gte("date", fourteenAgo).lte("date", todayStr),
        supabase.from("sales_transactions").select("weight, total_amount, date").gte("date", fourteenAgo).lte("date", todayStr),
        supabase.from("finance_expenses").select("amount, date").gte("date", fourteenAgo).lte("date", todayStr),
        supabase.from("quality_assessments").select("id, created_at").gte("created_at", `${fourteenAgo}T00:00:00`).lte("created_at", `${todayStr}T23:59:59`),
        supabase.from("milling_transactions").select("kgs_hulled, date").gte("date", fourteenAgo).lte("date", todayStr),
      ]);

      const map = new Map<DayKey, DayBucket>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        map.set(d.toISOString().split("T")[0], emptyBucket());
      }
      const add = (k: string | undefined, fn: (b: DayBucket) => void) => {
        if (!k) return;
        const key = k.split("T")[0];
        const b = map.get(key);
        if (b) fn(b);
      };

      coffee.data?.forEach(r => add(r.date as any, b => { b.purchasesKg += Number(r.kilograms) || 0; b.bags += Number(r.bags) || 0; }));
      sales.data?.forEach(r => add(r.date as any, b => { b.salesKg += Number(r.weight) || 0; b.revenue += Number(r.total_amount) || 0; }));
      expenses.data?.forEach(r => add(r.date as any, b => { b.expenses += Number(r.amount) || 0; }));
      quality.data?.forEach(r => add(r.created_at as any, b => { b.qualityCount += 1; }));
      milling.data?.forEach(r => add(r.date as any, b => { b.millingKg += Number(r.kgs_hulled) || 0; }));

      const arr = Array.from(map.entries()).map(([key, b]) => ({
        key,
        label: new Date(key).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        ...b,
      }));
      setDays(arr);
      setLoading(false);
    };
    fetchData();
  }, []);

  const last7 = days.slice(-7);
  const prev7 = days.slice(0, 7);

  const buildWvW = (pick: (b: DayBucket) => number) =>
    last7.map((d, i) => ({
      day: new Date(d.key).toLocaleDateString("en-US", { weekday: "short" }),
      "This Week": Math.round(pick(d)),
      "Last Week": Math.round(pick(prev7[i] ?? (emptyBucket() as any))),
    }));

  const buildDual = (a: (b: DayBucket) => number, b: (x: DayBucket) => number, aLabel: string, bLabel: string) =>
    last7.map(d => ({
      day: new Date(d.key).toLocaleDateString("en-US", { weekday: "short" }),
      [aLabel]: Math.round(a(d)),
      [bLabel]: Math.round(b(d)),
    }));

  const chartCards = [
    { id: "purchases", title: "Purchases (kg) — Week vs Week", icon: Package, type: "wvw", data: buildWvW(d => d.purchasesKg) },
    { id: "sales", title: "Sales (kg) — Week vs Week", icon: TrendingUp, type: "wvw", data: buildWvW(d => d.salesKg) },
    { id: "pvs", title: "Purchases vs Sales (kg) — This Week", icon: BarChart3, type: "dual", data: buildDual(d => d.purchasesKg, d => d.salesKg, "Purchases", "Sales") },
    { id: "revenue", title: "Revenue (UGX) — Week vs Week", icon: Wallet, type: "wvw", data: buildWvW(d => d.revenue) },
    { id: "rve", title: "Revenue vs Expenses (UGX) — This Week", icon: Receipt, type: "dual", data: buildDual(d => d.revenue, d => d.expenses, "Revenue", "Expenses") },
    { id: "expenses", title: "Expenses (UGX) — Week vs Week", icon: Receipt, type: "wvw", data: buildWvW(d => d.expenses) },
    { id: "quality", title: "Quality Assessments — Week vs Week", icon: Activity, type: "wvw", data: buildWvW(d => d.qualityCount) },
    { id: "milling", title: "Milling Output (kg) — Week vs Week", icon: BarChart3, type: "wvw", data: buildWvW(d => d.millingKg) },
  ];

  const handlePrint = () => window.print();

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

      <Layout title="Comparison Charts" subtitle="Visual week-over-week comparisons across the business">
        <div className="space-y-6 no-print">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/reports")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Reports
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print All Charts
            </Button>
          </div>

          {loading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading comparison data...</CardContent></Card>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-2 print:grid-cols-1">
          {chartCards.map(c => {
            const Icon = c.icon;
            return (
              <Card key={c.id} className="border-border/30 overflow-hidden print:break-inside-avoid">
                <div className="h-0.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-chart-1/10 rounded-lg">
                      <Icon className="h-4 w-4 text-chart-1" />
                    </div>
                    <CardTitle className="text-sm font-bold">{c.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Tabs defaultValue="line" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-8 mb-3 no-print">
                      <TabsTrigger value="line" className="text-xs gap-1.5"><Activity className="h-3 w-3" /> Line</TabsTrigger>
                      <TabsTrigger value="bar" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" /> Bar</TabsTrigger>
                    </TabsList>
                    <TabsContent value="line" className="mt-0">
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={c.data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                          {Object.keys(c.data[0] || {}).filter(k => k !== "day").map((k, i) => (
                            <Line key={k} type="monotone" dataKey={k}
                              stroke={i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--muted-foreground))"}
                              strokeWidth={i === 0 ? 2.5 : 1.5}
                              strokeDasharray={i === 0 ? undefined : "5 5"}
                              dot={{ r: 3 }} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </TabsContent>
                    <TabsContent value="bar" className="mt-0">
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={c.data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                          {Object.keys(c.data[0] || {}).filter(k => k !== "day").map((k, i) => (
                            <Bar key={k} dataKey={k}
                              fill={i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-3))"}
                              radius={[4, 4, 0, 0]} maxBarSize={32} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  </Tabs>
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