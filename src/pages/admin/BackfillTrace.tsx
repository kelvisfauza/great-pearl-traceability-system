import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

const fmt = (n: number) => `UGX ${Math.abs(Number(n || 0)).toLocaleString()}`;
const fmtTs = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

type LedgerRow = {
  id: string;
  reference: string;
  amount: number;
  user_id: string;
  created_at: string;
  metadata: any;
};

type WdRow = {
  id: string;
  request_ref: string | null;
  amount: number;
  disbursement_phone: string | null;
  phone_number: string | null;
  payout_status: string | null;
  payout_ref: string | null;
  payout_error: string | null;
  payout_attempted_at: string | null;
  approved_at: string | null;
  created_at: string;
  requester_name: string | null;
  requester_email: string | null;
};

type Match = {
  ledger: LedgerRow;
  phone: string;
  amount: number;
  byRef?: WdRow;
  byPhoneAmount: WdRow[];
  confidence: "exact" | "high" | "medium" | "none";
};

function extractPhone(desc: string | undefined): string | null {
  if (!desc) return null;
  const m = desc.match(/(\d{10,15})/);
  return m ? m[1] : null;
}

const BackfillTrace = () => {
  const [filter, setFilter] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["backfill-trace"],
    queryFn: async () => {
      // Pull all backfill ledger entries
      const { data: ledger, error } = await supabase
        .from("ledger_entries")
        .select("id, reference, amount, user_id, created_at, metadata")
        .ilike("metadata->>description", "%backfill%")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const rows = (ledger || []) as LedgerRow[];

      // Pull candidate Yo / withdrawal records (sent only)
      const { data: wds } = await supabase
        .from("withdrawal_requests")
        .select(
          "id, request_ref, amount, disbursement_phone, phone_number, payout_status, payout_ref, payout_error, payout_attempted_at, approved_at, created_at, requester_name, requester_email"
        )
        .order("created_at", { ascending: false })
        .limit(2000);

      const wdRows = (wds || []) as WdRow[];

      const matches: Match[] = rows.map((l) => {
        const phone = extractPhone(l.metadata?.description) || "";
        const amount = Math.abs(Number(l.amount));

        const byRef = wdRows.find(
          (w) => w.request_ref === l.reference || w.payout_ref === l.reference
        );

        const byPhoneAmount = wdRows.filter(
          (w) =>
            (w.disbursement_phone === phone || w.phone_number === phone) &&
            Math.abs(Number(w.amount)) === amount
        );

        let confidence: Match["confidence"] = "none";
        if (byRef && byRef.payout_status === "sent" && byRef.payout_ref) confidence = "exact";
        else if (byRef) confidence = "high";
        else if (byPhoneAmount.some((w) => w.payout_status === "sent" && w.payout_ref))
          confidence = "high";
        else if (byPhoneAmount.length > 0) confidence = "medium";

        return { ledger: l, phone, amount, byRef, byPhoneAmount, confidence };
      });

      return matches;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (m) =>
        m.ledger.reference.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        String(m.amount).includes(q) ||
        (m.byRef?.requester_name || "").toLowerCase().includes(q) ||
        (m.byRef?.requester_email || "").toLowerCase().includes(q)
    );
  }, [data, filter]);

  const stats = useMemo(() => {
    const s = { total: 0, exact: 0, high: 0, medium: 0, none: 0 };
    (data || []).forEach((m) => {
      s.total++;
      s[m.confidence]++;
    });
    return s;
  }, [data]);

  const confidenceBadge = (c: Match["confidence"]) => {
    if (c === "exact")
      return (
        <Badge className="bg-emerald-100 text-emerald-800 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Exact (Yo paid)
        </Badge>
      );
    if (c === "high")
      return (
        <Badge className="bg-blue-100 text-blue-800 gap-1">
          <CheckCircle2 className="h-3 w-3" /> High match
        </Badge>
      );
    if (c === "medium")
      return (
        <Badge className="bg-amber-100 text-amber-800 gap-1">
          <AlertTriangle className="h-3 w-3" /> Phone+amount only
        </Badge>
      );
    return (
      <Badge className="bg-red-100 text-red-800 gap-1">
        <XCircle className="h-3 w-3" /> No match
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Backfill Ledger ↔ Yo Trace</h1>
          <p className="text-sm text-muted-foreground">
            Matches each backfilled ledger entry to the original Yo Payments withdrawal by reference,
            phone, and amount.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total backfill entries</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Exact (Yo paid)</div><div className="text-2xl font-bold text-emerald-600">{stats.exact}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">High match</div><div className="text-2xl font-bold text-blue-600">{stats.high}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Phone+amount only</div><div className="text-2xl font-bold text-amber-600">{stats.medium}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">No match (suspicious)</div><div className="text-2xl font-bold text-red-600">{stats.none}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Filter by ref, phone, amount, name…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-md"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ledger entry</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Posted at</TableHead>
                  <TableHead>Original WD (matched)</TableHead>
                  <TableHead>Yo status / Ref</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const best =
                    m.byRef ||
                    m.byPhoneAmount.find((w) => w.payout_status === "sent" && w.payout_ref) ||
                    m.byPhoneAmount[0];
                  return (
                    <TableRow key={m.ledger.id}>
                      <TableCell className="font-mono text-xs max-w-[220px] truncate" title={m.ledger.reference}>
                        {m.ledger.reference}
                      </TableCell>
                      <TableCell className="font-semibold">{fmt(m.amount)}</TableCell>
                      <TableCell className="font-mono text-xs">{m.phone || "—"}</TableCell>
                      <TableCell className="text-xs">{fmtTs(m.ledger.created_at)}</TableCell>
                      <TableCell className="text-xs">
                        {best ? (
                          <div>
                            <div className="font-medium">{best.requester_name || best.requester_email || "—"}</div>
                            <div className="text-muted-foreground font-mono">{best.request_ref || best.id.slice(0, 8)}</div>
                            <div className="text-muted-foreground">Approved: {fmtTs(best.approved_at)}</div>
                            {m.byPhoneAmount.length > 1 && !m.byRef && (
                              <div className="text-amber-600">{m.byPhoneAmount.length} candidates</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No candidate</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {best ? (
                          <div>
                            <Badge variant="outline" className="font-mono">
                              {best.payout_status || "—"}
                            </Badge>
                            <div className="font-mono mt-1 truncate max-w-[180px]" title={best.payout_ref || ""}>
                              {best.payout_ref || "no-ref"}
                            </div>
                            <div className="text-muted-foreground">{fmtTs(best.payout_attempted_at)}</div>
                            {best.payout_error && (
                              <div className="text-red-600 mt-1">{best.payout_error}</div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{confidenceBadge(m.confidence)}</TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No backfill entries found.
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

export default BackfillTrace;