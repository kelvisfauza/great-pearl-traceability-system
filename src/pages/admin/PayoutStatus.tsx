import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Stage = "approved" | "pending" | "failed" | "released";

export function payoutStage(r: { payout_status?: string | null; payout_completed_at?: string | null }): Stage {
  const p = (r.payout_status || "").toLowerCase();
  if (r.payout_completed_at || ["sent", "completed", "success", "successful", "released", "paid"].includes(p)) return "released";
  if (p === "failed" || p === "error" || p === "reversed") return "failed";
  if (p) return "pending";
  return "approved";
}

const LABEL: Record<Stage, string> = {
  approved: "Approved – not sent",
  pending: "Sending",
  failed: "Failed",
  released: "Released",
};
const VARIANT: Record<Stage, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "outline",
  pending: "secondary",
  failed: "destructive",
  released: "default",
};

const fmt = (n: number) => `UGX ${Math.round(n || 0).toLocaleString()}`;

export default function PayoutStatus() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Stage | "all">("all");
  const [q, setQ] = useState("");

  const load = async () => {
    const since = new Date(Date.now() - 60 * 864e5).toISOString();
    const { data, error } = await (supabase as any)
      .from("approval_requests")
      .select("id,type,title,amount,requestedby,status,finance_approved_at,updated_at,payout_status,payout_provider,payout_ref,payout_error,payout_phone,payout_attempted_at,payout_completed_at,disbursement_method")
      .ilike("status", "approved")
      .gte("created_at", since)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    else { setError(null); setRows(data || []); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`payout-status-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_requests" }, () => load())
      .subscribe();
    const t = setInterval(load, 15000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, []);

  const withStage = useMemo(() => rows.map(r => ({ ...r, stage: payoutStage(r) })), [rows]);
  const counts = useMemo(() => {
    const c: Record<Stage, { n: number; amt: number }> = { approved: { n: 0, amt: 0 }, pending: { n: 0, amt: 0 }, failed: { n: 0, amt: 0 }, released: { n: 0, amt: 0 } };
    withStage.forEach(r => { c[r.stage as Stage].n++; c[r.stage as Stage].amt += Number(r.amount) || 0; });
    return c;
  }, [withStage]);
  const shown = withStage.filter(r =>
    (filter === "all" || r.stage === filter) &&
    (!q || `${r.title} ${r.requestedby} ${r.type} ${r.payout_ref}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Payout status</h1>
        <p className="text-sm text-muted-foreground">Approved requests in the last 60 days and where each payment stands. Updates live.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(LABEL) as Stage[]).map(s => (
          <button key={s} onClick={() => setFilter(filter === s ? "all" : s)} className="text-left">
            <Card className={filter === s ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-1"><CardTitle className="text-sm">{LABEL[s]}</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{counts[s].n}</div><div className="text-xs text-muted-foreground">{fmt(counts[s].amt)}</div></CardContent>
            </Card>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search name, title or reference" value={q} onChange={e => setQ(e.target.value)} />
        <Button variant="outline" onClick={() => setFilter("all")}>Show all</Button>
      </div>
      {error && <p className="text-destructive text-sm">Couldn't load payouts: {error}</p>}
      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {shown.length === 0 && <p className="text-muted-foreground text-sm">No requests here.</p>}
          {shown.map(r => (
            <Card key={r.id}>
              <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-2 justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title || r.type}</div>
                  <div className="text-xs text-muted-foreground">{r.requestedby} · {r.type}{r.payout_provider ? ` · ${r.payout_provider}` : r.disbursement_method ? ` · ${r.disbursement_method}` : ""}{r.payout_ref ? ` · ref ${r.payout_ref}` : ""}</div>
                  {r.stage === "failed" && r.payout_error && <div className="text-xs text-destructive">{r.payout_error}</div>}
                  <div className="text-xs text-muted-foreground">
                    {r.payout_completed_at ? `Released ${new Date(r.payout_completed_at).toLocaleString()}` :
                      r.payout_attempted_at ? `Last attempt ${new Date(r.payout_attempted_at).toLocaleString()}` :
                      r.finance_approved_at ? `Approved ${new Date(r.finance_approved_at).toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold">{fmt(r.amount)}</span>
                  <Badge variant={VARIANT[r.stage as Stage]}>{LABEL[r.stage as Stage]}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
