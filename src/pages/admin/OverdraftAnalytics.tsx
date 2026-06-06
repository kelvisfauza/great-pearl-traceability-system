import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Send, ExternalLink, TrendingUp, Wallet, AlertTriangle, Coins } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type Account = {
  id: string;
  employee_email: string;
  employee_name: string | null;
  approved_limit: number;
  outstanding_balance: number;
  total_drawn: number;
  total_recovered: number;
  total_interest: number;
  status: string;
  frozen: boolean;
  last_used_at: string | null;
};

type Txn = {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference: string | null;
  metadata: any;
  created_at: string;
};

const fmt = (n: number) => `UGX ${Math.round(Number(n || 0)).toLocaleString()}`;

export default function OverdraftAnalytics() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const load = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - range * 86400000).toISOString();
      const [aRes, tRes] = await Promise.all([
        (supabase as any).from("overdraft_accounts").select("*"),
        (supabase as any)
          .from("overdraft_transactions")
          .select("*")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (aRes.error) throw aRes.error;
      if (tRes.error) throw tRes.error;
      setAccounts((aRes.data as Account[]) || []);
      setTxns((tRes.data as Txn[]) || []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const stats = useMemo(() => {
    const active = accounts.filter((a) => a.status === "active");
    const totalLimit = active.reduce((s, a) => s + Number(a.approved_limit || 0), 0);
    const outstanding = active.reduce((s, a) => s + Number(a.outstanding_balance || 0), 0);
    const totalDrawn = accounts.reduce((s, a) => s + Number(a.total_drawn || 0), 0);
    const totalRecovered = accounts.reduce((s, a) => s + Number(a.total_recovered || 0), 0);
    const totalInterest = accounts.reduce((s, a) => s + Number(a.total_interest || 0), 0);
    const drawingNow = active.filter((a) => Number(a.outstanding_balance) > 0).length;
    const frozen = active.filter((a) => a.frozen).length;
    const utilization = totalLimit > 0 ? (outstanding / totalLimit) * 100 : 0;
    return { activeCount: active.length, totalLimit, outstanding, totalDrawn, totalRecovered, totalInterest, drawingNow, frozen, utilization };
  }, [accounts]);

  // Daily series for interest earned + draws + recoveries
  const series = useMemo(() => {
    const buckets = new Map<string, { date: string; interest: number; draws: number; recovered: number }>();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key.slice(5), interest: 0, draws: 0, recovered: 0 });
    }
    txns.forEach((t) => {
      const key = t.created_at.slice(0, 10);
      const b = buckets.get(key);
      if (!b) return;
      const amt = Number(t.amount || 0);
      const interestMeta = Number(t?.metadata?.interest_charged || 0);
      if (t.transaction_type === "interest") {
        b.interest += Math.abs(amt) || interestMeta;
      } else if (t.transaction_type === "draw") {
        b.draws += Math.abs(amt);
        if (interestMeta > 0) b.interest += interestMeta; // upfront interest captured at draw
      } else if (t.transaction_type === "recovery" || t.transaction_type === "repayment") {
        b.recovered += Math.abs(amt);
      }
    });
    return Array.from(buckets.values());
  }, [txns, range]);

  const topDrawers = useMemo(
    () =>
      [...accounts]
        .filter((a) => Number(a.total_drawn) > 0)
        .sort((a, b) => Number(b.total_drawn) - Number(a.total_drawn))
        .slice(0, 10),
    [accounts]
  );

  const topInterest = useMemo(
    () =>
      [...accounts]
        .filter((a) => Number(a.total_interest) > 0)
        .sort((a, b) => Number(b.total_interest) - Number(a.total_interest))
        .slice(0, 10),
    [accounts]
  );

  const broadcast = async () => {
    if (!confirm("Send the overdraft qualification email to every eligible employee whose limit changed since last notice?")) return;
    setBroadcasting(true);
    try {
      const { data, error } = await supabase.functions.invoke("overdraft-recompute-limits", {
        body: { announce_all: true, trigger: "manual_broadcast" },
      });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || error?.message);
      toast({ title: "Announcement queued", description: `${(data as any).emails_queued || 0} emails queued for delivery.` });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Overdraft Analytics</h1>
            <p className="text-sm text-muted-foreground">Usage, interest earned and exposure across all wallet overdrafts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-md border overflow-hidden">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setRange(d as 7 | 30 | 90)}
                  className={`px-3 py-1.5 text-xs ${range === d ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Refresh
            </Button>
            <Button size="sm" onClick={broadcast} disabled={broadcasting}>
              {broadcasting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send qualification emails
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/overdraft">
                <ExternalLink className="h-4 w-4 mr-1" /> Manage accounts
              </Link>
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Coins className="h-4 w-4" />} label="Interest earned (all-time)" value={fmt(stats.totalInterest)} accent="text-emerald-600" />
          <StatCard icon={<Wallet className="h-4 w-4" />} label="Outstanding now" value={fmt(stats.outstanding)} accent={stats.outstanding > 0 ? "text-destructive" : ""} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Total drawn (lifetime)" value={fmt(stats.totalDrawn)} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Total recovered" value={fmt(stats.totalRecovered)} />
          <StatCard label="Active accounts" value={String(stats.activeCount)} />
          <StatCard label="Drawing right now" value={String(stats.drawingNow)} />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Frozen accounts" value={String(stats.frozen)} accent={stats.frozen > 0 ? "text-amber-600" : ""} />
          <StatCard label="Portfolio utilization" value={`${stats.utilization.toFixed(1)}%`} sub={`of ${fmt(stats.totalLimit)} approved`} />
        </div>

        {/* Interest earned trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interest earned — last {range} days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="intg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Area type="monotone" dataKey="interest" stroke="hsl(var(--primary))" fill="url(#intg)" name="Interest" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Draws vs recoveries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draws vs. recoveries — last {range} days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="draws" fill="#ef4444" name="Drawn" />
                  <Bar dataKey="recovered" fill="#10b981" name="Recovered" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top users by overdraft usage</CardTitle></CardHeader>
            <CardContent>
              {topDrawers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No draws yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr><th className="text-left py-2">Member</th><th className="text-right">Drawn</th><th className="text-right">Outstanding</th></tr>
                  </thead>
                  <tbody>
                    {topDrawers.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2">
                          <div className="font-medium">{a.employee_name || a.employee_email}</div>
                          <div className="text-xs text-muted-foreground">{a.employee_email}</div>
                        </td>
                        <td className="text-right">{fmt(a.total_drawn)}</td>
                        <td className={`text-right ${Number(a.outstanding_balance) > 0 ? "text-destructive font-semibold" : ""}`}>{fmt(a.outstanding_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Top contributors to interest earned</CardTitle></CardHeader>
            <CardContent>
              {topInterest.length === 0 ? (
                <p className="text-sm text-muted-foreground">No interest earned yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr><th className="text-left py-2">Member</th><th className="text-right">Interest</th><th className="text-right">Drawn</th></tr>
                  </thead>
                  <tbody>
                    {topInterest.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2">
                          <div className="font-medium">{a.employee_name || a.employee_email}</div>
                          <div className="text-xs text-muted-foreground">{a.employee_email}</div>
                        </td>
                        <td className="text-right text-emerald-600 font-semibold">{fmt(a.total_interest)}</td>
                        <td className="text-right">{fmt(a.total_drawn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent overdraft activity</CardTitle></CardHeader>
          <CardContent>
            {txns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdraft activity in the selected window.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">When</th>
                      <th className="text-left">Type</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Balance after</th>
                      <th className="text-left">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.slice(0, 100).map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                        <td>
                          <Badge variant={t.transaction_type === "interest" ? "default" : t.transaction_type === "draw" ? "destructive" : "secondary"}>
                            {t.transaction_type}
                          </Badge>
                        </td>
                        <td className="text-right">{fmt(Math.abs(Number(t.amount)))}</td>
                        <td className="text-right">{fmt(t.balance_after)}</td>
                        <td className="text-xs text-muted-foreground truncate max-w-[260px]">{t.reference || t?.metadata?.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon?: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className={`text-lg font-bold ${accent || ""}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}