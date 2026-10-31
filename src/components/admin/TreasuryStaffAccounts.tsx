import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, RefreshCw, UserRound } from "lucide-react";

const money = (n: number | null | undefined) => n == null ? "—" : `UGX ${Number(n).toLocaleString()}`;
export default function TreasuryStaffAccounts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setBusy(true); setError(null);
      try {
        const db = supabase as any;
        const employees: any[] = [];
        for (let offset = 0; ; offset += 500) {
          const result = await db.from("employees").select("id,name,email,phone,department,position,salary,disabled,bank_name,account_number").order("id").range(offset, offset + 499);
          if (result.error) throw result.error;
          employees.push(...(result.data ?? []));
          if ((result.data ?? []).length < 500) break;
        }
        const balances = await db.rpc("get_all_wallet_balances");
        if (balances.error) throw balances.error;
        const byUser = new Map<string, number>((balances.data ?? []).map((b: any) => [b.user_id, Number(b.wallet_balance)]));
        const resolved: any[] = [];
        for (let offset = 0; offset < employees.length; offset += 10) {
          const batch = await Promise.all(employees.slice(offset, offset + 10).map(async e => {
            if (!e.email) return { ...e, wallet: null };
            const identity = await db.rpc("get_unified_user_id", { input_email: e.email });
            if (identity.error) throw identity.error;
            return { ...e, wallet: identity.data ? byUser.get(identity.data) ?? 0 : null };
          }));
          resolved.push(...batch);
        }
        if (active) setRows(resolved.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e: any) { if (active) setError(e.message || "Could not load employee accounts"); }
      finally { if (active) setBusy(false); }
    }
    void load();
    return () => { active = false; };
  }, [refresh]);
  const filtered = rows.filter(e => `${e.name} ${e.email} ${e.department}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4">
    <div className="flex gap-3 items-center flex-wrap"><Input aria-label="Search employee accounts" placeholder="Search employee, email or department" value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" /><span className="text-sm text-muted-foreground">{filtered.length} employee profiles</span><Button variant="outline" size="sm" disabled={busy} onClick={() => setRefresh(v => v + 1)}><RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} />Refresh</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Wallet balance</TableHead><TableHead className="text-right">Monthly salary</TableHead><TableHead>Bank details</TableHead><TableHead /></TableRow></TableHeader><TableBody>
      {busy ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading employee accounts…</TableCell></TableRow> : filtered.map(e => <TableRow key={e.id}><TableCell><div className="font-medium">{e.name}</div><div className="text-xs text-muted-foreground">{e.email}</div></TableCell><TableCell className="text-sm">{e.department || "—"}</TableCell><TableCell><Badge variant={e.disabled ? "destructive" : "secondary"}>{e.disabled ? "Blocked" : "Active"}</Badge></TableCell><TableCell className={`text-right font-mono whitespace-nowrap text-xs ${e.wallet < 0 ? "text-destructive" : ""}`}>{money(e.wallet)}</TableCell><TableCell className="text-right whitespace-nowrap text-xs">{money(e.salary)}</TableCell><TableCell className="text-sm">{e.bank_name && e.account_number ? e.bank_name : "Missing details"}</TableCell><TableCell><Button variant="ghost" size="icon" aria-label={`View ${e.name} profile`} onClick={() => setSelected(e)}><UserRound className="h-4 w-4" /></Button></TableCell></TableRow>)}
      {!busy && !error && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No employee accounts found.</TableCell></TableRow>}
    </TableBody></Table></div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{selected?.name} — financial profile</DialogTitle></DialogHeader>{selected && <div className="space-y-5"><dl className="grid grid-cols-2 gap-4 text-sm">{[["Email", selected.email], ["Department", selected.department], ["Wallet balance", money(selected.wallet)], ["Monthly salary", money(selected.salary)], ["Bank", selected.bank_name], ["Account number", selected.account_number], ["Phone", selected.phone], ["Status", selected.disabled ? "Blocked" : "Active"]].map(([k, v]) => <div key={k}><dt className="text-muted-foreground text-xs">{k}</dt><dd className="font-medium break-all">{v || "—"}</dd></div>)}</dl><Button variant="outline" onClick={() => navigate("/admin/user-statement")}><FileText className="h-4 w-4 mr-2" />Employee statements</Button><Button variant="outline" onClick={() => navigate("/quick-loans")} className="ml-2">Loan applications</Button></div>}</DialogContent></Dialog>
  </div>;
}