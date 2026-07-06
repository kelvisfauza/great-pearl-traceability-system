import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, Plus, Banknote, AlertTriangle, History,
  ArrowLeft, Printer, Filter,
} from "lucide-react";
import { TrendingUp } from "lucide-react";
import {
  COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_PHONE,
  COMPANY_EMAIL, COMPANY_SUPPORT_EMAIL, COMPANY_WEBSITE, COMPANY_REG,
} from "@/utils/companyBrand";

type Direction = "credit" | "debit";
type Channel = "yo_payments" | "cash" | "bank" | "internal" | "other";
type Category =
  | "withdrawal" | "deposit" | "transfer" | "provider_payout" | "meal_plan"
  | "topup" | "reconciliation" | "adjustment" | "refund" | "fee";

interface PoolEntry {
  id: string;
  direction: Direction;
  amount: number;
  channel: Channel;
  category: Category;
  reference: string | null;
  related_user_email: string | null;
  related_user_name: string | null;
  description: string | null;
  performed_by: string | null;
  balance_after: number | null;
  created_at: string;
  metadata: any;
}

interface PoolBalance {
  current_balance: number;
  cash_balance: number | null;
  yo_balance: number | null;
  bank_balance: number | null;
  last_yo_synced_balance: number | null;
  last_yo_synced_at: string | null;
  updated_at: string;
}

interface InvestmentRow {
  id: string;
  user_email: string;
  employee_name: string | null;
  amount: number;
  interest_rate: number;
  maturity_months: number;
  start_date: string;
  maturity_date: string;
  status: string;
  earned_interest: number;
  total_payout: number;
  withdrawn_at: string | null;
}

const fmt = (n: number | null | undefined) =>
  `UGX ${Number(n ?? 0).toLocaleString()}`;

export default function Treasury() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<PoolBalance | null>(null);
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // Manual entry form
  const [direction, setDirection] = useState<Direction>("credit");
  const [category, setCategory] = useState<Category>("topup");
  const [channel, setChannel] = useState<Channel>("yo_payments");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.functions.invoke("get-treasury-overview");
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any).error || "Failed to load treasury overview");

      setBalance(((data as any)?.balance ?? null) as any);
      setEntries((((data as any)?.entries ?? []) as any[]) || []);
      setInvestments((((data as any)?.investments ?? []) as any[]) || []);
    } catch (err: any) {
      setBalance(null);
      setEntries([]);
      setInvestments([]);
      setLoadError(err.message || "Failed to load treasury overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSyncYo = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-yo-balance");
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any).error);
      toast({
        title: "Yo balance synced",
        description: `Yo reports ${fmt((data as any)?.yo_total_ugx)}. Drift: ${fmt((data as any)?.drift)}`,
      });
      await load();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleBackfill = async () => {
    if (!confirm("Replay the entire ledger history into the treasury pool? This resets the auto-tracked balance to reflect all historical movements.")) return;
    setBackfilling(true);
    try {
      const { data, error } = await supabase.rpc("backfill_treasury_from_ledger" as any);
      if (error) throw error;
      const r = data as any;
      toast({
        title: "Backfill complete",
        description: `${r?.processed} entries replayed. Net: ${fmt((r?.total_credit || 0) - (r?.total_debit || 0))}`,
      });
      await load();
    } catch (err: any) {
      toast({ title: "Backfill failed", description: err.message, variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  };

  const handleManualEntry = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Description required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email || "admin";
      const { error } = await supabase.rpc("record_treasury_entry" as any, {
        p_direction: direction,
        p_amount: amt,
        p_channel: channel,
        p_category: category,
        p_reference: `MANUAL-${Date.now()}`,
        p_related_user_email: null,
        p_related_user_name: null,
        p_description: description.trim(),
        p_performed_by: email,
        p_metadata: { manual: true },
      });
      if (error) throw error;
      toast({ title: "Entry posted", description: `${direction === "credit" ? "+" : "-"}${fmt(amt)}` });
      setAmount("");
      setDescription("");
      await load();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Profits = fee credits (overdraft fees/interest, loan interest, statement charges, etc.)
  const profitEntries = entries.filter((e) => e.category === "fee" && e.direction === "credit");
  const totalProfits = profitEntries.reduce((s, e) => s + Number(e.amount), 0);

  // Human-readable label — driven by the authoritative `profit_type` metadata
  // set by post_treasury_profit, so loan interest, statement fees, overdraft
  // fees/interest/penalties all classify correctly.
  const sourceLabel = (e: PoolEntry) => {
    const pt = String(e.metadata?.profit_type || "").toLowerCase();
    if (pt === "loan_interest") return "loan interest";
    if (pt === "overdraft_fee") return "overdraft access fee";
    if (pt === "overdraft_interest") return "overdraft daily interest";
    if (pt === "overdraft_penalty") return "overdraft penalty";
    if (pt === "statement_fee") return "statement fee";
    if (pt) return pt.replace(/_/g, " ");
    // Fallback for older rows without profit_type metadata
    const raw = String(e.metadata?.source || e.reference || "").toLowerCase();
    if (raw.includes("loan")) return "loan interest";
    if (raw.includes("statement")) return "statement fee";
    if (raw.includes("overdraft")) return "overdraft charge";
    return raw.replace(/_/g, " ") || "fee";
  };

  // Breakdown of profits by source (drives the summary chips + filter list)
  const profitByType = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const e of profitEntries) {
      const key = sourceLabel(e);
      const cur = map.get(key) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(e.amount);
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [profitEntries]);

  // "View all" dialog state
  const [profitsOpen, setProfitsOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const filteredProfits = useMemo(() => {
    return profitEntries.filter((e) => {
      if (filterType !== "all" && sourceLabel(e) !== filterType) return false;
      if (filterFrom && new Date(e.created_at) < new Date(filterFrom)) return false;
      if (filterTo && new Date(e.created_at) > new Date(filterTo + "T23:59:59")) return false;
      return true;
    });
  }, [profitEntries, filterType, filterFrom, filterTo]);
  const filteredTotal = filteredProfits.reduce((s, e) => s + Number(e.amount), 0);

  const printProfits = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = filteredProfits.map((e) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${new Date(e.created_at).toLocaleString()}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-transform:capitalize">${sourceLabel(e)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${e.related_user_name || e.related_user_email || "system"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px">${e.description || ""}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right;color:#047857;font-weight:600">+UGX ${Number(e.amount).toLocaleString()}</td>
      </tr>`).join("");
    const periodLabel = filterFrom || filterTo
      ? `${filterFrom || "beginning"} to ${filterTo || "today"}`
      : "All time";
    const typeLabel = filterType === "all" ? "All revenue sources" : filterType;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Treasury Profits & Revenue</title>
      <style>
        body{font:13px/1.5 system-ui;margin:0;padding:24px;color:#111}
        .head{border-bottom:2px solid #1a5632;padding-bottom:12px;margin-bottom:16px}
        .head h1{margin:0;font-size:18px;color:#1a5632}
        .head .tag{color:#555;font-size:11px;font-style:italic}
        .head .meta{color:#555;font-size:11px;margin-top:4px}
        .title{font-size:15px;font-weight:700;margin:16px 0 6px}
        .sub{color:#555;font-size:12px;margin-bottom:12px}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:11px;background:#f4f7f4;text-transform:uppercase;letter-spacing:0.5px}
        .totals{margin-top:14px;padding:10px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;font-size:13px}
        .totals strong{color:#047857}
        .footer{margin-top:20px;font-size:10px;color:#888;border-top:1px dashed #ccc;padding-top:8px}
      </style></head><body onload="window.print();">
      <div class="head">
        <h1>${COMPANY_NAME}</h1>
        <div class="tag">${COMPANY_TAGLINE}</div>
        <div class="meta">${COMPANY_ADDRESS} · Tel: ${COMPANY_PHONE} · ${COMPANY_EMAIL} · Support: ${COMPANY_SUPPORT_EMAIL} · ${COMPANY_WEBSITE}</div>
        <div class="meta">${COMPANY_REG}</div>
      </div>
      <div class="title">Treasury Profits &amp; Revenue Statement</div>
      <div class="sub">Source: <strong style="text-transform:capitalize">${typeLabel}</strong> · Period: <strong>${periodLabel}</strong> · Printed: ${new Date().toLocaleString()}</div>
      <table>
        <thead><tr><th>Date</th><th>Source</th><th>From</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="padding:20px;text-align:center;color:#888">No entries match the filter</td></tr>`}</tbody>
      </table>
      <div class="totals"><strong>${filteredProfits.length}</strong> entries · Total revenue: <strong>UGX ${filteredTotal.toLocaleString()}</strong></div>
      <div class="footer">Great Agro Coffee — internal treasury document. Prepared by the Treasury Pool module.</div>
      </body></html>`);
    w.document.close();
  };

  // Aggregates
  const totalCredits = entries
    .filter((e) => e.direction === "credit" && e.category !== "reconciliation")
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalDebits = entries
    .filter((e) => e.direction === "debit" && e.category !== "reconciliation")
    .reduce((s, e) => s + Number(e.amount), 0);

  const drift = balance?.last_yo_synced_balance != null
    ? Number(balance.last_yo_synced_balance) - Number(balance.current_balance)
    : null;

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back" className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" /> Treasury Pool
            </h1>
            <p className="text-sm text-muted-foreground">
              Unified company money tracker — every withdrawal, deposit, transfer, and payout
            </p>
          </div>
        </div>
        <Button onClick={handleSyncYo} disabled={syncing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Yo Balance"}
        </Button>
        <Button onClick={handleBackfill} disabled={backfilling} variant="outline">
          <History className={`h-4 w-4 mr-2 ${backfilling ? "animate-spin" : ""}`} />
          {backfilling ? "Replaying..." : "Backfill from Ledger"}
        </Button>
      </div>

      {/* Insufficient funds banner */}
      {!loading && balance && Number(balance.current_balance) <= 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">Treasury pool is underfunded</div>
              <div className="text-muted-foreground mt-1">
                Pool balance: <span className="font-mono font-semibold">{fmt(balance.current_balance)}</span>.
                All system payouts (salaries, loans, bonuses, overtime, allowances, withdrawals, transfers) are currently <strong>BLOCKED</strong> until the pool is funded.
                Post a "Top up" entry below to restore operations.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && loadError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">Treasury data could not be loaded</div>
              <div className="text-muted-foreground mt-1">{loadError}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-primary/40">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Pool</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{fmt(balance?.current_balance)}</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-1">Cash + Yo + Bank</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" /> Cash Bucket</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{fmt(balance?.cash_balance)}</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-1">Funds cash requisitions</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Yo Float</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{fmt(balance?.yo_balance)}</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-1">Funds all MoMo payouts</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="h-3 w-3 text-green-600" /> Total In</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{fmt(totalCredits)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="h-3 w-3 text-red-600" /> Total Out</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{fmt(totalDebits)}</div></CardContent>
        </Card>
      </div>

      {/* Yo gateway sync info */}
      {balance?.last_yo_synced_balance != null && (
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-xs flex flex-wrap items-center gap-4">
            <span><strong>Yo gateway reports:</strong> {fmt(balance.last_yo_synced_balance)}</span>
            {drift !== null && (
              <span className={Math.abs(drift) < 1 ? "text-muted-foreground" : "text-amber-600"}>
                Drift vs internal Yo bucket: {drift >= 0 ? "+" : ""}{fmt(drift)}
              </span>
            )}
            {balance.last_yo_synced_at && (
              <span className="text-muted-foreground">Last sync: {new Date(balance.last_yo_synced_at).toLocaleString()}</span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Manual Adjustment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (money in)</SelectItem>
                  <SelectItem value="debit">Debit (money out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="topup">Top up Yo float / Cash</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="fee">Fee / Charge</SelectItem>
                  <SelectItem value="provider_payout">Provider payout</SelectItem>
                  <SelectItem value="meal_plan">Meal plan</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yo_payments">Yo Payments</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (UGX)</Label>
              <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Loaded UGX 500,000 to Yo float from Bank of Uganda"
              rows={2}
            />
          </div>
          <Button onClick={handleManualEntry} disabled={submitting}>
            {submitting ? "Posting..." : "Post entry"}
          </Button>
        </CardContent>
      </Card>

      {/* Investments overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" /> Investments Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const active = investments.filter(i => i.status === 'active');
            const matured = investments.filter(i => i.status === 'matured');
            const early = investments.filter(i => i.status === 'withdrawn_early');
            const totalActivePrincipal = active.reduce((s, i) => s + Number(i.amount), 0);
            const totalExpectedReturn = active.reduce(
              (s, i) => s + Number(i.amount) * (1 + Number(i.interest_rate || 25) / 100), 0);
            const totalExpectedInterest = totalExpectedReturn - totalActivePrincipal;
            const totalCashedOut = [...matured, ...early].reduce((s, i) => s + Number(i.total_payout || 0), 0);
            const totalEarnedPaid = [...matured, ...early].reduce((s, i) => s + Number(i.earned_interest || 0), 0);
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-blue-50 p-3">
                    <div className="text-[10px] text-muted-foreground uppercase">Active Principal</div>
                    <div className="text-lg font-bold text-blue-700">{fmt(totalActivePrincipal)}</div>
                    <div className="text-[10px] text-muted-foreground">{active.length} active</div>
                  </div>
                  <div className="rounded-lg border bg-green-50 p-3">
                    <div className="text-[10px] text-muted-foreground uppercase">Expected Returns</div>
                    <div className="text-lg font-bold text-green-700">{fmt(totalExpectedReturn)}</div>
                    <div className="text-[10px] text-muted-foreground">+{fmt(totalExpectedInterest)} interest</div>
                  </div>
                  <div className="rounded-lg border bg-amber-50 p-3">
                    <div className="text-[10px] text-muted-foreground uppercase">Cashed Out (Total)</div>
                    <div className="text-lg font-bold text-amber-700">{fmt(totalCashedOut)}</div>
                    <div className="text-[10px] text-muted-foreground">{matured.length + early.length} payouts</div>
                  </div>
                  <div className="rounded-lg border bg-purple-50 p-3">
                    <div className="text-[10px] text-muted-foreground uppercase">Interest Paid Out</div>
                    <div className="text-lg font-bold text-purple-700">{fmt(totalEarnedPaid)}</div>
                    <div className="text-[10px] text-muted-foreground">to investors so far</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {investments.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">No investments yet.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Investor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Principal</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Expected Return</TableHead>
                          <TableHead className="text-right">Earned So Far</TableHead>
                          <TableHead className="text-right">Cashed Out</TableHead>
                          <TableHead>Maturity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investments.slice(0, 100).map((inv) => {
                          const principal = Number(inv.amount);
                          const rate = Number(inv.interest_rate || 25);
                          const expectedReturn = principal * (1 + rate / 100);
                          const isActive = inv.status === 'active';
                          // Pro-rated earned-so-far for active
                          const totalDays = (inv.maturity_months || 3) * 30;
                          const daysElapsed = Math.max(0, Math.floor(
                            (Date.now() - new Date(inv.start_date).getTime()) / (24 * 60 * 60 * 1000)
                          ));
                          const accruedInterest = isActive
                            ? principal * (rate / 100) * Math.min(1, daysElapsed / totalDays)
                            : Number(inv.earned_interest || 0);
                          const cashedOut = isActive ? 0 : Number(inv.total_payout || 0);
                          return (
                            <TableRow key={inv.id}>
                              <TableCell className="text-xs">
                                <div className="font-medium">{inv.employee_name || inv.user_email}</div>
                                <div className="text-[10px] text-muted-foreground">{inv.user_email}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${
                                  inv.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                  inv.status === 'matured' ? 'bg-green-100 text-green-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {inv.status === 'withdrawn_early' ? 'Early Exit' : inv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">{fmt(principal)}</TableCell>
                              <TableCell className="text-right text-xs">{rate}%</TableCell>
                              <TableCell className="text-right font-mono text-xs text-green-700">{fmt(expectedReturn)}</TableCell>
                              <TableCell className="text-right font-mono text-xs text-blue-700">{fmt(accruedInterest)}</TableCell>
                              <TableCell className="text-right font-mono text-xs text-amber-700">{cashedOut > 0 ? fmt(cashedOut) : '—'}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {new Date(inv.maturity_date).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Profits (revenue) panel — kept separate from operational cash flow */}
      <Card className="border-emerald-300/60 bg-emerald-50/40">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Profits & Revenue
          </CardTitle>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase">Total profit captured</div>
            <div className="text-xl font-bold text-emerald-700">{fmt(totalProfits)}</div>
            <div className="text-[10px] text-muted-foreground">
              {profitEntries.length} entries · loan interest · OD fees · OD interest · OD penalty · statement fees
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto space-y-3">
          {/* Per-source breakdown chips */}
          {profitByType.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profitByType.map(([label, agg]) => (
                <div key={label} className="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-xs">
                  <span className="font-medium capitalize">{label}</span>
                  <span className="ml-2 text-emerald-700 font-semibold">{fmt(agg.total)}</span>
                  <span className="ml-1 text-muted-foreground">({agg.count})</span>
                </div>
              ))}
            </div>
          )}
          {profitEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">No profit entries yet.</div>
          ) : (
            <>
              <ul className="divide-y divide-emerald-200/60">
                {profitEntries.slice(0, 10).map((e) => (
                  <li key={e.id} className="py-2 flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 shrink-0 mt-0.5 capitalize">
                      {sourceLabel(e)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-emerald-800">+{fmt(e.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        from {e.related_user_name || e.related_user_email || "system"} ·{" "}
                        {new Date(e.created_at).toLocaleString()}
                      </div>
                      {e.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{e.description}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {profitEntries.length > 10 && (
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Showing the 10 most recent of {profitEntries.length} entries.</span>
                  <Button size="sm" variant="outline" onClick={() => setProfitsOpen(true)}>
                    <Filter className="h-3 w-3 mr-1.5" /> View all · filter · print
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Profits — filter & print dialog */}
      <Dialog open={profitsOpen} onOpenChange={setProfitsOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Profits &amp; Revenue — full history
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Source</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {profitByType.map(([label]) => (
                    <SelectItem key={label} value={label} className="capitalize">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={printProfits} className="w-full">
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
            </div>
          </div>
          <div className="rounded-md border bg-emerald-50 p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">
              <strong>{filteredProfits.length}</strong> entries match
            </span>
            <span className="font-semibold text-emerald-700">Total: {fmt(filteredTotal)}</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfits.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No entries match the filter.</TableCell></TableRow>
                ) : filteredProfits.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs capitalize">{sourceLabel(e)}</TableCell>
                    <TableCell className="text-xs">{e.related_user_name || e.related_user_email || "system"}</TableCell>
                    <TableCell className="text-xs">{e.description || "—"}</TableCell>
                    <TableCell className="text-xs font-mono text-right text-emerald-700 font-semibold">+{fmt(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}