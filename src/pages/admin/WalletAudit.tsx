import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, RefreshCw, Search, ShieldAlert, Wallet, ExternalLink, Download } from "lucide-react";

const fmt = (n: number) => `UGX ${Math.round(Number(n || 0)).toLocaleString()}`;

type AuditRow = {
  userKey: string;             // ledger.user_id value
  employeeId?: string;
  authUserId?: string;
  name: string;
  email: string;
  balance: number;             // ledger sum
  entries: number;
  backfillCount: number;
  pendingYoCount: number;      // PAYOUT entries with yo_status=pending_approval & no yo_reference
  duplicateClusters: number;   // entries within 5s of each other on same ref pattern
  bonusWriteoffs: number;
  risk: "ok" | "watch" | "high";
  reasons: string[];
};

const WalletAudit = () => {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<"risk" | "balance" | "entries">("risk");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["wallet-audit"],
    queryFn: async (): Promise<AuditRow[]> => {
      // 1) Pull employees once
      const { data: emps } = await supabase
        .from("employees")
        .select("id, auth_user_id, name, email")
        .limit(2000);
      const employees = (emps || []) as any[];
      const byId = new Map(employees.map((e) => [e.id, e]));
      const byAuth = new Map(employees.filter((e) => e.auth_user_id).map((e) => [e.auth_user_id, e]));
      const byEmail = new Map(employees.filter((e) => e.email).map((e) => [e.email.toLowerCase(), e]));

      // 2) Pull ledger entries (recent 10k)
      const { data: ledger, error } = await supabase
        .from("ledger_entries")
        .select("user_id, entry_type, amount, reference, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      const rows = (ledger || []) as any[];

      // 3) Aggregate per user_id
      const map = new Map<string, AuditRow>();
      for (const r of rows) {
        const key = String(r.user_id);
        if (!map.has(key)) {
          const emp =
            byId.get(key) ||
            byAuth.get(key) ||
            byEmail.get(String(key).toLowerCase());
          map.set(key, {
            userKey: key,
            employeeId: emp?.id,
            authUserId: emp?.auth_user_id,
            name: emp?.name || "Unknown",
            email: emp?.email || key,
            balance: 0,
            entries: 0,
            backfillCount: 0,
            pendingYoCount: 0,
            duplicateClusters: 0,
            bonusWriteoffs: 0,
            risk: "ok",
            reasons: [],
          });
        }
        const u = map.get(key)!;
        u.entries++;
        u.balance += Number(r.amount || 0);

        const desc = (r.metadata?.description || "").toLowerCase();
        const yoStatus = r.metadata?.yo_status;
        const yoRef = r.metadata?.yo_reference;

        if (desc.includes("backfill")) u.backfillCount++;
        if (r.entry_type === "PAYOUT" && yoStatus === "pending_approval" && !yoRef) u.pendingYoCount++;
        if (r.entry_type === "BONUS" && (desc.includes("write-off") || desc.includes("reset"))) u.bonusWriteoffs++;
      }

      // 4) Duplicate detection: same user, same amount, within 60s
      const byUserSorted = new Map<string, any[]>();
      for (const r of rows) {
        const k = String(r.user_id);
        if (!byUserSorted.has(k)) byUserSorted.set(k, []);
        byUserSorted.get(k)!.push(r);
      }
      for (const [k, arr] of byUserSorted) {
        arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        let dup = 0;
        for (let i = 1; i < arr.length; i++) {
          const dt = new Date(arr[i].created_at).getTime() - new Date(arr[i - 1].created_at).getTime();
          if (dt < 60_000 && Number(arr[i].amount) === Number(arr[i - 1].amount) && arr[i].entry_type === arr[i - 1].entry_type) dup++;
        }
        const u = map.get(k);
        if (u) u.duplicateClusters = dup;
      }

      // 5) Risk scoring
      const result: AuditRow[] = [];
      for (const u of map.values()) {
        const reasons: string[] = [];
        if (u.balance < 0) reasons.push(`Negative balance ${fmt(u.balance)}`);
        if (u.backfillCount > 0) reasons.push(`${u.backfillCount} backfill entries`);
        if (u.pendingYoCount > 0) reasons.push(`${u.pendingYoCount} Yo pending (no ref)`);
        if (u.duplicateClusters > 0) reasons.push(`${u.duplicateClusters} duplicate cluster(s)`);
        if (u.bonusWriteoffs > 0) reasons.push(`${u.bonusWriteoffs} write-off bonus(es)`);
        u.reasons = reasons;
        const score =
          (u.balance < 0 ? 3 : 0) +
          u.backfillCount * 2 +
          u.pendingYoCount * 1 +
          u.duplicateClusters * 2 +
          u.bonusWriteoffs * 1;
        u.risk = score >= 5 ? "high" : score >= 2 ? "watch" : "ok";
        result.push(u);
      }
      return result;
    },
  });

  const filtered = useMemo(() => {
    let arr = data || [];
    const q = filter.trim().toLowerCase();
    if (q) arr = arr.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    arr = [...arr].sort((a, b) => {
      if (sortBy === "balance") return a.balance - b.balance;
      if (sortBy === "entries") return b.entries - a.entries;
      const order = { high: 0, watch: 1, ok: 2 };
      return order[a.risk] - order[b.risk];
    });
    return arr;
  }, [data, filter, sortBy]);

  const stats = useMemo(() => {
    const s = { total: 0, high: 0, watch: 0, ok: 0, negBalance: 0, totalBalance: 0 };
    (data || []).forEach((u) => {
      s.total++;
      s[u.risk]++;
      if (u.balance < 0) s.negBalance++;
      s.totalBalance += u.balance;
    });
    return s;
  }, [data]);

  const riskBadge = (r: AuditRow["risk"]) => {
    if (r === "high") return <Badge className="bg-red-100 text-red-800 gap-1"><ShieldAlert className="h-3 w-3" /> High</Badge>;
    if (r === "watch") return <Badge className="bg-amber-100 text-amber-800 gap-1"><AlertTriangle className="h-3 w-3" /> Watch</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-800 gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" /> Wallet & Ledger Audit</h1>
          <p className="text-sm text-muted-foreground">
            Every user's wallet rolled up from the ledger, with anomalies flagged. Sort by risk to triage.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Recompute
        </Button>
        <Button
          variant="default"
          className="gap-2 ml-2"
          disabled={!data || data.length === 0}
          onClick={() => {
            const rows = filtered;
            const header = ["Name","Email","Balance","Entries","Backfill","YoPending","DupClusters","BonusWriteoffs","Risk","Reasons"];
            const csv = [header.join(",")].concat(
              rows.map((u) => [
                JSON.stringify(u.name),
                JSON.stringify(u.email),
                u.balance,
                u.entries,
                u.backfillCount,
                u.pendingYoCount,
                u.duplicateClusters,
                u.bonusWriteoffs,
                u.risk,
                JSON.stringify(u.reasons.join(" | ")),
              ].join(","))
            ).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `wallet-audit-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Users audited</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">High risk</div><div className="text-2xl font-bold text-red-600">{stats.high}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Watch</div><div className="text-2xl font-bold text-amber-600">{stats.watch}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Clean</div><div className="text-2xl font-bold text-emerald-600">{stats.ok}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Negative balances</div><div className="text-2xl font-bold text-red-600">{stats.negBalance}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sum of all balances</div><div className={`text-xl font-bold ${stats.totalBalance < 0 ? "text-red-600" : ""}`}>{fmt(stats.totalBalance)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Filter by name or email…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-md"
            />
            <div className="flex items-center gap-2 ml-auto text-xs">
              <span className="text-muted-foreground">Sort:</span>
              {(["risk", "balance", "entries"] as const).map((s) => (
                <Button key={s} size="sm" variant={sortBy === s ? "default" : "outline"} onClick={() => setSortBy(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Backfill</TableHead>
                  <TableHead className="text-right">Yo pending</TableHead>
                  <TableHead className="text-right">Dup clusters</TableHead>
                  <TableHead>Reasons</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.userKey}>
                    <TableCell>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${u.balance < 0 ? "text-red-600" : ""}`}>{fmt(u.balance)}</TableCell>
                    <TableCell className="text-right">{u.entries}</TableCell>
                    <TableCell className="text-right">{u.backfillCount || "—"}</TableCell>
                    <TableCell className="text-right">{u.pendingYoCount || "—"}</TableCell>
                    <TableCell className="text-right">{u.duplicateClusters || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[280px]">
                      {u.reasons.length === 0 ? <span className="text-muted-foreground">—</span> : u.reasons.join(" · ")}
                    </TableCell>
                    <TableCell>{riskBadge(u.risk)}</TableCell>
                    <TableCell>
                      <Link to={`/admin/user-statement?user=${encodeURIComponent(u.employeeId || u.userKey)}`}>
                        <Button size="sm" variant="ghost" className="gap-1">
                          Open <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletAudit;