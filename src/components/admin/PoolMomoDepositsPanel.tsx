import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Smartphone, RefreshCw, Loader2 } from "lucide-react";

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;
const providerName = (p: string) => (p === "yo" ? "Yo Payments" : "GosentePay");
const ACCOUNTS: Record<string, string> = {
  operations: "Operations", general: "General", loans_overdrafts: "Loans & Overdrafts",
  invest_earn: "Invest & Earn", profits: "Profits", fees_income: "Fees Income", loyalty_fund: "Loyalty Fund",
};

export default function PoolMomoDepositsPanel({ canDeposit, onPosted }: { canDeposit: boolean; onPosted?: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [provider, setProvider] = useState<"gosente" | "yo">("gosente");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("operations");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from("treasury_momo_deposits").select("*").order("created_at", { ascending: false }).limit(100);
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const t = { yo: 0, gosente: 0 };
    rows.filter((r) => r.status === "completed").forEach((r) => { (t as any)[r.provider] += Number(r.amount); });
    return t;
  }, [rows]);

  const checkStatus = async (reference: string, silent = false) => {
    if (!silent) setChecking(reference);
    try {
      const { data } = await supabase.functions.invoke("treasury-momo-deposit", { body: { action: "status", reference } });
      const s = (data as any)?.status;
      if (s === "completed") { toast.success("Deposit confirmed and added to the pool"); onPosted?.(); }
      else if (s === "failed") toast.error(`Deposit failed: ${(data as any)?.error_message || "not paid"}`);
      else if (!silent) toast.info("Still waiting for the PIN confirmation");
      await load();
      return s;
    } finally { if (!silent) setChecking(null); }
  };

  const start = async () => {
    const amt = Number(amount);
    if (!amt || amt < 500) return toast.error("Enter an amount of at least UGX 500");
    if (!phone.trim()) return toast.error("Enter the phone number to pay from");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("treasury-momo-deposit", { body: { provider, phone, amount: amt, account, note } });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || error?.message || "Could not start deposit");
      toast.success((data as any).message);
      setAmount(""); setNote("");
      await load();
      const ref = (data as any).reference;
      // Poll every 10s for up to 3 minutes
      for (let i = 0; i < 18; i++) {
        await new Promise((r) => setTimeout(r, 10_000));
        const s = await checkStatus(ref, true);
        if (s && s !== "pending") break;
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base"><Smartphone className="h-5 w-5" /> Mobile money deposits into the pool</CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border p-3"><div className="text-muted-foreground">Deposited via Yo Payments</div><div className="font-bold">{fmt(totals.yo)}</div></div>
          <div className="rounded-md border p-3"><div className="text-muted-foreground">Deposited via GosentePay</div><div className="font-bold">{fmt(totals.gosente)}</div></div>
        </div>

        {canDeposit && (
          <div className="grid gap-3 md:grid-cols-5 rounded-md border p-3">
            <div className="space-y-1"><Label>Deposit through</Label>
              <Select value={provider} onValueChange={(v: any) => setProvider(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gosente">GosentePay</SelectItem><SelectItem value="yo">Yo Payments</SelectItem></SelectContent>
              </Select></div>
            <div className="space-y-1"><Label>My phone number</Label><Input placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="space-y-1"><Label>Amount (UGX)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-1"><Label>Into account</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACCOUNTS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1"><Label>Note (optional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <Button className="md:col-span-5" onClick={start} disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Waiting for PIN confirmation…</> : "Send payment prompt to my phone"}
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Through</TableHead><TableHead>Phone</TableHead><TableHead>Account</TableHead>
              <TableHead>By</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No deposits yet</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>{providerName(r.provider)}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>{ACCOUNTS[r.account_code] || r.account_code}</TableCell>
                  <TableCell className="text-xs">{r.initiated_by}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(r.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                      {r.status === "completed" ? "Cash in" : r.status}
                    </Badge>
                    {r.error_message && <div className="text-xs text-muted-foreground">{r.error_message}</div>}
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" && canDeposit && (
                      <Button size="sm" variant="outline" disabled={checking === r.reference} onClick={() => checkStatus(r.reference)}>Check</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
