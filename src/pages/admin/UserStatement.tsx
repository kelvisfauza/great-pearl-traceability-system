import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Search, FileText, ArrowDownCircle, ArrowUpCircle, Wallet, ArrowLeft } from "lucide-react";
import { AlertTriangle, Info } from "lucide-react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LOGO_URL, COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_PHONE, COMPANY_EMAIL, COMPANY_SUPPORT_EMAIL, COMPANY_WEBSITE, COMPANY_REG } from "@/utils/companyBrand";

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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printFrom, setPrintFrom] = useState<string>("");
  const [printTo, setPrintTo] = useState<string>("");
  const [printType, setPrintType] = useState<string>("all");
  const [preparingPrint, setPreparingPrint] = useState(false);

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

  const candidateUserIds = useMemo(() => {
    return Array.from(new Set([
      resolvedUserId,
      selectedEmployee?.auth_user_id,
      selectedEmployee?.id,
    ].filter(Boolean) as string[]));
  }, [resolvedUserId, selectedEmployee?.auth_user_id, selectedEmployee?.id]);

  // Ledger entries for selected user
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin-statement-entries", candidateUserIds.join(','), typeFilter, from, to],
    enabled: candidateUserIds.length > 0,
    queryFn: async () => {
      // Paginate to bypass PostgREST's 1000-row cap so high-activity wallets
      // (e.g. Fauza with 1500+ entries) reconcile exactly with the user's
      // own TransactionStatement.
      const PAGE = 1000;
      const all: Entry[] = [];
      for (let offset = 0; ; offset += PAGE) {
        let q = supabase
          .from("ledger_entries")
          .select("id, created_at, entry_type, source_category, amount, reference, metadata")
          .in("user_id", candidateUserIds)
          .in("entry_type", WALLET_TYPES)
          .order("created_at", { ascending: true })
          .range(offset, offset + PAGE - 1);

        if (typeFilter !== "all") q = q.eq("entry_type", typeFilter);
        if (from) q = q.gte("created_at", from);
        if (to) q = q.lte("created_at", `${to}T23:59:59`);

        const { data, error } = await q;
        if (error) throw error;
        const batch = (data || []) as Entry[];
        all.push(...batch);
        if (batch.length < PAGE) break;
        if (offset > 50000) break; // safety
      }
      return all
        .filter((entry) => !isDirectAllowancePayout(entry))
        .filter((entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index);
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

  // Negative-balance analysis: surface to admins so they can answer staff
  // queries like "why does my statement go negative?" without confusion.
  const negativeAnalysis = useMemo(() => {
    const negs = totals.enriched.filter((e) => e.running < 0);
    if (negs.length === 0) return null;
    const min = negs.reduce((m, e) => (e.running < m.running ? e : m), negs[0]);
    const first = negs[0];
    const last = negs[negs.length - 1];
    // Find the entry that first pushed the balance below zero
    const triggerIdx = totals.enriched.findIndex((e) => e.running < 0);
    const trigger = triggerIdx >= 0 ? totals.enriched[triggerIdx] : first;
    const beforeTrigger = triggerIdx > 0 ? totals.enriched[triggerIdx - 1].running : 0;
    return {
      count: negs.length,
      firstDate: first.created_at,
      lastDate: last.created_at,
      lowest: min.running,
      lowestDate: min.created_at,
      trigger,
      beforeTrigger,
      currentlyNegative: totals.enriched.length > 0 && totals.enriched[totals.enriched.length - 1].running < 0,
    };
  }, [totals.enriched]);

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

  const openPrintDialog = () => {
    setPrintFrom(from || "");
    setPrintTo(to || "");
    setPrintType(typeFilter);
    setPrintOpen(true);
  };

  const runPrint = async () => {
    if (!selectedEmployee || candidateUserIds.length === 0) return;
    setPreparingPrint(true);
    try {
      // 1. Opening balance = sum of all wallet entries strictly BEFORE printFrom
      let opening = 0;
      if (printFrom) {
        const PAGE = 1000;
        for (let offset = 0; ; offset += PAGE) {
          const { data, error } = await supabase
            .from("ledger_entries")
            .select("amount, entry_type, metadata")
            .in("user_id", candidateUserIds)
            .in("entry_type", WALLET_TYPES)
            .lt("created_at", printFrom)
            .order("created_at", { ascending: true })
            .range(offset, offset + PAGE - 1);
          if (error) throw error;
          const batch = (data || []) as any[];
          batch
            .filter((e) => !isDirectAllowancePayout(e))
            .forEach((e) => { opening += Number(e.amount) || 0; });
          if (batch.length < PAGE) break;
          if (offset > 50000) break;
        }
      }

      // 2. Period entries
      const PAGE = 1000;
      const period: Entry[] = [];
      for (let offset = 0; ; offset += PAGE) {
        let q = supabase
          .from("ledger_entries")
          .select("id, created_at, entry_type, source_category, amount, reference, metadata")
          .in("user_id", candidateUserIds)
          .in("entry_type", WALLET_TYPES)
          .order("created_at", { ascending: true })
          .range(offset, offset + PAGE - 1);
        if (printType !== "all") q = q.eq("entry_type", printType);
        if (printFrom) q = q.gte("created_at", printFrom);
        if (printTo) q = q.lte("created_at", `${printTo}T23:59:59`);
        const { data, error } = await q;
        if (error) throw error;
        const batch = (data || []) as Entry[];
        period.push(...batch);
        if (batch.length < PAGE) break;
        if (offset > 50000) break;
      }
      const clean = period
        .filter((e) => !isDirectAllowancePayout(e))
        .filter((e, i, a) => a.findIndex((c) => c.id === e.id) === i);

      // 3. Build rows with running balance starting from opening
      let running = opening;
      let periodCredits = 0;
      let periodDebits = 0;
      const rows = clean.map((e) => {
        const amt = Number(e.amount) || 0;
        const debit = amt < 0 ? Math.abs(amt) : 0;
        const credit = amt > 0 ? amt : 0;
        periodDebits += debit;
        periodCredits += credit;
        running += amt;
        const meta = e.metadata && typeof e.metadata === "string" ? JSON.parse(e.metadata) : e.metadata;
        const fee = Number(meta?.fee) || 0;
        const desc = (meta?.description || e.entry_type).toString().replace(/</g, "&lt;");
        const ref = (e.reference || "").toString().replace(/</g, "&lt;");
        const d = new Date(e.created_at);
        const dateStr = d.toLocaleDateString("en-GB");
        return { dateStr, desc, ref, fee, debit, credit, running };
      });
      const closing = running;

      const w = window.open("", "_blank");
      if (!w) { toast.error("Pop-up blocked. Please allow pop-ups to print."); return; }

      const periodLabel = `${printFrom || "All time"} to ${printTo || new Date().toISOString().slice(0,10)}`;
      const headerRows = rows.map((r) => `
        <tr>
          <td>${r.dateStr}</td>
          <td>${r.dateStr}</td>
          <td class="desc">${r.desc}<div class="ref">${r.ref}</div></td>
          <td class="num">${r.fee ? Number(r.fee).toLocaleString() : ""}</td>
          <td class="num debit">${r.debit ? Number(r.debit).toLocaleString() : ""}</td>
          <td class="num credit">${r.credit ? Number(r.credit).toLocaleString() : ""}</td>
          <td class="num bal">${Number(r.running).toLocaleString()}</td>
        </tr>`).join("");

      w.document.write(`<!doctype html><html><head><title>Statement - ${selectedEmployee.name}</title>
<style>
  *{box-sizing:border-box}
  body{font:11px Arial,sans-serif;color:#000;padding:18px;margin:0}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:8px}
  .brand{display:flex;gap:10px;align-items:center}
  .brand img{height:42px}
  .brand .name{font-size:16px;font-weight:bold;color:#000}
  .brand .sub{font-size:9px;color:#000}
  .meta{font-size:10px;text-align:right;line-height:1.5}
  .info{display:flex;justify-content:space-between;margin-top:12px;font-size:11px}
  .info .left div, .info .right div{margin-bottom:2px}
  .title{text-align:center;font-weight:bold;font-size:13px;border:1px solid #000;padding:6px;margin:14px 0 8px}
  .acct{display:flex;justify-content:space-between;border:1px solid #000;padding:6px 10px;font-size:11px;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th,td{border:1px solid #000;padding:4px 6px;vertical-align:top}
  th{background:#fff;text-align:left}
  .num{text-align:right;font-family:'Courier New',monospace;white-space:nowrap}
  .debit{color:#000;font-weight:bold}
  .credit{color:#000;font-weight:bold}
  .bal{font-weight:bold}
  .desc{max-width:280px}
  .ref{font-size:8px;color:#000;margin-top:2px}
  .opening td, .closing td{background:#fff;font-weight:bold}
  .summary{margin-top:14px;border:1px solid #000;padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px}
  .summary .lbl{color:#000;font-size:9px}
  .summary .val{font-weight:bold;font-size:13px}
  .foot{margin-top:18px;font-size:9px;color:#000;text-align:center;border-top:1px solid #000;padding-top:6px}
  @media print { body{padding:10px} }
</style></head><body onload="window.print()">
  <div class="top">
    <div class="brand">
      <img src="${LOGO_URL}" onerror="this.style.display='none'"/>
      <div>
        <div class="name">${COMPANY_NAME}</div>
        <div class="sub">${COMPANY_TAGLINE}</div>
        <div class="sub">${COMPANY_ADDRESS}</div>
      </div>
    </div>
    <div class="meta">
      <div>Tel: ${COMPANY_PHONE}</div>
      <div>Email: ${COMPANY_EMAIL}</div>
      <div>Customer Support: ${COMPANY_SUPPORT_EMAIL}</div>
      <div>Web: ${COMPANY_WEBSITE}</div>
      <div>Generated: ${new Date().toLocaleString("en-GB")}</div>
    </div>
  </div>

  <div class="info">
    <div class="left">
      <div><strong>Name of account:</strong></div>
      <div>${selectedEmployee.name}</div>
      <div>${selectedEmployee.department || ""}</div>
      <div>${selectedEmployee.email}</div>
    </div>
    <div class="right" style="text-align:right">
      <div>Statement Period: <strong>${periodLabel}</strong></div>
      <div>Filter: <strong>${printType === 'all' ? 'All transactions' : printType}</strong></div>
      <div>${COMPANY_REG}</div>
    </div>
  </div>

  <div class="title">WALLET STATEMENT</div>
  <div class="acct">
    <div>Account Type: <strong>EMPLOYEE WALLET</strong></div>
    <div>Currency: <strong>UGX</strong></div>
    <div>Account Holder: <strong>${selectedEmployee.name}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Transaction Date</th>
        <th>Value Date</th>
        <th>Transaction Description</th>
        <th class="num">Fee</th>
        <th class="num">Debits</th>
        <th class="num">Credits</th>
        <th class="num">Balance</th>
      </tr>
    </thead>
    <tbody>
      <tr class="opening">
        <td colspan="6">STATEMENT OPENING BALANCE</td>
        <td class="num bal">${Number(opening).toLocaleString()}</td>
      </tr>
      ${headerRows || `<tr><td colspan="7" style="text-align:center;padding:18px;color:#777">No transactions in this period.</td></tr>`}
      <tr class="closing">
        <td colspan="3">CLOSING BALANCE</td>
        <td class="num"></td>
        <td class="num debit">${Number(periodDebits).toLocaleString()}</td>
        <td class="num credit">${Number(periodCredits).toLocaleString()}</td>
        <td class="num bal">${Number(closing).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <div><div class="lbl">Opening Balance</div><div class="val">UGX ${Number(opening).toLocaleString()}</div></div>
    <div><div class="lbl">Total Credits</div><div class="val" style="color:#000;font-weight:bold">UGX ${Number(periodCredits).toLocaleString()}</div></div>
    <div><div class="lbl">Total Debits</div><div class="val" style="color:#000;font-weight:bold">UGX ${Number(periodDebits).toLocaleString()}</div></div>
    <div><div class="lbl">Closing Balance</div><div class="val">UGX ${Number(closing).toLocaleString()}</div></div>
  </div>

  <div class="foot">${COMPANY_NAME} · ${COMPANY_TAGLINE} · This is a system-generated statement and does not require a signature.</div>
</body></html>`);
      w.document.close();
      setPrintOpen(false);
    } catch (e: any) {
      toast.error(`Failed to prepare statement: ${e.message || e}`);
    } finally {
      setPreparingPrint(false);
    }
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
        <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
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
                        <Button
                          variant="default"
                          size="sm"
                          disabled={!selectedEmployee?.email || sendingEmail || !entries.length}
                          onClick={async () => {
                            if (!selectedEmployee?.email) return;
                            setSendingEmail(true);
                            try {
                              const negLine = negativeAnalysis
                                ? `Your wallet running balance dipped below zero ${negativeAnalysis.count} time(s) between ${new Date(negativeAnalysis.firstDate).toLocaleDateString()} and ${new Date(negativeAnalysis.lastDate).toLocaleDateString()}. The lowest point recorded was ${fmt(negativeAnalysis.lowest)} on ${new Date(negativeAnalysis.lowestDate).toLocaleDateString()}. The first entry that pushed the balance into the negative was a ${negativeAnalysis.trigger.entry_type} of ${fmt(Number(negativeAnalysis.trigger.amount))} on ${new Date(negativeAnalysis.trigger.created_at).toLocaleString()}, when the prior balance was ${fmt(negativeAnalysis.beforeTrigger)}.`
                                : `Our records do not show any negative running balance on your wallet at this time.`;
                              const message = [
                                `We have reviewed your wallet statement following your inquiry about the negative balances appearing in your transaction history.`,
                                ``,
                                `SUMMARY OF YOUR ACCOUNT`,
                                `- Total Credits: ${fmt(totals.credits)}`,
                                `- Total Debits: ${fmt(totals.debits)}`,
                                `- Current Net Balance: ${fmt(totals.net)}`,
                                `- Total Entries: ${entries.length.toLocaleString()}`,
                                ``,
                                `ABOUT THE NEGATIVE ENTRIES`,
                                negLine,
                                ``,
                                `WHY THIS HAPPENS`,
                                `The "Running Balance" column on your statement is a strict historical ledger. It shows exactly what your wallet held at each point in time, in the order that transactions were posted. A running balance can dip below zero in the following legitimate scenarios:`,
                                `• Approved wallet-to-wallet transfers, withdrawals, loan recoveries, salary advance recoveries or adjustments posted before matching credits (salary, bonus, reversals, refunds) had landed.`,
                                `• Overdraft-type postings authorized by the system to settle outstanding obligations (e.g. loan recovery on the 27th when salary is still being processed).`,
                                `• Reversal entries that arrived later and brought the balance back to positive.`,
                                ``,
                                `WHY WE CANNOT (AND WILL NOT) CHANGE THESE ENTRIES`,
                                `• The ledger is the legal financial record of every credit and debit on your wallet. Editing or deleting historical entries would break our audit trail and violate our internal financial controls.`,
                                `• Every transaction shown was generated by an actual system event — a real transfer, withdrawal, salary posting, loan recovery, or admin-approved adjustment — and has a corresponding reference in the system.`,
                                `• Your CURRENT wallet balance (shown as "Net" above) already reflects every later credit, reversal and adjustment. It is the only figure that determines what you can spend today.`,
                                ``,
                                `WHAT THIS MEANS FOR YOU`,
                                `• The negative entries you saw are historical snapshots only — they do not represent money you currently owe and they do not reduce your current balance further.`,
                                `• Your spendable balance today is ${fmt(totals.net)}.`,
                                `• If you ever want a line-by-line walkthrough of any specific entry, please reply to this email and Operations will help reconcile it with you.`,
                                ``,
                                `Thank you for your patience and for taking the time to verify your statement carefully.`,
                              ].join('\n');

                              const { error } = await supabase.functions.invoke('send-transactional-email', {
                                body: {
                                  templateName: 'general-notification',
                                  recipientEmail: selectedEmployee.email,
                                  idempotencyKey: `wallet-negative-explanation-${selectedEmployee.email}-${new Date().toISOString().slice(0,10)}`,
                                  templateData: {
                                    subject: 'Explanation of Negative Entries on Your Wallet Statement',
                                    title: 'Your Wallet Statement Explained',
                                    recipientName: selectedEmployee.name,
                                    message,
                                  },
                                },
                              });
                              if (error) throw error;
                              toast.success(`Explanation sent to ${selectedEmployee.email} (CC: operations)`);
                            } catch (e: any) {
                              toast.error(`Failed to send email: ${e.message || e}`);
                            } finally {
                              setSendingEmail(false);
                            }
                          }}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          {sendingEmail ? 'Sending…' : 'Email Explanation'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!entries.length}>
                          Export CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={openPrintDialog} disabled={candidateUserIds.length === 0}>
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
                  {negativeAnalysis && (
                    <Card className={`mb-2 border ${negativeAnalysis.currentlyNegative ? "border-orange-300 bg-orange-50" : "border-amber-200 bg-amber-50"}`}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          {negativeAnalysis.currentlyNegative ? (
                            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                          ) : (
                            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                          )}
                          <div className="flex-1 text-sm">
                            <div className="font-semibold text-foreground mb-1">
                              {negativeAnalysis.currentlyNegative
                                ? "Wallet is currently overdrawn"
                                : "Historical negative balance (now recovered)"}
                            </div>
                            <p className="text-muted-foreground mb-2">
                              The running balance went below zero <strong>{negativeAnalysis.count.toLocaleString()}</strong> time(s)
                              between <strong>{new Date(negativeAnalysis.firstDate).toLocaleDateString()}</strong> and{" "}
                              <strong>{new Date(negativeAnalysis.lastDate).toLocaleDateString()}</strong>.
                              The lowest point was <strong className="text-orange-700">{fmt(negativeAnalysis.lowest)}</strong> on{" "}
                              {new Date(negativeAnalysis.lowestDate).toLocaleDateString()}.
                            </p>
                            <div className="rounded bg-white/70 border border-amber-200 p-2 mb-2">
                              <div className="text-xs text-muted-foreground">First trigger entry</div>
                              <div className="font-medium">
                                {new Date(negativeAnalysis.trigger.created_at).toLocaleString()} ·{" "}
                                <Badge variant="outline" className="ml-1">{negativeAnalysis.trigger.entry_type}</Badge>
                              </div>
                              <div className="text-xs mt-1">
                                Balance before: <strong>{fmt(negativeAnalysis.beforeTrigger)}</strong> →
                                {" "}entry amount: <strong className={Number(negativeAnalysis.trigger.amount) < 0 ? "text-red-700" : "text-emerald-700"}>{fmt(Number(negativeAnalysis.trigger.amount))}</strong> →
                                {" "}resulting balance: <strong className="text-orange-700">{fmt(negativeAnalysis.trigger.running)}</strong>
                              </div>
                              {negativeAnalysis.trigger.metadata?.description && (
                                <div className="text-xs text-muted-foreground mt-1 italic">
                                  "{negativeAnalysis.trigger.metadata.description}"
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <strong>Why this can happen:</strong> approved transfers, withdrawals, loan recoveries,
                              salary advance recoveries or adjustments can be posted before matching credits
                              (salary, bonus, reversals) land. The running column shows the true ledger state at
                              each point in time — it is not a bug. The <strong>Net</strong> figure above reflects the
                              current effective wallet balance after all later credits and reversals.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <TabsList>
                    <TabsTrigger value="entries">Entries</TabsTrigger>
                    <TabsTrigger value="breakdown">Breakdown by type</TabsTrigger>
                  </TabsList>

                  <Card className="mt-2">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[60vh]">
                        <Table className="min-w-[900px]">
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                              <TableHead className="w-[170px]">Date</TableHead>
                              <TableHead className="w-[140px]">Type</TableHead>
                              <TableHead>Description / Ref</TableHead>
                              <TableHead className="text-right w-[130px] whitespace-nowrap">Amount</TableHead>
                              <TableHead className="text-right w-[150px] whitespace-nowrap">Running Balance</TableHead>
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
                                <TableCell className="text-xs max-w-[420px] min-w-[220px]">
                                  <div className="truncate" title={e.metadata?.description || e.reference}>
                                    {e.metadata?.description || "—"}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate" title={e.reference}>{e.reference}</div>
                                </TableCell>
                                <TableCell className={`text-right font-mono text-xs whitespace-nowrap tabular-nums ${Number(e.amount) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  {Number(e.amount) >= 0 ? "+" : ""}{fmt(Number(e.amount))}
                                </TableCell>
                                <TableCell className={`text-right font-mono text-xs whitespace-nowrap tabular-nums font-semibold ${e.running < 0 ? "text-red-600" : "text-foreground"}`}>
                                  {fmt(e.running)}
                                </TableCell>
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

            <Dialog open={printOpen} onOpenChange={setPrintOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Printer className="h-4 w-4" /> Print Statement — Filter</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Choose the period and transaction type to include on the printed statement. The opening balance will be computed from all activity before the start date.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">From</Label>
                      <Input type="date" value={printFrom} onChange={(e) => setPrintFrom(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <Input type="date" value={printTo} onChange={(e) => setPrintTo(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Transaction type</Label>
                    <Select value={printType} onValueChange={setPrintType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All transactions</SelectItem>
                        <SelectItem value="LOYALTY_REWARD">Loyalty</SelectItem>
                        <SelectItem value="BONUS">Bonus</SelectItem>
                        <SelectItem value="DEPOSIT">Deposits (credits)</SelectItem>
                        <SelectItem value="MONTHLY_SALARY">Salary</SelectItem>
                        <SelectItem value="WITHDRAWAL">Withdrawals (debits)</SelectItem>
                        <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
                        <SelectItem value="LOAN_DISBURSEMENT">Loan disbursements</SelectItem>
                        <SelectItem value="LOAN_REPAYMENT">Loan repayments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const today = new Date();
                      const first = new Date(today.getFullYear(), today.getMonth(), 1);
                      setPrintFrom(first.toISOString().slice(0,10));
                      setPrintTo(today.toISOString().slice(0,10));
                    }}>This month</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const today = new Date();
                      const first = new Date(today.getFullYear(), 0, 1);
                      setPrintFrom(first.toISOString().slice(0,10));
                      setPrintTo(today.toISOString().slice(0,10));
                    }}>This year</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setPrintFrom(""); setPrintTo(""); setPrintType("all"); }}>All time</Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setPrintOpen(false)}>Cancel</Button>
                  <Button onClick={runPrint} disabled={preparingPrint}>
                    <Printer className="h-4 w-4 mr-1" />{preparingPrint ? "Preparing…" : "Print Statement"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatement;