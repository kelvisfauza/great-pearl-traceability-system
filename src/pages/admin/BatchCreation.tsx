import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PackagePlus, ClipboardCheck, RefreshCw } from "lucide-react";

type Row = {
  id: string; batch_number: string | null; supplier_name: string | null; coffee_type: string;
  kilograms: number; bags: number; date: string; status: string;
  verification?: { verified_kg: number; verified_bags: number; verified_by: string; verified_at: string } | null;
};

const db = supabase as any;

export default function BatchCreation() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState<Row | null>(null);
  const [kg, setKg] = useState(""); const [bags, setBags] = useState(""); const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const all: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("coffee_records")
          .select("id,batch_number,supplier_name,coffee_type,kilograms,bags,date,status")
          .in("status", ["inventory", "assessed"]).gt("kilograms", 0)
          .gte("date", new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10))
          .order("date", { ascending: false }).range(from, from + 999);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      const ids = all.map((r) => r.id);
      const linked = new Set<string>(); const ver = new Map<string, any>();
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const [s, v] = await Promise.all([
          db.from("inventory_batch_sources").select("coffee_record_id").in("coffee_record_id", chunk),
          db.from("store_delivery_verifications").select("coffee_record_id,verified_kg,verified_bags,verified_by,verified_at").in("coffee_record_id", chunk),
        ]);
        if (s.error) throw s.error; if (v.error) throw v.error;
        s.data.forEach((x: any) => linked.add(x.coffee_record_id));
        v.data.forEach((x: any) => ver.set(x.coffee_record_id, x));
      }
      setRows(all.filter((r) => !linked.has(r.id)).map((r) => ({ ...r, verification: ver.get(r.id) || null })));
      setSelected(new Set());
    } catch (e: any) { setError(e.message || "Could not load deliveries"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isReady = (r: Row) => !!r.verification && Number(r.verification.verified_kg) === Number(r.kilograms) && Number(r.verification.verified_bags) === Number(r.bags);
  const filtered = useMemo(() => rows.filter((r) => !q || `${r.supplier_name} ${r.batch_number} ${r.coffee_type}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);
  const chosen = rows.filter((r) => selected.has(r.id));
  const chosenKg = chosen.reduce((s, r) => s + Number(r.kilograms || 0), 0);
  const chosenType = chosen[0]?.coffee_type?.toLowerCase();
  const waiting = rows.filter((r) => !r.verification).length;
  const ready = rows.filter(isReady).length;

  const toggle = (r: Row) => {
    const next = new Set(selected);
    if (next.has(r.id)) next.delete(r.id);
    else {
      if (chosenType && chosenType !== r.coffee_type.toLowerCase()) { toast.error("A batch can only hold one coffee type"); return; }
      next.add(r.id);
    }
    setSelected(next);
  };

  const openVerify = (r: Row) => { setVerifying(r); setKg(String(r.verification?.verified_kg ?? "")); setBags(String(r.verification?.verified_bags ?? "")); setNotes(""); };

  const saveVerify = async () => {
    if (!verifying) return;
    setBusy(true);
    const { data, error } = await db.rpc("verify_store_delivery", { p_coffee_record_id: verifying.id, p_verified_kg: Number(kg), p_verified_bags: Number(bags), p_notes: notes });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data?.matches) toast.success("Delivery verified"); else toast.warning("Saved, but your count differs from the Store record. Ask Store to correct it before batching.");
    setVerifying(null); load();
  };

  const createBatch = async () => {
    setBusy(true);
    const { data, error } = await db.rpc("admin_create_inventory_batch", { p_record_ids: [...selected] });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Batch ${data.batch_code} created — ${Number(data.kilograms).toLocaleString()} kg`);
    load();
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Batch Creation</h1>
          <p className="text-sm text-muted-foreground">Go to the Store, count each delivery, verify it here, then group verified deliveries into a batch.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Waiting to verify</p><p className="text-xl font-bold">{waiting}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Ready to batch</p><p className="text-xl font-bold">{ready}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Selected</p><p className="text-xl font-bold">{chosen.length} · {chosenKg.toLocaleString()} kg</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Accepted deliveries not yet in a batch</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search supplier or number" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            <Button onClick={createBatch} disabled={!chosen.length || busy}><PackagePlus className="h-4 w-4 mr-1" />Create batch</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {error && <div className="text-sm text-destructive">{error} <Button size="sm" variant="link" onClick={load}>Retry</Button></div>}
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && !error && filtered.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting. Every accepted delivery is in a batch.</p>}
          {filtered.map((r) => {
            const ok = isReady(r);
            const mismatch = r.verification && !ok;
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2">
                <Checkbox checked={selected.has(r.id)} disabled={!ok} onCheckedChange={() => toggle(r)} aria-label="Select delivery" />
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium">{r.supplier_name || "Unknown supplier"} <span className="text-xs text-muted-foreground">{r.batch_number}</span></p>
                  <p className="text-xs text-muted-foreground">{r.date} · {r.coffee_type} · {Number(r.kilograms).toLocaleString()} kg · {r.bags} bags</p>
                  {r.verification && <p className="text-xs text-muted-foreground">Counted {Number(r.verification.verified_kg).toLocaleString()} kg / {r.verification.verified_bags} bags by {r.verification.verified_by}</p>}
                </div>
                {ok ? <Badge>Verified</Badge> : mismatch ? <Badge variant="destructive">Count differs</Badge> : <Badge variant="outline">Not verified</Badge>}
                <Button size="sm" variant="outline" onClick={() => openVerify(r)}><ClipboardCheck className="h-4 w-4 mr-1" />{r.verification ? "Re-verify" : "Verify"}</Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!verifying} onOpenChange={(o) => !o && setVerifying(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify at Store — {verifying?.supplier_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Enter what you counted yourself. Store recorded {Number(verifying?.kilograms || 0).toLocaleString()} kg and {verifying?.bags} bags.</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs">Counted weight (kg)</label><Input type="number" value={kg} onChange={(e) => setKg(e.target.value)} /></div>
            <div><label className="text-xs">Counted bags</label><Input type="number" value={bags} onChange={(e) => setBags(e.target.value)} /></div>
          </div>
          <Input placeholder="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <DialogFooter><Button onClick={saveVerify} disabled={busy || !kg || !bags}>Save verification</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
