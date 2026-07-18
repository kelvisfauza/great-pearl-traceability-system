import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, PlusCircle, Check, X } from "lucide-react";

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function BudgetManagement() {
  const { user } = useAuth();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Season form
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");

  // Allocation form
  const [openAlloc, setOpenAlloc] = useState(false);
  const [aEmployee, setAEmployee] = useState("");
  const [aSeason, setASeason] = useState("");
  const [aCategory, setACategory] = useState("");
  const [aDescription, setADescription] = useState("");
  const [aAmount, setAAmount] = useState("");
  const [aNotes, setANotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const [s, e, a, r] = await Promise.all([
      supabase.from("budget_seasons").select("*").order("start_date", { ascending: false }),
      supabase.from("employees").select("id, auth_user_id, name, email").order("name"),
      supabase.from("budget_allocations").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("budget_withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setSeasons(s.data || []);
    setEmployees(e.data || []);
    setAllocations(a.data || []);
    setRequests(r.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const employeeMap = new Map(employees.map((e) => [e.auth_user_id || e.id, e]));
  const empLabel = (id: string) => {
    const e = employeeMap.get(id);
    return e ? `${e.name} (${e.email})` : id.slice(0, 8);
  };

  const createSeason = async () => {
    if (!seasonName || !seasonStart || !seasonEnd) return toast.error("Fill all season fields");
    const { error } = await supabase.from("budget_seasons").insert({
      name: seasonName, start_date: seasonStart, end_date: seasonEnd, created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Season created");
    setSeasonName(""); setSeasonStart(""); setSeasonEnd("");
    load();
  };

  const allocate = async () => {
    if (!aEmployee || !aCategory || !aAmount) return toast.error("Fill required fields");
    const amt = Number(aAmount);
    if (!amt || amt <= 0) return toast.error("Invalid amount");
    setSubmitting(true);
    const emp = employees.find((e) => e.id === aEmployee);
    const empUid = emp?.auth_user_id || emp?.id;
    const { error } = await supabase.rpc("allocate_budget_funds", {
      _employee_id: empUid, _season_id: aSeason || null,
      _category: aCategory, _description: aDescription || null,
      _amount: amt, _notes: aNotes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Funds allocated to budget wallet");
    setOpenAlloc(false);
    setAEmployee(""); setACategory(""); setADescription(""); setAAmount(""); setANotes("");
    load();
  };

  const approve = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("budget-approve-withdrawal", { body: { request_id: id } });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Approval failed");
      const stage = (data as any).stage;
      if (stage === "completed") toast.success("Fully approved and payout dispatched");
      else toast.success("First approval recorded — awaiting second admin");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    }
  };

  const submitReject = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) return toast.error("Provide a rejection reason");
    const { error } = await supabase.rpc("reject_budget_withdrawal", { _request_id: rejectId, _reason: rejectReason.trim() });
    if (error) return toast.error(error.message);
    toast.success("Request rejected");
    setRejectId(null); setRejectReason("");
    load();
  };

  const statusColor = (s: string) => ({
    pending: "bg-yellow-100 text-yellow-800",
    approved_1: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    failed: "bg-red-100 text-red-800",
  } as any)[s] || "bg-gray-100 text-gray-800";

  const pending = requests.filter((r) => r.status === "pending" || r.status === "approved_1");

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Budget Management</h1>
        <p className="text-muted-foreground text-sm">Allocate season budgets to employees and approve budget withdrawals. Every withdrawal requires two distinct administrators.</p>
      </div>

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals">Pending Approvals {pending.length > 0 && <Badge className="ml-2">{pending.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="history">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <Card>
            <CardHeader><CardTitle>Pending Budget Withdrawals</CardTitle><CardDescription>Two distinct admins are required to release funds.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {pending.map((r) => (
                <div key={r.id} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">{fmt(r.amount)} — {r.reason}</div>
                      <div className="text-sm">Requester: {empLabel(r.employee_id)}</div>
                      <div className="text-sm">To: {r.recipient_name}{r.recipient_phone ? ` • ${r.recipient_phone}` : ""}</div>
                      <div className="text-sm">Mode: {r.payout_mode}{r.provider ? ` (${r.provider})` : ""}</div>
                      {r.receipt_url && <a className="text-xs underline" href="#" onClick={async (e) => {
                        e.preventDefault();
                        const { data } = await supabase.storage.from("budget-receipts").createSignedUrl(r.receipt_url, 60);
                        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                      }}>View receipt</a>}
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                      <Badge className={statusColor(r.status)}>{r.status === "approved_1" ? `1 of 2 approved (by ${empLabel(r.first_approver_id)})` : "Awaiting first approval"}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approve(r.id)} disabled={r.employee_id === user?.id || r.first_approver_id === user?.id}>
                        <Check className="w-4 h-4 mr-1" /> {r.status === "approved_1" ? "Final approve + disburse" : "Approve"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectId(r.id)}><X className="w-4 h-4 mr-1" /> Reject</Button>
                    </div>
                  </div>
                  {r.employee_id === user?.id && <p className="text-xs text-red-600 mt-2">You cannot approve your own request.</p>}
                  {r.first_approver_id === user?.id && <p className="text-xs text-red-600 mt-2">You already gave the first approval — a different admin must give the second.</p>}
                </div>
              ))}
              {pending.length === 0 && <p className="text-muted-foreground text-sm">No pending budget withdrawals.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div><CardTitle>Budget Allocations</CardTitle><CardDescription>Approved budget lines credited to employee budget wallets.</CardDescription></div>
              <Button onClick={() => setOpenAlloc(true)}><PlusCircle className="w-4 h-4 mr-2" /> Allocate Funds</Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Allocated</th>
                  <th className="text-right p-2">Spent</th>
                  <th className="text-right p-2">Remaining</th>
                  <th className="text-left p-2">Season</th>
                </tr></thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="p-2">{empLabel(a.employee_id)}</td>
                      <td className="p-2">{a.category}<div className="text-xs text-muted-foreground">{a.description}</div></td>
                      <td className="p-2 text-right">{fmt(a.allocated_amount)}</td>
                      <td className="p-2 text-right">{fmt(a.spent_amount)}</td>
                      <td className="p-2 text-right font-semibold">{fmt(Number(a.allocated_amount) - Number(a.spent_amount))}</td>
                      <td className="p-2">{seasons.find((s) => s.id === a.season_id)?.name || "—"}</td>
                    </tr>
                  ))}
                  {allocations.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground p-4">No allocations yet</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasons">
          <Card>
            <CardHeader><CardTitle>Budget Seasons</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-4 items-end">
                <div><Label>Name</Label><Input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="Season 2026A" /></div>
                <div><Label>Start</Label><Input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} /></div>
                <div><Label>End</Label><Input type="date" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} /></div>
                <Button onClick={createSeason}>Create Season</Button>
              </div>
              <div className="space-y-2">
                {seasons.map((s) => (
                  <div key={s.id} className="p-3 border rounded flex justify-between">
                    <div><div className="font-semibold">{s.name}</div><div className="text-xs text-muted-foreground">{s.start_date} → {s.end_date}</div></div>
                    <Badge>{s.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>All Withdrawal Requests</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-left p-2">Mode</th>
                  <th className="text-left p-2">Status</th>
                </tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="p-2">{empLabel(r.employee_id)}</td>
                      <td className="p-2 text-right">{fmt(r.amount)}</td>
                      <td className="p-2">{r.reason}</td>
                      <td className="p-2">{r.payout_mode}</td>
                      <td className="p-2"><Badge className={statusColor(r.status)}>{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Allocation Modal */}
      <Dialog open={openAlloc} onOpenChange={setOpenAlloc}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allocate Budget Funds</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee *</Label>
              <Select value={aEmployee} onValueChange={setAEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Season (optional)</Label>
              <Select value={aSeason} onValueChange={setASeason}>
                <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Category *</Label><Input value={aCategory} onChange={(e) => setACategory(e.target.value)} placeholder="e.g. Field Purchases, Fuel, Labour" /></div>
            <div><Label>Description</Label><Input value={aDescription} onChange={(e) => setADescription(e.target.value)} /></div>
            <div><Label>Amount (UGX) *</Label><Input type="number" value={aAmount} onChange={(e) => setAAmount(e.target.value)} /></div>
            <div><Label>Notes / Conditions</Label><Textarea value={aNotes} onChange={(e) => setANotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAlloc(false)}>Cancel</Button>
            <Button onClick={allocate} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Allocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Budget Withdrawal</DialogTitle></DialogHeader>
          <div><Label>Reason *</Label><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}