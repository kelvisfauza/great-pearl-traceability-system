import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { accruedInterest } from "@/lib/investAccrual";

const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

export default function TreasuryInvestments() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["treasury-investments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("investments")
        .select("id, employee_name, user_email, amount, interest_rate, start_date, maturity_date, status, earned_interest, total_payout")
        .order("start_date", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60000,
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading investments…</p>;
  if (error) return <p className="text-sm text-destructive">Could not load investments: {(error as Error).message}</p>;
  const rows = (data || []).map((r) => ({ ...r, accrued: accruedInterest(r) }));
  const active = rows.filter((r) => r.status === "active");
  const sum = (a: any[], k: string) => a.reduce((s, r) => s + Number(r[k] || 0), 0);
  const stats = [
    ["Active principal", ugx(sum(active, "amount"))],
    ["Interest accumulated (active)", ugx(sum(active, "accrued"))],
    ["Owed at maturity (active)", ugx(active.reduce((s, r) => s + Number(r.amount) * (1 + Number(r.interest_rate) / 100), 0))],
    ["Interest already paid out", ugx(sum(rows.filter((r) => r.status !== "active"), "earned_interest"))],
  ];
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(([l, v]) => <Card key={l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-lg font-semibold">{v}</p></CardContent></Card>)}
    </div>
    <Card><CardHeader><CardTitle className="text-base">Invest & Earn subscribers</CardTitle><p className="text-xs text-muted-foreground">Active interest grows day by day toward the full rate at maturity.</p></CardHeader>
      <CardContent className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2">Subscriber</th><th>Amount</th><th>Rate</th><th>Start</th><th>Maturity</th><th>Status</th><th className="text-right">Interest so far</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-b last:border-0">
          <td className="py-2">{r.employee_name}</td><td>{ugx(r.amount)}</td><td>{r.interest_rate}%</td><td>{r.start_date}</td><td>{r.maturity_date}</td>
          <td><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status.replace(/_/g, " ")}</Badge></td>
          <td className="text-right font-medium">{ugx(r.accrued)}</td></tr>)}
          {!rows.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No investments yet.</td></tr>}
        </tbody></table></CardContent></Card>
  </div>;
}
