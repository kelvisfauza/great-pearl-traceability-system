import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Search, FileText, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

type Entry = {
  id: string;
  created_at: string;
  entry_type: string;
  source_category: string | null;
  amount: number;
  reference: string;
  metadata: any;
};

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

// Must match TransactionStatement.tsx (employee view) so admin numbers
// reconcile exactly with what the employee sees.
const WALLET_TYPES = [
  'LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', 'REVERSAL',
  'MONTHLY_SALARY', 'ADVANCE_RECOVERY',
  'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'LOAN_RECOVERY',
  'HOST_MEETING_BONUS', 'MEETING_ATTENDANCE_BONUS',
];

const isDirectAllowancePayout = (entry: { entry_type: string; metadata: any }) => {
  const meta = entry.metadata
    ? (typeof entry.metadata === 'string' ? JSON.parse(entry.metadata) : entry.metadata)
    : null;
    // Mirror get_effective_wallet_balance RPC exactly: only airtime_allowance /
    // data_allowance DEPOSIT/PAYOUT are excluded from wallet math.
    return ['airtime_allowance', 'data_allowance'].includes(meta?.allowance_type)
    && ['DEPOSIT', 'PAYOUT'].includes(entry.entry_type);
};

const TYPE_COLORS: Record<string, string> = {
  LOYALTY_REWARD: "bg-purple-100 text-purple-800",
  BONUS: "bg-amber-100 text-amber-800",
  DEPOSIT: "bg-emerald-100 text-emerald-800",
  MONTHLY_SALARY: "bg-blue-100 text-blue-800",
  PAYOUT: "bg-slate-100 text-slate-800",
  WITHDRAWAL: "bg-red-100 text-red-800",
  ADJUSTMENT: "bg-yellow-100 text-yellow-800",
  LOAN_DISBURSEMENT: "bg-indigo-100 text-indigo-800",
  LOAN_REPAYMENT: "bg-orange-100 text-orange-800",
};

const UserStatement = () => {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // Employees list
  const { data: employees = [] } = useQuery({
    queryKey: ["admin-statement-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name, email, department, auth_user_id")
        .eq("status", "Active")
        .order("name");
      // Don't drop employees missing auth_user_id — we resolve via email
      // through get_unified_user_id so they still get a statement.
      return (data || []) as any[];
    },
  });

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e: any) =>
      !q ||
      e.name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const selectedEmployee = employees.find(
    (e: any) => (e.auth_user_id || e.email) === selectedUserId
  );

  // Resolve the unified user_id by email (same path used by the employee's
  // own TransactionStatement). This is why other users were getting blank
  // statements — their auth_user_id on employees didn't match ledger user_id.
  const { data: resolvedUserId } = useQuery({
    queryKey: ["admin-statement-resolved-uid", selectedEmployee?.email, selectedEmployee?.auth_user_id],
    enabled: !!selectedEmployee,
    queryFn: async () => {
      if (selectedEmployee?.email) {
        const { data } = await supabase.rpc('get_unified_user_id', {
          input_email: selectedEmployee.email,
        });
        if (data) return data as string;
      }
      return selectedEmployee?.auth_user_id || null;
    },
  });

  // Ledger entries for selected user
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin-statement-entries", resolvedUserId, typeFilter, from, to],
    enabled: !!resolvedUserId,
    queryFn: async () => {
      let q = supabase
        .from("ledger_entries")
        .select("id, created_at, entry_type, source_category, amount, reference, metadata")
        .eq("user_id", resolvedUserId!)
        .in("entry_type", WALLET_TYPES)
        .order("created_at", { ascending: true })
        .limit(5000);

      if (typeFilter !== "all") q = q.eq("entry_type", typeFilter);
      if (from) q = q.gte("created_at", from);
      if (to) q = q.lte("created_at", `${to}T23:59:59`);

      const { data } = await q;
      return ((data || []) as Entry[]).filter((entry) => !isDirectAllowancePayout(entry));
    },
  });

  const totals = useMemo(() => {
    let credits = 0, debits = 0;
    let runningBal = 0;
    const enriched = entries.map((e) => {
      const amt = Number(e.amount);
      if (amt >= 0) credits += amt; else debits += Math.abs(amt);
      runningBal += amt;
      return { ...e, running: runningBal };
    });
    return { credits, debits, net: credits - debits, enriched };
  }, [entries]);

  // Group by type
  const byType = useMemo(() => {
    const map = new Map<string, { credits: number; debits: number; count: number }>();
    entries.forEach((e) => {
      const m = map.get(e.entry_type) || { credits: 0, debits: 0, count: 0 };
      const a = Number(e.amount);
      if (a >= 0) m.credits += a; else m.debits += Math.abs(a);
      m.count += 1;
      map.set(e.entry_type, m);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [entries]);

  const printStatement = () => {
    if (!selectedEmployee) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = totals.enriched
      .slice()
      .reverse()
      .map(
        (e) => `
        <tr>
          <td>${new Date(e.created_at).toLocaleString()}</td>
          <td>${e.entry_type}</td>
          <td>${e.metadata?.description || e.reference}</td>
          <td style="text-align:right;color:${Number(e.amount) >= 0 ? "#16a34a" : "#dc2626"}">${fmt(Number(e.amount))}</td>
          <td style="text-align:right">${fmt(e.running)}</td>
        </tr>`
      )
      .join("");

    w.document.write(`<!doctype html><html><head><title>Statement - ${selectedEmployee.name}</title>
      <style>body{font:12px system-ui;padding:24px}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #eee;padding:6px 8px;text-align:left}th{background:#f5f5f5}.summary{display:flex;gap:24px;margin:12px 0;padding:12px;background:#fafafa;border:1px solid #eee}</style>
    </head><body onload="window.print()">
      <h1>Wallet Statement</h1>
      <div>${selectedEmployee.name} · ${selectedEmployee.email} · ${selectedEmployee.department}</div>
      <div>Generated ${new Date().toLocaleString()}</div>
      <div class="summary">
        <div><strong>Credits:</strong> ${fmt(totals.credits)}</div>
        <div><strong>Debits:</strong> ${fmt(totals.debits)}</div>
        <div><strong>Net:</strong> ${fmt(totals.net)}</div>
        <div><strong>Entries:</strong> ${entries.length}</div>
      </div>
      <table><thead><tr><th>Date</th><th>Type</th><th>Description / Ref</th><th style="text-align:right">Amount</th><th style="text-align:right">Running</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`);
    w.document.close();
  };

  const exportCsv = () => {
    if (!selectedEmployee) return;
    const header = ["Date", "Type", "Source", "Description", "Reference", "Amount", "Running"];
    const rows = totals.enriched.map((e) => [
      new Date(e.created_at).toISOString(),
      e.entry_type,
      e.source_category || "",
      (e.metadata?.description || "").replace(/"/g, '""'),
      e.reference,
      e.amount,
      e.running,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${selectedEmployee.email}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">User Transaction Statement</h1>
            <p className="text-sm text-muted-foreground">
              Review any employee's full wallet ledger with running balance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: employee picker */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-base">Employees</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto p-2 space-y-1">
              {filteredEmployees.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedUserId(e.auth_user_id || e.email)}
                  className={`w-full text-left p-2 rounded text-sm hover:bg-muted ${
                    selectedUserId === (e.auth_user_id || e.email) ? "bg-muted font-medium" : ""
                  }`}
                >
                  <div className="truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{e.email}</div>
                </button>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-4">No employees</p>
              )}
            </CardContent>
          </Card>

          {/* Right: statement */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedEmployee ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  Select an employee on the left to view their statement.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle>{selectedEmployee.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
                        <Badge variant="outline" className="mt-2">{selectedEmployee.department}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!entries.length}>
                          Export CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={printStatement} disabled={!entries.length}>
                          <Printer className="h-4 w-4 mr-1" /> Print
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center gap-2 text-emerald-700 text-xs"><ArrowDownCircle className="h-3 w-3" /> Credits</div>
                        <div className="text-lg font-bold text-emerald-700">{fmt(totals.credits)}</div>
                      </div>
                      <div className="p-3 rounded bg-red-50 border border-red-200">
                        <div className="flex items-center gap-2 text-red-700 text-xs"><ArrowUpCircle className="h-3 w-3" /> Debits</div>
                        <div className="text-lg font-bold text-red-700">{fmt(totals.debits)}</div>
                      </div>
                      <div className={`p-3 rounded border ${totals.net >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
                        <div className={`flex items-center gap-2 text-xs ${totals.net >= 0 ? "text-blue-700" : "text-orange-700"}`}><Wallet className="h-3 w-3" /> Net (raw)</div>
                        <div className={`text-lg font-bold ${totals.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>{fmt(totals.net)}</div>
                      </div>
                      <div className="p-3 rounded bg-muted">
                        <div className="text-xs text-muted-foreground">Entries</div>
                        <div className="text-lg font-bold">{entries.length.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-end gap-3 mt-4">
                      <div>
                        <label className="text-xs text-muted-foreground">From</label>
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">To</label>
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
                      </div>
                      <div className="min-w-[200px]">
                        <label className="text-xs text-muted-foreground">Entry type</label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="LOYALTY_REWARD">Loyalty</SelectItem>
                            <SelectItem value="BONUS">Bonus</SelectItem>
                            <SelectItem value="DEPOSIT">Deposit</SelectItem>
                            <SelectItem value="MONTHLY_SALARY">Salary</SelectItem>
                            <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                            <SelectItem value="PAYOUT">Payout</SelectItem>
                            <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(from || to || typeFilter !== "all") && (
                        <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setTypeFilter("all"); }}>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Tabs defaultValue="entries">
                  <TabsList>
                    <TabsTrigger value="entries">Entries</TabsTrigger>
                    <TabsTrigger value="breakdown">Breakdown by type</TabsTrigger>
                  </TabsList>

                  <Card className="mt-2">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[60vh]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description / Ref</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Running</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading && (
                              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                            )}
                            {!isLoading && totals.enriched.slice().reverse().map((e) => (
                              <TableRow key={e.id}>
                                <TableCell className="text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge className={TYPE_COLORS[e.entry_type] || "bg-muted text-foreground"} variant="secondary">
                                    {e.entry_type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs max-w-[420px]">
                                  <div className="truncate" title={e.metadata?.description || e.reference}>
                                    {e.metadata?.description || "—"}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate" title={e.reference}>{e.reference}</div>
                                </TableCell>
                                <TableCell className={`text-right font-mono ${Number(e.amount) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  {fmt(Number(e.amount))}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs">{fmt(e.running)}</TableCell>
                              </TableRow>
                            ))}
                            {!isLoading && entries.length === 0 && (
                              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No entries match the filters.</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </Tabs>

                {/* Breakdown card (always shown below) */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Breakdown by type</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                          <TableHead className="text-right">Debits</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byType.map(([type, v]) => (
                          <TableRow key={type}>
                            <TableCell>
                              <Badge className={TYPE_COLORS[type] || "bg-muted text-foreground"} variant="secondary">{type}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{v.count}</TableCell>
                            <TableCell className="text-right text-emerald-600">{fmt(v.credits)}</TableCell>
                            <TableCell className="text-right text-red-600">{fmt(v.debits)}</TableCell>
                            <TableCell className="text-right font-medium">{fmt(v.credits - v.debits)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatement;