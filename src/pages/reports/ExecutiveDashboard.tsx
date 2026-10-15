import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2, TrendingUp, TrendingDown, Package, Scale, DollarSign, Users, Warehouse, Award } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, LabelList,
} from "recharts";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtM = (n: number) => (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 });

const TYPE_COLORS = ["#f97316", "#3b82f6", "#22d3ee", "#facc15", "#94a3b8", "#34d399"];

const Ring = ({ pct, color }: { pct: number; color: string }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700">{Math.round(p)}%</text>
    </svg>
  );
};

const Card = ({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-slate-800 bg-slate-900/70 p-4 ${className}`}>
    {title && (
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wide text-slate-100 uppercase">{title}</h3>
        {right}
      </div>
    )}
    {children}
  </div>
);

const Kpi = ({ label, value, sub, pct, color, icon: Icon }: { label: string; value: string; sub: string; pct: number; color: string; icon: any }) => (
  <Card>
    <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{label}</p>
    <div className="mt-2 flex items-center gap-3">
      <Ring pct={pct} color={color} />
      <div className="min-w-0">
        <p className="truncate text-xl font-extrabold text-white">{value}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          <Icon className="h-3 w-3" />{sub}
        </p>
      </div>
    </div>
  </Card>
);

const ExecutiveDashboard = () => {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const prevStart = `${year - 1}-01-01`;
  const prevEnd = `${year - 1}-12-31`;

  const { data, isLoading } = useQuery({
    queryKey: ["executive-dashboard", year],
    queryFn: async () => {
      const [sales, salesPrev, coffee, coffeePrev, batches, suppliers, assessments] = await Promise.all([
        supabase.from("sales_transactions").select("total_amount, weight, created_at, customer").gte("created_at", yearStart),
        supabase.from("sales_transactions").select("total_amount, weight").gte("created_at", prevStart).lte("created_at", prevEnd),
        supabase.from("coffee_records").select("kilograms, coffee_type, created_at, status").gte("created_at", yearStart),
        supabase.from("coffee_records").select("kilograms, coffee_type").gte("created_at", prevStart).lte("created_at", prevEnd),
        supabase.from("inventory_batches").select("remaining_kilograms, coffee_type, status").neq("status", "sold_out"),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("quality_assessments").select("final_price, suggested_price").order("created_at", { ascending: false }).limit(200),
      ]);
      return {
        sales: sales.data || [], salesPrev: salesPrev.data || [],
        coffee: coffee.data || [], coffeePrev: coffeePrev.data || [],
        batches: batches.data || [], supplierCount: suppliers.count || 0,
        assessments: assessments.data || [],
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const revenue = data.sales.reduce((s, r) => s + (r.total_amount || 0), 0);
    const revenuePrev = data.salesPrev.reduce((s, r) => s + (r.total_amount || 0), 0);
    const kgSold = data.sales.reduce((s, r) => s + (r.weight || 0), 0);
    const kgBought = data.coffee.reduce((s, r) => s + (r.kilograms || 0), 0);
    const stock = data.batches.reduce((s, b) => s + (b.remaining_kilograms || 0), 0);
    const prices = data.assessments.map(a => a.final_price || a.suggested_price).filter(Boolean) as number[];
    const avgPrice = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;
    const yoyRev = revenuePrev > 0 ? ((revenue - revenuePrev) / revenuePrev) * 100 : 0;

    // Coffee type share (by kg bought this year)
    const typeMap = new Map<string, number>();
    data.coffee.forEach(r => typeMap.set(r.coffee_type || "Other", (typeMap.get(r.coffee_type || "Other") || 0) + (r.kilograms || 0)));
    const typeShare = [...typeMap.entries()].map(([name, v]) => ({ name, value: Math.round(v) })).sort((a, b) => b.value - a.value).slice(0, 6);
    const totalTypeKg = typeShare.reduce((s, t) => s + t.value, 0);

    // Monthly revenue trajectory
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly = months.map((m, i) => ({ month: m, revenue: 0, kg: 0 }));
    data.sales.forEach(r => {
      const d = new Date(r.created_at);
      if (!isNaN(d.getTime())) { monthly[d.getMonth()].revenue += r.total_amount || 0; monthly[d.getMonth()].kg += r.weight || 0; }
    });

    // YoY by coffee type
    const prevType = new Map<string, number>();
    data.coffeePrev.forEach(r => prevType.set(r.coffee_type || "Other", (prevType.get(r.coffee_type || "Other") || 0) + (r.kilograms || 0)));
    const yoy = [...typeMap.entries()].map(([name, kg]) => {
      const prev = prevType.get(name) || 0;
      return { name, cur: kg, prev, change: prev > 0 ? ((kg - prev) / prev) * 100 : (kg > 0 ? 100 : 0), share: totalTypeKg > 0 ? (kg / totalTypeKg) * 100 : 0 };
    }).sort((a, b) => b.cur - a.cur).slice(0, 6);

    // Stock by type
    const stockMap = new Map<string, number>();
    data.batches.forEach(b => stockMap.set(b.coffee_type || "Other", (stockMap.get(b.coffee_type || "Other") || 0) + (b.remaining_kilograms || 0)));
    const stockByType = [...stockMap.entries()].map(([name, v]) => ({ name, kg: Math.round(v) })).sort((a, b) => b.kg - a.kg).slice(0, 6);

    // Top customer
    const custMap = new Map<string, number>();
    data.sales.forEach(r => { if (r.customer) custMap.set(r.customer, (custMap.get(r.customer) || 0) + (r.total_amount || 0)); });
    const topCustomer = [...custMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const sellThrough = kgBought > 0 ? (kgSold / kgBought) * 100 : 0;
    return { revenue, revenuePrev, kgSold, kgBought, stock, avgPrice, yoyRev, typeShare, monthly, yoy, stockByType, topCustomer, sellThrough, totalTypeKg };
  }, [data]);

  if (isLoading || !stats) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  }

  const stockHealth = stats.kgBought > 0 ? Math.min(100, (stats.stock / stats.kgBought) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 print:bg-white">
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-wide text-white sm:text-3xl">GREAT AGRO COFFEE — EXECUTIVE DASHBOARD</h1>
            <p className="mt-1 text-sm text-slate-400">A member of Hello YEDA COFFEE COMPANY LIMITED • Executive Summary {year}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" className="gap-2 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-4 w-4" /> Back to Reports
            </Button>
            <Button className="gap-2 bg-orange-500 font-bold text-white hover:bg-orange-600" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Export PDF
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Revenue" value={`UGX ${fmtM(stats.revenue)}M`} sub={`${stats.yoyRev >= 0 ? "+" : ""}${stats.yoyRev.toFixed(1)}% vs ${year - 1}`} pct={Math.min(100, Math.abs(stats.yoyRev))} color="#f97316" icon={stats.yoyRev >= 0 ? TrendingUp : TrendingDown} />
          <Kpi label="Coffee Bought" value={`${fmt(stats.kgBought)} kg`} sub={`${(stats.kgBought / 1000).toFixed(1)} tons this year`} pct={100} color="#3b82f6" icon={Package} />
          <Kpi label="Coffee Sold" value={`${fmt(stats.kgSold)} kg`} sub={`${stats.sellThrough.toFixed(0)}% of purchases`} pct={stats.sellThrough} color="#22d3ee" icon={Scale} />
          <Kpi label="Stock in Store" value={`${fmt(stats.stock)} kg`} sub={`${(stats.stock / 1000).toFixed(1)} tons available`} pct={stockHealth} color="#34d399" icon={Warehouse} />
          <Kpi label="Avg Price / kg" value={`UGX ${fmt(stats.avgPrice)}`} sub="Latest quality assessments" pct={75} color="#facc15" icon={DollarSign} />
          <Kpi label="Active Suppliers" value={`${data!.supplierCount}`} sub="Registered suppliers" pct={100} color="#a78bfa" icon={Users} />
        </div>

        {/* Charts row */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title={`Coffee Type Mix (${year})`} right={<span className="text-xs text-slate-500">by kg bought</span>}>
            <div className="flex items-center gap-4">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={stats.typeShare} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} strokeWidth={0}>
                      {stats.typeShare.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${fmt(Number(v))} kg`} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                {stats.typeShare.map((t, i) => (
                  <li key={t.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />{t.name}</span>
                    <span className="font-semibold text-slate-300">{stats.totalTypeKg > 0 ? ((t.value / stats.totalTypeKg) * 100).toFixed(1) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card title={`${year} Monthly Revenue Trajectory`} right={<span className="text-xs font-semibold text-emerald-400">UGX {fmtM(stats.revenue)}M YTD</span>}>
            <div className="h-48">
              <ResponsiveContainer>
                <AreaChart data={stats.monthly} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${fmtM(v)}M`} width={45} />
                  <Tooltip formatter={(v: any) => `UGX ${fmt(Number(v))}`} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Stock by Coffee Type" right={<span className="text-xs text-slate-500">kg remaining</span>}>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={stats.stockByType} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(v: any) => `${fmt(Number(v))} kg`} contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                  <Bar dataKey="kg" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                    <LabelList dataKey="kg" position="right" formatter={(v: any) => fmt(Number(v))} style={{ fill: "#94a3b8", fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* YoY table */}
        <Card title={`YoY Coffee Purchases by Type`} right={<span className="text-xs font-semibold text-orange-400">{year - 1} vs {year}</span>} className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-[11px] tracking-wider text-slate-500 uppercase">
                  <th className="py-2 pr-4">Coffee Type</th>
                  <th className="py-2 pr-4 text-right">{year - 1} (kg)</th>
                  <th className="py-2 pr-4 text-right">{year} (kg)</th>
                  <th className="py-2 pr-4 text-right">YoY Change</th>
                  <th className="py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {stats.yoy.map((r, i) => (
                  <tr key={r.name} className="border-b border-slate-800/60">
                    <td className="py-2.5 pr-4 font-medium text-slate-200">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} />{r.name}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-slate-400">{fmt(r.prev)}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-white">{fmt(r.cur)}</td>
                    <td className={`py-2.5 pr-4 text-right font-semibold ${r.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {r.change >= 0 ? "+" : ""}{r.change.toFixed(1)}% {r.change >= 0 ? "↑" : "↓"}
                    </td>
                    <td className="py-2.5 text-right text-slate-400">{r.share.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="font-bold text-white">
                  <td className="py-2.5 pr-4">TOTAL</td>
                  <td className="py-2.5 pr-4 text-right">{fmt(stats.yoy.reduce((s, r) => s + r.prev, 0))}</td>
                  <td className="py-2.5 pr-4 text-right text-orange-400">{fmt(stats.yoy.reduce((s, r) => s + r.cur, 0))}</td>
                  <td className="py-2.5 pr-4 text-right"></td>
                  <td className="py-2.5 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom strip */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">YTD Revenue</p>
            <p className="mt-1 text-2xl font-extrabold text-white">UGX {fmt(stats.revenue)}</p>
            <p className="mt-1 text-xs text-slate-500">{year - 1}: UGX {fmtM(stats.revenuePrev)}M</p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Top Customer</p>
            <p className="mt-1 truncate text-xl font-extrabold text-white">{stats.topCustomer?.[0] || "—"}</p>
            <p className="mt-1 text-xs text-orange-400">{stats.topCustomer ? `UGX ${fmtM(stats.topCustomer[1])}M revenue` : "No sales yet"}</p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Sell-Through Rate</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{stats.sellThrough.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-slate-500">of bought coffee sold</p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Stock Health</p>
            <p className={`mt-1 text-2xl font-extrabold ${stockHealth > 50 ? "text-red-400" : "text-emerald-400"}`}>{stockHealth > 50 ? "High Stock" : "Healthy"}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Award className="h-3 w-3" />{fmt(stats.stock)} kg in store</p>
          </Card>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Data refreshed: {new Date().toLocaleString()} • Source: Great Agro Coffee records • Internal Executive Use Only
        </p>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
