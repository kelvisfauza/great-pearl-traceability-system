import { useEffect, useState, useCallback } from "react";
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
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, Plus, Banknote, AlertTriangle, History,
} from "lucide-react";

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
  last_yo_synced_balance: number | null;
  last_yo_synced_at: string | null;
  updated_at: string;
}

const fmt = (n: number | null | undefined) =>
  `UGX ${Number(n ?? 0).toLocaleString()}`;

export default function Treasury() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<PoolBalance | null>(null);
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");

  // Manual entry form
  const [direction, setDirection] = useState<Direction>("credit");
  const [category, setCategory] = useState<Category>("topup");
  const [channel, setChannel] = useState<Channel>("yo_payments");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: bal }, { data: ents }] = await Promise.all([
      supabase.from("treasury_pool_balance" as any).select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("treasury_pool_entries" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setBalance(bal as any);
    setEntries((ents as any[]) || []);
    setLoading(false);
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

  const filtered = entries.filter((e) => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterChannel !== "all" && e.channel !== filterChannel) return false;
    return true;
  });

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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Treasury Pool
          </h1>
          <p className="text-sm text-muted-foreground">
            Unified company money tracker — every withdrawal, deposit, transfer, and payout
          </p>
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pool Balance</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{fmt(balance?.current_balance)}</div>
            )}
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
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" /> Yo Float</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(balance?.last_yo_synced_balance)}</div>
            {drift !== null && (
              <div className={`text-xs mt-1 ${Math.abs(drift) < 1 ? "text-muted-foreground" : "text-amber-600"}`}>
                Drift: {drift >= 0 ? "+" : ""}{fmt(drift)}
              </div>
            )}
            {balance?.last_yo_synced_at && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Last sync: {new Date(balance.last_yo_synced_at).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

      {/* Transaction log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">Transaction Log ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="provider_payout">Provider payout</SelectItem>
                <SelectItem value="meal_plan">Meal plan</SelectItem>
                <SelectItem value="topup">Top up</SelectItem>
                <SelectItem value="reconciliation">Reconciliation</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Channel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="yo_payments">Yo Payments</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No entries yet. The pool will populate as withdrawals, deposits, transfers and payouts occur — or post a manual top-up above.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance after</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{e.category}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{e.channel}</Badge></TableCell>
                    <TableCell className="text-xs">{e.related_user_name || e.related_user_email || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[280px] truncate" title={e.description || ""}>
                      {e.description || "—"}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${e.direction === "credit" ? "text-green-600" : "text-red-600"}`}>
                      {e.direction === "credit" ? "+" : "-"}{fmt(e.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {fmt(e.balance_after)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}