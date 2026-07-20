import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wallet, Loader2, Printer, PlusCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function BudgetWallet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openReq, setOpenReq] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [allocationId, setAllocationId] = useState("");
  const [amount, setAmount] = useState("");
  const [payoutMode, setPayoutMode] = useState<"mobile_money" | "cash" | "personal_wallet">("mobile_money");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [balRes, allocRes, ledRes, reqRes] = await Promise.all([
      supabase.rpc("get_budget_wallet_balance", { _employee_id: user.id }),
      supabase.from("budget_allocations").select("*").eq("employee_id", user.id).eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("budget_ledger_entries").select("*").eq("employee_id", user.id).order("created_at", { ascending: false }).limit(200),
      supabase.from("budget_withdrawal_requests").select("*").eq("employee_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setBalance(Number(balRes.data ?? 0));
    setAllocations(allocRes.data || []);
    setLedger(ledRes.data || []);
    setRequests(reqRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const resetForm = () => {
    setAllocationId(""); setAmount(""); setPayoutMode("mobile_money");
    setRecipientName(""); setRecipientPhone("");
    setReason(""); setReceiptFile(null);
  };

  const submit = async () => {
    if (!user) return;
    if (!allocationId) return toast.error("Select a budget line");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!reason.trim() || reason.trim().length < 5) return toast.error("Provide a clear reason");
    if (!recipientName.trim()) return toast.error("Provide recipient name");
    if (payoutMode === "mobile_money" && !recipientPhone.trim()) return toast.error("Recipient phone required for mobile money");

    const alloc = allocations.find((a) => a.id === allocationId);
    if (!alloc) return toast.error("Invalid allocation");
    const remaining = Number(alloc.allocated_amount) - Number(alloc.spent_amount);
    if (amt > remaining) return toast.error(`Amount exceeds remaining budget line (${fmt(remaining)})`);
    if (amt > balance) return toast.error(`Amount exceeds budget wallet balance (${fmt(balance)})`);

    setSubmitting(true);
    try {
      let receipt_url: string | null = null;
      if (receiptFile) {
        const path = `${user.id}/${Date.now()}-${receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("budget-receipts").upload(path, receiptFile);
        if (upErr) throw upErr;
        receipt_url = path;
      }
      const { error } = await supabase.from("budget_withdrawal_requests").insert({
        employee_id: user.id,
        allocation_id: allocationId,
        amount: amt,
        payout_mode: payoutMode,
        provider: null, // Provider chosen by admin at approval time
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim() || null,
        reason: reason.trim(),
        receipt_url,
      });
      if (error) throw error;
      toast.success("Request submitted — awaiting two administrator approvals");
      setOpenReq(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) => ({
    pending: "bg-yellow-100 text-yellow-800",
    approved_1: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    failed: "bg-red-100 text-red-800",
  } as any)[s] || "bg-gray-100 text-gray-800";

  const printStatement = () => window.print();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Budget Wallet</h1>
          <p className="text-muted-foreground text-sm">Dedicated funds for your approved season budget — separate from your personal wallet.</p>
        </div>
        <Button onClick={() => setOpenReq(true)} disabled={allocations.length === 0}>
          <PlusCircle className="w-4 h-4 mr-2" /> Request Withdrawal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Wallet className="w-4 h-4" /> Budget Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "…" : fmt(balance)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Requires 2 admin approvals to withdraw</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Budget Lines</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{allocations.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Requests</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{requests.filter(r => r.status === "pending" || r.status === "approved_1").length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="allocations">
        <TabsList>
          <TabsTrigger value="allocations">Budget Lines</TabsTrigger>
          <TabsTrigger value="statement">Statement</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations">
          <Card>
            <CardHeader><CardTitle>Approved Budget Lines</CardTitle><CardDescription>Categories allocated to you by administration for the current season.</CardDescription></CardHeader>
            <CardContent>
              {allocations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No allocations yet. Once administration approves and allocates your season budget, it will appear here.</p>
              ) : (
                <div className="space-y-3">
                  {allocations.map((a) => {
                    const remaining = Number(a.allocated_amount) - Number(a.spent_amount);
                    return (
                      <div key={a.id} className="p-3 border rounded-md flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <div className="font-semibold">{a.category}</div>
                          <div className="text-xs text-muted-foreground">{a.description || "—"}</div>
                          {a.notes && <div className="text-xs mt-1">{a.notes}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-sm">Allocated: <span className="font-medium">{fmt(a.allocated_amount)}</span></div>
                          <div className="text-sm">Spent: <span className="font-medium">{fmt(a.spent_amount)}</span></div>
                          <div className="text-sm">Remaining: <span className="font-bold text-primary">{fmt(remaining)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statement">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div><CardTitle>Budget Wallet Statement</CardTitle><CardDescription>Every credit and debit against your budget wallet.</CardDescription></div>
              <Button variant="outline" size="sm" onClick={printStatement}><Printer className="w-4 h-4 mr-2" /> Print</Button>
            </CardHeader>
            <CardContent className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id} className="border-b">
                      <td className="p-2">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="p-2">{l.entry_type}</td>
                      <td className="p-2">{l.description}</td>
                      <td className={`p-2 text-right ${l.amount < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(l.amount)}</td>
                      <td className="p-2 text-right font-medium">{fmt(l.balance_after)}</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground p-4">No entries yet</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader><CardTitle>My Withdrawal Requests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="p-3 border rounded-md space-y-1">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="font-semibold">{fmt(r.amount)} — {r.reason}</div>
                      <div className="text-xs text-muted-foreground">To: {r.recipient_name} • {r.payout_mode}{r.provider ? ` (${r.provider})` : ""}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <Badge className={statusColor(r.status)}>{r.status}</Badge>
                  </div>
                  {r.rejection_reason && <div className="text-xs text-red-600">Rejected: {r.rejection_reason}</div>}
                  {r.payout_reference && <div className="text-xs">Ref: {r.payout_reference}</div>}
                </div>
              ))}
              {requests.length === 0 && <p className="text-muted-foreground text-sm">No requests yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openReq} onOpenChange={setOpenReq}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Budget Withdrawal Request</DialogTitle>
            <DialogDescription>Requires <strong>two distinct administrators</strong> to approve. Provide clear documentation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Budget Line *</Label>
              <Select value={allocationId} onValueChange={setAllocationId}>
                <SelectTrigger><SelectValue placeholder="Select approved budget line" /></SelectTrigger>
                <SelectContent>
                  {allocations.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.category} — {fmt(Number(a.allocated_amount) - Number(a.spent_amount))} left</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (UGX) *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Reason / Justification *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What is this money for? Be specific." maxLength={500} />
            </div>
            <div>
              <Label>Payout Mode *</Label>
              <Select value={payoutMode} onValueChange={(v: any) => setPayoutMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cash">Cash (recorded)</SelectItem>
                  <SelectItem value="personal_wallet">Transfer to my personal wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payoutMode === "mobile_money" && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Mobile money: on final approval, an administrator will pick the payout channel
                (GosentePay or Yo Payments) and dispatch funds directly to the recipient phone.
              </p>
            )}
            <div>
              <Label>Recipient Name *</Label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Full name of recipient" maxLength={100} />
            </div>
            {payoutMode !== "cash" && (
              <div>
                <Label>Recipient Phone {payoutMode === "mobile_money" ? "*" : "(optional)"}</Label>
                <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="0770XXXXXX" maxLength={20} />
              </div>
            )}
            <div>
              <Label>Receipt / Supporting Document (optional)</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReq(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}