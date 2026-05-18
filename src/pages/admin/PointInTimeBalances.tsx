import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, Clock } from "lucide-react";

// John's 51,000 backfill withdrawal — Saturday 16 May 2026 12:48:08 UTC (~14:48 EAT)
const DEFAULT_CUTOFF = "2026-05-16T12:48:09";

const fmt = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

type Row = {
  user_id: string;
  name: string;
  email: string;
  balance: number;
  entries: number;
  lastEntryAt: string | null;
};

const PointInTimeBalances = () => {
  const [cutoff, setCutoff] = useState(DEFAULT_CUTOFF);
  const [filter, setFilter] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["pit-balances", cutoff],
    queryFn: async () => {
      const iso = new Date(cutoff).toISOString();

      // Page through all ledger entries up to cutoff
      const pageSize = 1000;
      let from = 0;
      const all: { user_id: string; amount: number; created_at: string }[] = [];
      while (true) {
        const { data: rows, error } = await supabase
          .from("ledger_entries")
          .select("user_id, amount, created_at")
          .lte("created_at", iso)
          .order("created_at", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!rows || rows.length === 0) break;
        all.push(...(rows as any));
        if (rows.length < pageSize) break;
        from += pageSize;
      }

      const map = new Map<string, { balance: number; entries: number; last: string | null }>();
      for (const r of all) {
        const cur = map.get(r.user_id) || { balance: 0, entries: 0, last: null };
        cur.balance += Number(r.amount) || 0;
        cur.entries++;
        if (!cur.last || r.created_at > cur.last) cur.last = r.created_at;
        map.set(r.user_id, cur);
      }

      const ids = Array.from(map.keys());
      const emps: Record<string, { name: string; email: string }> = {};
      for (let i = 0; i < ids.length; i += 200) {
        const slice = ids.slice(i, i + 200);
        const { data: e } = await supabase
          .from("employees")
          .select("auth_user_id, name, email")
          .in("auth_user_id", slice);
        (e as any[] || []).forEach((x) => {
          if (x.auth_user_id) emps[x.auth_user_id] = { name: x.name, email: x.email };
        });
      }

      const rows: Row[] = Array.from(map.entries()).map(([uid, v]) => ({
        user_id: uid,
        name: emps[uid]?.name || "Unknown",
        email: emps[uid]?.email || uid.slice(0, 8),
        balance: v.balance,
        entries: v.entries,
        lastEntryAt: v.last,
      }));
      rows.sort((a, b) => b.balance - a.balance);
      return rows;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }, [data, filter]);

  const stats = useMemo(() => {
    const s = { users: 0, total: 0, negative: 0, positive: 0, zero: 0 };
    (data || []).forEach((r) => {
      s.users++;
      s.total += r.balance;
      if (r.balance < 0) s.negative++;
      else if (r.balance > 0) s.positive++;
      else s.zero++;
    });
    return s;
  }, [data]);

  const exportCsv = () => {
    const header = ["Name", "Email", "UserID", "Balance", "Entries", "LastEntryAt"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          JSON.stringify(r.name),
          JSON.stringify(r.email),
          r.user_id,
          r.balance,
          r.entries,
          r.lastEntryAt || "",
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pit-balances-${cutoff.replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Point-in-Time Wallet Balances</h1>
          <p className="text-sm text-muted-foreground">
            Replays every ledger entry up to a cutoff and shows each user's balance at that moment.
            Default cutoff = right after John's UGX 51,000 withdrawal on Sat 16 May 2026.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Cutoff (local)
            </label>
            <Input
              type="datetime-local"
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              className="w-[230px]"
            />
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Recompute
          </Button>
          <Button onClick={exportCsv} disabled={!filtered.length} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Users</div><div className="text-2xl font-bold">{stats.users}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sum of balances</div><div className="text-2xl font-bold">{fmt(stats.total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Positive</div><div className="text-2xl font-bold text-emerald-600">{stats.positive}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Zero</div><div className="text-2xl font-bold text-muted-foreground">{stats.zero}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Negative</div><div className="text-2xl font-bold text-red-600">{stats.negative}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Input
              placeholder="Filter by name or email…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-md"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Replaying ledger…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Balance @ cutoff</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead>Last entry</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${r.balance < 0 ? "text-red-600" : r.balance > 0 ? "text-emerald-600" : ""}`}>
                      {fmt(r.balance)}
                    </TableCell>
                    <TableCell className="text-right">{r.entries}</TableCell>
                    <TableCell className="text-xs">
                      {r.lastEntryAt ? new Date(r.lastEntryAt).toLocaleString("en-GB") : "—"}
                    </TableCell>
                    <TableCell>
                      {r.balance < 0 && <Badge variant="destructive">Overdrawn</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No balances to show.
                    </TableCell>
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

export default PointInTimeBalances;