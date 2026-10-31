import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;
const dateTime = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Kampala" });

export default function TreasuryTransactions() {
  const [accounts, setAccounts] = useState<{ code: string; name: string }[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [account, setAccount] = useState("all");
  const [direction, setDirection] = useState("all");
  const [reference, setReference] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    (supabase as any).rpc("get_treasury_accounts_overview").then(({ data }: any) => {
      if (active && data?.ok) setAccounts(data.accounts ?? []);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setBusy(true); setError(null);
      try {
        if (from && to && from > to) throw new Error("The end date must be on or after the start date.");
        let query = (supabase as any).from("treasury_account_entries").select("*", { count: "exact" });
        if (account !== "all") query = query.eq("account_code", account);
        if (direction !== "all") query = query.eq("direction", direction);
        if (reference.trim()) query = query.ilike("reference", `%${reference.trim().replace(/[%_]/g, "")}%`);
        if (from) query = query.gte("created_at", `${from}T00:00:00+03:00`);
        if (to) query = query.lte("created_at", `${to}T23:59:59.999999+03:00`);
        const result = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (result.error) throw result.error;
        if (active) { setRows(result.data ?? []); setCount(result.count ?? 0); }
      } catch (e: any) { if (active) { setRows([]); setCount(0); setError(e.message || "Could not load movements"); } }
      finally { if (active) setBusy(false); }
    };
    void load();
    return () => { active = false; };
  }, [account, direction, reference, from, to, page, refresh]);
  const name = (code: string) => accounts.find(a => a.code === code)?.name || code;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1"><Label>Account</Label><Select value={account} onValueChange={v => { setAccount(v); setPage(0); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem>{accounts.map(a => <SelectItem key={a.code} value={a.code}>{a.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Movement</Label><Select value={direction} onValueChange={v => { setDirection(v); setPage(0); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All movements</SelectItem><SelectItem value="credit">Credits</SelectItem><SelectItem value="debit">Debits</SelectItem></SelectContent></Select></div>
      <div className="space-y-1"><Label htmlFor="treasury-reference">Reference</Label><Input id="treasury-reference" value={reference} placeholder="Search reference" onChange={e => { setReference(e.target.value); setPage(0); }} /></div>
      <div className="space-y-1"><Label htmlFor="treasury-from">From · Kampala</Label><Input id="treasury-from" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} /></div>
      <div className="space-y-1"><Label htmlFor="treasury-to">To · Kampala</Label><Input id="treasury-to" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0); }} /></div>
    </div>
    <div className="flex justify-between items-center gap-3"><span className="text-sm text-muted-foreground">{count.toLocaleString()} account movements</span><Button variant="outline" size="sm" disabled={busy} onClick={() => setRefresh(v => v + 1)}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Refresh</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="overflow-x-auto border rounded-md"><Table><TableHeader><TableRow><TableHead>Date · Kampala</TableHead><TableHead>Account / counterparty</TableHead><TableHead>Reference / details</TableHead><TableHead>Employee</TableHead><TableHead>Done by</TableHead><TableHead className="text-right">Amount · UGX</TableHead><TableHead className="text-right">Balance after · UGX</TableHead></TableRow></TableHeader><TableBody>
      {busy ? <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading movements…</TableCell></TableRow> : rows.map(r => <TableRow key={r.id}>
        <TableCell className="text-xs whitespace-nowrap">{dateTime(r.created_at)}</TableCell>
        <TableCell className="min-w-[160px]"><div className="font-medium text-sm">{name(r.account_code)}</div><div className="text-xs text-muted-foreground">{r.counter_account ? name(r.counter_account) : "—"}</div></TableCell>
        <TableCell className="min-w-[220px]"><div className="font-mono text-xs break-all">{r.reference || "—"}</div><div className="text-xs text-muted-foreground">{r.description || "—"}</div></TableCell>
        <TableCell className="text-xs">{r.related_user_name || r.related_user_email || "—"}</TableCell><TableCell className="text-xs">{r.performed_by || "—"}</TableCell>
        <TableCell className="text-right whitespace-nowrap"><Badge variant={r.direction === "credit" ? "secondary" : "outline"}>{r.direction === "credit" ? "+" : "−"}{Number(r.amount).toLocaleString()}</Badge></TableCell><TableCell className="text-right font-mono text-xs">{Number(r.balance_after).toLocaleString()}</TableCell>
      </TableRow>)}
      {!busy && !error && rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No movements match these filters.</TableCell></TableRow>}
    </TableBody></Table></div>
    <div className="flex justify-end items-center gap-3"><Button variant="outline" size="icon" aria-label="Previous page" disabled={busy || page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm">Page {page + 1} of {Math.max(1, Math.ceil(count / PAGE_SIZE))}</span><Button variant="outline" size="icon" aria-label="Next page" disabled={busy || (page + 1) * PAGE_SIZE >= count} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
  </div>;
}