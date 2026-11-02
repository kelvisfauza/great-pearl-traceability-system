import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Row {
  id: string; ref: string; buyer: string; quality: string; total: number; delivered: number;
  dispatches: number; price: number | null; end: string | null;
}
const fmt = (n: number) => n.toLocaleString("en-UG", { maximumFractionDigits: 0 });

/** Running buyer contracts; delivered kg comes from Procurement-confirmed Store clearances (real time). */
const RunningContractsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ data: contracts, error: e1 }, { data: clr, error: e2 }] = await Promise.all([
        (supabase.from("buyer_contracts") as any)
          .select("id,contract_ref,buyer_name,quality,total_quantity,price_per_kg,delivery_period_end,status")
          .eq("status", "active"),
        (supabase.from("store_clearance_forms") as any)
          .select("contract_id,total_weight_kg")
          .eq("procurement_status", "confirmed").not("contract_id", "is", null),
      ]);
      if (e1) throw e1; if (e2) throw e2;
      const agg: Record<string, { kg: number; n: number }> = {};
      (clr || []).forEach((c: any) => {
        const a = (agg[c.contract_id] ||= { kg: 0, n: 0 });
        a.kg += Number(c.total_weight_kg) || 0; a.n++;
      });
      setRows((contracts || []).map((c: any) => ({
        id: c.id, ref: c.contract_ref || "", buyer: c.buyer_name || "", quality: c.quality || "",
        total: Number(c.total_quantity) || 0, delivered: agg[c.id]?.kg || 0, dispatches: agg[c.id]?.n || 0,
        price: c.price_per_kg != null ? Number(c.price_per_kg) : null, end: c.delivery_period_end,
      })).sort((a: Row, b: Row) => (b.total - b.delivered) - (a.total - a.delivered)));
      setError(null);
    } catch (e: any) {
      setError(e.message || "Could not load contracts");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel(`running-contracts-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_clearance_forms" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "buyer_contracts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const total = rows.reduce((a, r) => a + r.total, 0);
  const delivered = rows.reduce((a, r) => a + Math.min(r.delivered, r.total), 0);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) return <Card><CardContent className="p-6 text-destructive">{error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Running contracts</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Contracted kg</p><p className="text-2xl font-bold">{fmt(total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Delivered kg</p><p className="text-2xl font-bold">{fmt(delivered)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Balance left kg</p><p className="text-2xl font-bold">{fmt(total - delivered)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Running Contracts</CardTitle>
          <CardDescription>Active buyer contracts. Delivered kg updates live from Store clearances that Procurement has confirmed against each contract.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!rows.length && <p className="text-sm text-muted-foreground">No active contracts.</p>}
          {rows.map((r) => {
            const bal = r.total - r.delivered;
            const pct = r.total > 0 ? Math.min(100, (r.delivered / r.total) * 100) : 0;
            return (
              <div key={r.id} className="border rounded-md p-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.ref} · {r.buyer}</p>
                    <p className="text-xs text-muted-foreground">{r.quality}{r.price != null ? ` · UGX ${fmt(r.price)}/kg` : ""}{r.end ? ` · ends ${r.end}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{fmt(r.delivered)} / {fmt(r.total)} kg · {r.dispatches} dispatch{r.dispatches === 1 ? "" : "es"}</p>
                    {bal < 0
                      ? <Badge variant="destructive">Over by {fmt(-bal)} kg</Badge>
                      : <p className="font-semibold">Balance: {fmt(bal)} kg</p>}
                  </div>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default RunningContractsTab;
