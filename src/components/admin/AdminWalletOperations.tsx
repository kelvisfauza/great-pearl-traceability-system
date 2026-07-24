import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRightLeft, PlusCircle, MinusCircle, Send, Wallet, Loader2, Check, X } from "lucide-react";

type OpType = "credit" | "debit" | "transfer" | "withdraw";
type ConfirmMethod = "second_admin" | "user_otp";

interface Employee { id: string; name: string; email: string; phone: string | null; role?: string }

interface Operation {
  id: string;
  operation_type: OpType;
  target_email: string; target_name: string | null; target_phone: string | null;
  amount: number; reason: string;
  destination_email: string | null; destination_name: string | null;
  destination_phone: string | null; payout_provider: string | null;
  service_fee: number; overdraft_access_fee: number; allow_overdraft: boolean;
  status: string;
  initiated_by_email: string; initiated_by_name: string | null;
  approved_by_email: string | null; approved_by_name: string | null;
  rejected_reason: string | null; execution_error: string | null;
  ledger_reference: string | null; gateway_reference: string | null;
  created_at: string; executed_at: string | null;
  confirmation_method?: ConfirmMethod;
  otp_expires_at?: string | null;
}

const OP_ICONS: Record<OpType, JSX.Element> = {
  credit: <PlusCircle className="h-4 w-4 text-emerald-600" />,
  debit: <MinusCircle className="h-4 w-4 text-rose-600" />,
  transfer: <ArrowRightLeft className="h-4 w-4 text-blue-600" />,
  withdraw: <Send className="h-4 w-4 text-amber-600" />,
};

export default function AdminWalletOperations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // form
  const [opType, setOpType] = useState<OpType>("credit");
  const [targetEmail, setTargetEmail] = useState("");
  const [destinationEmail, setDestinationEmail] = useState("");
  const [destinationPhone, setDestinationPhone] = useState("");
  const [payoutProvider, setPayoutProvider] = useState<"gosentepay" | "yo" | "cash">("gosentepay");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [allowOverdraft, setAllowOverdraft] = useState(false);
  const [confirmMethod, setConfirmMethod] = useState<ConfirmMethod>("second_admin");
  const [otpDrafts, setOtpDrafts] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    const [empRes, opsRes] = await Promise.all([
      supabase.from("employees").select("id, name, email, phone, role").eq("status", "Active").order("name"),
      supabase.from("admin_wallet_operations").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setEmployees((empRes.data || []) as Employee[]);
    setOperations((opsRes.data || []) as Operation[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const targetEmp = useMemo(() => employees.find(e => e.email === targetEmail), [employees, targetEmail]);

  const handleSubmit = async () => {
    if (!targetEmail || !amount || !reason.trim()) {
      toast({ title: "Missing fields", description: "Target, amount, and reason are required.", variant: "destructive" });
      return;
    }
    if (opType === "transfer" && !destinationEmail) {
      toast({ title: "Destination required", variant: "destructive" }); return;
    }
    if (opType === "withdraw" && !destinationPhone) {
      toast({ title: "Phone required", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-wallet-operation", {
        body: {
          action: "create",
          operation_type: opType,
          target_email: targetEmail,
          amount: Number(amount),
          reason: reason.trim(),
          destination_email: opType === "transfer" ? destinationEmail : undefined,
          destination_phone: opType === "withdraw" ? destinationPhone : undefined,
          payout_provider: opType === "withdraw" ? payoutProvider : undefined,
          allow_overdraft: allowOverdraft,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed");
      toast({ title: "Request created", description: "Awaiting a second administrator to approve." });
      setAmount(""); setReason(""); setDestinationPhone(""); setDestinationEmail("");
      loadData();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (op: Operation) => {
    setApprovingId(op.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-wallet-operation", {
        body: { action: "approve", operation_id: op.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed");
      toast({ title: "Approved & executed", description: `Reference: ${data.reference || "-"}` });
      loadData();
    } catch (e: any) {
      toast({ title: "Approval failed", description: e.message, variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (op: Operation) => {
    const rejected_reason = window.prompt("Reason for rejection?") || "";
    if (!rejected_reason) return;
    setApprovingId(op.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-wallet-operation", {
        body: { action: "reject", operation_id: op.id, rejected_reason },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error);
      toast({ title: "Rejected" });
      loadData();
    } catch (e: any) {
      toast({ title: "Reject failed", description: e.message, variant: "destructive" });
    } finally { setApprovingId(null); }
  };

  const pending = operations.filter(o => o.status === "pending");
  const history = operations.filter(o => o.status !== "pending");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Wallet Operations</CardTitle>
          <CardDescription>
            Credit, debit, transfer, or withdraw from any user's wallet. Every action requires a
            second administrator to co-sign. Users are notified via SMS on completion. Overdraft
            usage automatically applies the 2.75% access fee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={opType} onValueChange={(v) => setOpType(v as OpType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="credit"><PlusCircle className="h-4 w-4 mr-1" /> Credit</TabsTrigger>
              <TabsTrigger value="debit"><MinusCircle className="h-4 w-4 mr-1" /> Debit</TabsTrigger>
              <TabsTrigger value="transfer"><ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer</TabsTrigger>
              <TabsTrigger value="withdraw"><Send className="h-4 w-4 mr-1" /> Withdraw</TabsTrigger>
            </TabsList>

            <TabsContent value={opType} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{opType === "credit" ? "Beneficiary" : "Source user"}</Label>
                  <Select value={targetEmail} onValueChange={setTargetEmail}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => (
                        <SelectItem key={e.email} value={e.email}>{e.name} — {e.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {targetEmp?.phone && (
                    <p className="text-xs text-muted-foreground mt-1">SMS to: {targetEmp.phone}</p>
                  )}
                </div>

                <div>
                  <Label>Amount (UGX)</Label>
                  <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                </div>

                {opType === "transfer" && (
                  <div className="md:col-span-2">
                    <Label>Destination user</Label>
                    <Select value={destinationEmail} onValueChange={setDestinationEmail}>
                      <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.email !== targetEmail).map(e => (
                          <SelectItem key={e.email} value={e.email}>{e.name} — {e.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {opType === "withdraw" && (
                  <>
                    <div>
                      <Label>Destination phone</Label>
                      <Input value={destinationPhone} onChange={(e) => setDestinationPhone(e.target.value)} placeholder="e.g. 0752724165" />
                    </div>
                    <div>
                      <Label>Payout provider</Label>
                      <Select value={payoutProvider} onValueChange={(v) => setPayoutProvider(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gosentepay">GosentePay (auto)</SelectItem>
                          <SelectItem value="yo">Yo Payments (manual)</SelectItem>
                          <SelectItem value="cash">Cash (no gateway)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <Label>Reason (required, visible in audit)</Label>
                  <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Business justification..." />
                </div>

                {(opType === "debit" || opType === "transfer" || opType === "withdraw") && (
                  <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Allow overdraft draw</p>
                      <p className="text-xs text-muted-foreground">If enabled and wallet goes negative, a 2.75% access fee is auto-charged.</p>
                    </div>
                    <Switch checked={allowOverdraft} onCheckedChange={setAllowOverdraft} />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit for second admin approval
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending approvals ({pending.length})</CardTitle>
          <CardDescription>Requires a different administrator to approve.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && pending.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
          {pending.map(op => {
            const isSameAdmin = op.initiated_by_email === user?.email;
            return (
              <div key={op.id} className="flex flex-col md:flex-row md:items-center gap-3 border rounded-md p-3">
                <div className="flex items-center gap-2 min-w-[130px]">
                  {OP_ICONS[op.operation_type]}
                  <span className="font-medium capitalize">{op.operation_type}</span>
                </div>
                <div className="flex-1 text-sm">
                  <p><b>{op.target_name || op.target_email}</b> — UGX {Number(op.amount).toLocaleString()}
                    {op.operation_type === "transfer" && <> → {op.destination_name || op.destination_email}</>}
                    {op.operation_type === "withdraw" && <> → {op.destination_phone} ({op.payout_provider})</>}
                  </p>
                  <p className="text-xs text-muted-foreground">{op.reason}</p>
                  <p className="text-xs text-muted-foreground">Initiated by {op.initiated_by_name || op.initiated_by_email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReject(op)} disabled={approvingId === op.id}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(op)} disabled={isSameAdmin || approvingId === op.id}
                    title={isSameAdmin ? "You initiated this — another admin must approve" : ""}>
                    {approvingId === op.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                    Approve & Execute
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.slice(0, 20).map(op => (
            <div key={op.id} className="flex items-center gap-3 text-sm border-b py-2">
              {OP_ICONS[op.operation_type]}
              <span className="capitalize font-medium min-w-[80px]">{op.operation_type}</span>
              <span className="flex-1">{op.target_name || op.target_email} — UGX {Number(op.amount).toLocaleString()}</span>
              <Badge variant={
                op.status === "completed" ? "default" :
                op.status === "failed" ? "destructive" :
                op.status === "rejected" ? "secondary" : "outline"
              }>{op.status}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(op.created_at).toLocaleString()}</span>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}