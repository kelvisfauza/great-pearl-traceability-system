import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Landmark, Users, HandCoins, PiggyBank, TrendingUp, Gift, Truck, Percent,
  AlertTriangle, ArrowLeftRight, Plus, History, CheckCircle2, Settings2, RefreshCw,
} from "lucide-react";

interface Account {
  code: string;
  name: string;
  description: string | null;
  kind: "fund" | "liability" | "income" | "receivable";
  balance: number;
  low_balance_threshold: number;
  allow_negative: boolean;
  updated_at: string;
}
interface Alert {
  id: string;
  account_code: string | null;
  alert_type: string;
  amount_required: number | null;
  balance_at_alert: number | null;
  message: string;
  created_at: string;
}
interface Entry {
  id: string;
  account_code: string;
  direction: "credit" | "debit";
  amount: number;
  balance_after: number;
  counter_account: string | null;
  reference: string | null;
  related_user_name: string | null;
  related_user_email: string | null;
  description: string | null;
  performed_by: string | null;
  created_at: string;
}
interface Overview {
  accounts: Account[];
  alerts: Alert[];
  expected_float: number;
  yo_balance: number;
  yo_synced_at: string | null;
  gosente_balance: number;
  actual_float: number;
  drift: number;
  is_super_admin: boolean;
}

const fmt = (n: number | null | undefined) => `UGX ${Math.round(Number(n ?? 0)).toLocaleString()}`;

const ICONS: Record<string, any> = {
  general: Landmark, user_wallets: Users, loans_overdrafts: HandCoins, invest_earn: PiggyBank,
  profits: TrendingUp, loyalty_fund: Gift, operations: Truck, fees_income: Percent,
};

const FUNDED_FROM: Record<string, string> = {
  general: "Salaries, bonuses, allowances, per diem, overtime",
  loyalty_fund: "Loyalty points and activity rewards",
  operations: "Meal plans, service providers, requisitions",
  loans_overdrafts: "Loan payouts and overdraft draws; repayments return here",
  invest_earn: "Staff savings locked in; principal repaid from here",
  profits: "Loan/overdraft interest, penalties, statement fees; pays investment interest",
  fees_income: "Withdrawal and service fees collected",
  user_wallets: "Total money held on behalf of staff (liability)",
};

export default function TreasuryAccountsPanel() {
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fundOpen, setFundOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [historyCode, setHistoryCode] = useState<string | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [target, setTarget] = useState("general");
  const [fromAcc, setFromAcc] = useState("profits");
  const [toAcc, setToAcc] = useState("general");
  const [channel, setChannel] = useState("yo_payments");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await (supabase as any).rpc("get_treasury_accounts_overview");
      if (err) throw err;
      if (!res?.ok) throw new Error(res?.error || "Could not load treasury accounts");
      setData(res as Overview);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const accounts = data?.accounts ?? [];
  const fundable = useMemo(() => accounts.filter((a) => a.code !== "user_wallets"), [accounts]);
  const byCode = useMemo(() => Object.fromEntries(accounts.map((a) => [a.code, a])), [accounts]);

  const openHistory = async (code: string) => {
    setHistoryCode(code);
    setHistoryLoading(true);
    const { data: rows } = await (supabase as any)
      .from("treasury_account_entries")
      .select("*")
      .eq("account_code", code)
      .order("created_at", { ascending: false })
      .limit(100);
    setHistory((rows as Entry[]) || []);
    setHistoryLoading(false);
  };

  const runRpc = async (fn: string, args: Record<string, any>, success: string) => {
    setBusy(true);
    try {
      const { data: res, error: err } = await (supabase as any).rpc(fn, args);
      if (err) throw err;
      if (res && res.ok === false) throw new Error(res.error);
      toast({ title: success });
      setFundOpen(false); setMoveOpen(false); setThresholdOpen(false);
      setAmount(""); setNote(""); setThreshold("");
      await load();
    } catch (e: any) {
      toast({ title: "Not done", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const resolveAlert = async (id: string) => {
    await (supabase as any).from("treasury_alerts").update({ resolved_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const amt = parseFloat(amount);
  const driftAbs = Math.abs(Number(data?.drift ?? 0));
  const driftBad = driftAbs >= 50000;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Treasury Accounts</h2>
          <p className="text-xs text-muted-foreground">Every wallet credit is drawn from its account. Empty account = payment blocked and Super Admin alerted.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          {data?.is_super_admin && (
            <>
              <Button size="sm" onClick={() => setFundOpen(true)}><Plus className="h-4 w-4 mr-1" />Fund account</Button>
              <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}><ArrowLeftRight className="h-4 w-4 mr-1" />Move between accounts</Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5"><CardContent className="p-3 text-sm text-destructive">{error}</CardContent></Card>
      )}

      {/* Live provider balances — refreshed every second */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-primary/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  Yo Payments balance
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />LIVE</span>
                </div>
                <div className="text-2xl font-bold tabular-nums">{fmt(data.yo_balance)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {data.yo_synced_at ? `Yo last checked ${new Date(data.yo_synced_at).toLocaleTimeString()}` : "not synced yet"} · re-checked with Yo every minute · screen refreshes every second
                </div>
              </div>
              <RefreshCw className="h-6 w-6 text-primary/60" />
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  GosentePay balance
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />LIVE</span>
                </div>
                <div className={`text-2xl font-bold tabular-nums ${Number(data.gosente_balance) < 0 ? "text-destructive" : ""}`}>{fmt(data.gosente_balance)}</div>
                <div className="text-[10px] text-muted-foreground">updated {lastTick.toLocaleTimeString()} · refreshes every second</div>
              </div>
              <RefreshCw className="h-6 w-6 text-primary/60" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-money check */}
      {data && (
        <Card className={driftBad ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "bg-muted/30"}>
          <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-[11px] text-muted-foreground">System says we should hold</div><div className="font-semibold">{fmt(data.expected_float)}</div><div className="text-[10px] text-muted-foreground">sum of all accounts</div></div>
            <div><div className="text-[11px] text-muted-foreground">Yo Payments</div><div className="font-semibold">{fmt(data.yo_balance)}</div><div className="text-[10px] text-muted-foreground">{data.yo_synced_at ? `synced ${new Date(data.yo_synced_at).toLocaleString()}` : "not synced yet"}</div></div>
            <div><div className="text-[11px] text-muted-foreground">GosentePay</div><div className="font-semibold">{fmt(data.gosente_balance)}</div></div>
            <div>
              <div className="text-[11px] text-muted-foreground">Difference (real − system)</div>
              <div className={`font-semibold ${driftBad ? "text-amber-700 dark:text-amber-300" : "text-green-700"}`}>{data.drift >= 0 ? "+" : "−"}{fmt(driftAbs)}</div>
              <div className="text-[10px] text-muted-foreground">{driftBad ? "Checked hourly — Super Admin is alerted" : "Within tolerance"}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {data && data.alerts.length > 0 && (
        <Card className="border-destructive/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Open alerts ({data.alerts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 text-sm border-b last:border-0 pb-2">
                <div>
                  <Badge variant="destructive" className="mr-2 uppercase text-[10px]">{a.alert_type.replace("_", " ")}</Badge>
                  <span>{a.message}</span>
                  <div className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => resolveAlert(a.id)}><CheckCircle2 className="h-4 w-4 mr-1" />Dismiss</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && !data ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />) : accounts.map((a) => {
          const Icon = ICONS[a.code] || Landmark;
          const bal = Number(a.balance);
          const isFund = a.kind === "fund" || a.kind === "income";
          const empty = isFund && bal <= 0;
          const low = isFund && !empty && bal < Number(a.low_balance_threshold);
          return (
            <Card key={a.code} className={empty ? "border-destructive" : low ? "border-amber-500" : ""}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5"><Icon className="h-4 w-4 text-primary" />{a.name}</span>
                  {empty && <Badge variant="destructive" className="text-[10px]">EMPTY</Badge>}
                  {low && <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500">LOW</Badge>}
                  {a.kind === "liability" && <Badge variant="secondary" className="text-[10px]">LIABILITY</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${bal < 0 ? "text-destructive" : ""}`}>{fmt(bal)}</div>
                <div className="text-[10px] text-muted-foreground mt-1 min-h-[28px]">{FUNDED_FROM[a.code] || a.description}</div>
                {isFund && <div className="text-[10px] text-muted-foreground">Alert below {fmt(a.low_balance_threshold)}</div>}
                <div className="flex gap-1 mt-2 flex-wrap">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openHistory(a.code)}><History className="h-3 w-3 mr-1" />History</Button>
                  {data?.is_super_admin && a.code !== "user_wallets" && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setTarget(a.code); setFundOpen(true); }}><Plus className="h-3 w-3 mr-1" />Fund</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setTarget(a.code); setThreshold(String(a.low_balance_threshold)); setThresholdOpen(true); }}><Settings2 className="h-3 w-3 mr-1" />Alert level</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Fund dialog */}
      <Dialog open={fundOpen} onOpenChange={(o) => !busy && setFundOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fund an account</DialogTitle>
            <DialogDescription>Real money brought in (from Yo Payments, GosentePay, cash or bank) and placed in an account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Account</Label>
              <Select value={target} onValueChange={setTarget}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{fundable.map((a) => <SelectItem key={a.code} value={a.code}>{a.name} — {fmt(a.balance)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Money comes from</Label>
              <Select value={channel} onValueChange={setChannel}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yo_payments">Yo Payments float</SelectItem>
                  <SelectItem value="gosente">GosentePay</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent></Select></div>
            <div><Label>Amount (UGX)</Label><Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 2000000" /></div>
            <div><Label>Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. September salaries and bonuses budget" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundOpen(false)} disabled={busy}>Cancel</Button>
            <Button disabled={busy || !amt || amt <= 0} onClick={() => runRpc("treasury_fund_account", { p_account: target, p_amount: amt, p_channel: channel, p_description: note.trim() || null }, `Funded ${byCode[target]?.name || target}`)}>
              {busy ? "Posting…" : "Fund account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <Dialog open={moveOpen} onOpenChange={(o) => !busy && setMoveOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move money between accounts</DialogTitle>
            <DialogDescription>For example: move Profits into the General account to pay bonuses, or top up the Loyalty fund from General.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>From</Label>
              <Select value={fromAcc} onValueChange={setFromAcc}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{fundable.map((a) => <SelectItem key={a.code} value={a.code}>{a.name} — {fmt(a.balance)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>To</Label>
              <Select value={toAcc} onValueChange={setToAcc}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{fundable.filter((a) => a.code !== fromAcc).map((a) => <SelectItem key={a.code} value={a.code}>{a.name} — {fmt(a.balance)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Amount (UGX)</Label><Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)} disabled={busy}>Cancel</Button>
            <Button disabled={busy || !amt || amt <= 0 || fromAcc === toAcc} onClick={() => runRpc("treasury_move_funds", { p_from: fromAcc, p_to: toAcc, p_amount: amt, p_description: note.trim() || null }, "Money moved")}>
              {busy ? "Moving…" : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Threshold dialog */}
      <Dialog open={thresholdOpen} onOpenChange={(o) => !busy && setThresholdOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alert level — {byCode[target]?.name}</DialogTitle>
            <DialogDescription>Super Admin is emailed and texted when the balance drops below this amount.</DialogDescription>
          </DialogHeader>
          <div><Label>Alert when below (UGX)</Label><Input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdOpen(false)} disabled={busy}>Cancel</Button>
            <Button disabled={busy} onClick={() => runRpc("treasury_set_threshold", { p_account: target, p_threshold: parseFloat(threshold) || 0 }, "Alert level saved")}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyCode} onOpenChange={(o) => !o && setHistoryCode(null)}>
        <DialogContent className="max-w-[96vw] w-[96vw] xl:max-w-[1400px] h-[92vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
            <DialogTitle>{historyCode ? byCode[historyCode]?.name : ""} — last 100 movements</DialogTitle>
            <Button size="sm" variant="outline" onClick={printHistory} disabled={historyLoading || history.length === 0}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </DialogHeader>
          {historyLoading ? <Skeleton className="h-40" /> : (
            <div className="flex-1 min-h-0 overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="whitespace-nowrap">Reference</TableHead>
                    <TableHead className="whitespace-nowrap">Who</TableHead>
                    <TableHead className="whitespace-nowrap">With</TableHead>
                    <TableHead className="whitespace-nowrap">Done by</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Balance after</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No movements yet</TableCell></TableRow>}
                  {history.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs whitespace-nowrap align-top">{new Date(e.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs align-top whitespace-normal break-words min-w-[220px]">{e.description || "—"}</TableCell>
                      <TableCell className="text-xs align-top font-mono break-all min-w-[160px]">{e.reference || "—"}</TableCell>
                      <TableCell className="text-xs align-top whitespace-nowrap">{e.related_user_name || e.related_user_email || "system"}</TableCell>
                      <TableCell className="text-xs align-top whitespace-nowrap">{e.counter_account ? (byCode[e.counter_account]?.name || e.counter_account) : "—"}</TableCell>
                      <TableCell className="text-xs align-top whitespace-nowrap">{e.performed_by || "system"}</TableCell>
                      <TableCell className={`text-xs text-right font-mono align-top whitespace-nowrap ${e.direction === "credit" ? "text-green-600" : "text-red-600"}`}>{e.direction === "credit" ? "+" : "−"}{Math.round(Number(e.amount)).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right font-mono align-top whitespace-nowrap">{Math.round(Number(e.balance_after)).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
