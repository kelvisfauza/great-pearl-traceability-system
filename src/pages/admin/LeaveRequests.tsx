import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, Check, Mail, Pencil, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type LeaveRow = {
  id: string;
  requestedby: string;
  status: string;
  created_at: string;
  details: any;
};

const statusKey = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";
  return "pending";
};

const fmt = (d?: string) => {
  try { return d ? format(new Date(d), "EEE dd MMM yyyy") : "—"; } catch { return d || "—"; }
};

const daysBetween = (a: string, b: string) => {
  if (!a || !b) return 0;
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return diff >= 0 ? Math.round(diff) + 1 : 0;
};

const parseDetails = (d: any) => {
  if (typeof d === "string") { try { return JSON.parse(d); } catch { return {}; } }
  return d || {};
};

const LeaveRequests = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [editing, setEditing] = useState<LeaveRow | null>(null);
  const [acting, setActing] = useState<{ row: LeaveRow; action: "approved" | "rejected" } | null>(null);
  const [form, setForm] = useState({ start: "", end: "", days: 0, type: "", note: "" });
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("id, requestedby, status, created_at, details")
        .ilike("type", "leave")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).map((r: any) => ({ ...r, details: parseDetails(r.details) })) as LeaveRow[];
    },
  });

  const { data: names = {} } = useQuery({
    queryKey: ["leave-employee-names", rows.map((r) => r.requestedby).join(",")],
    enabled: rows.length > 0,
    queryFn: async () => {
      const emails = Array.from(new Set(rows.map((r) => r.requestedby)));
      const { data } = await supabase.from("employees").select("name, email, phone").in("email", emails);
      const map: Record<string, { name: string; phone?: string }> = {};
      (data || []).forEach((e: any) => (map[e.email] = { name: e.name, phone: e.phone }));
      return map;
    },
  });

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: rows.length };
    rows.forEach((r) => c[statusKey(r.status)]++);
    return c;
  }, [rows]);

  const visible = rows.filter((r) => tab === "all" || statusKey(r.status) === tab);

  const sourceLabel = (d: any) => {
    const v = (d?.submitted_via || "").toLowerCase();
    if (d?.teams_hr_message_id || v === "teams") return "Teams";
    if (v === "email") return "Email";
    return "System";
  };

  const openEdit = (row: LeaveRow) => {
    const d = row.details;
    setForm({ start: d.start_date || "", end: d.end_date || "", days: Number(d.days) || 0, type: d.leave_type || "", note: d.approval_note || "" });
    setEditing(row);
  };

  const sendEmail = async (row: LeaveRow, status: string, d: any) => {
    const name = names[row.requestedby]?.name?.split(" ")[0] || "there";
    const approved = status === "approved";
    const message = approved
      ? `Your ${d.leave_type || "leave"} request has been approved for ${d.days} day${d.days === 1 ? "" : "s"}:\n\n- From: ${fmt(d.start_date)}\n- To: ${fmt(d.end_date)}${d.approval_note ? `\n\nNote: ${d.approval_note}` : ""}\n\nWhile on leave the system will be in read-only mode for your account.`
      : `Your ${d.leave_type || "leave"} request (${fmt(d.start_date)} to ${fmt(d.end_date)}) was not approved.${d.approval_note ? `\n\nReason: ${d.approval_note}` : ""}\n\nPlease contact management if you have questions.`;
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "general-notification",
        recipientEmail: row.requestedby,
        idempotencyKey: `leave-${status}-${row.id}-${Date.now()}`,
        templateData: { title: approved ? "Your Leave Has Been Approved" : "Leave Request Update", recipientName: name, message },
      },
    });
    if (error || (data as any)?.ok === false) throw new Error((data as any)?.error || error?.message || "Email failed");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    const details = { ...editing.details, start_date: form.start, end_date: form.end, days: Number(form.days), leave_type: form.type, approval_note: form.note || undefined, edited_by: employee?.email, edited_at: new Date().toISOString() };
    const { error } = await supabase.from("approval_requests").update({ details, updated_at: new Date().toISOString() } as any).eq("id", editing.id);
    setBusy(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: "Leave request updated" });
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-leave-requests"] });
  };

  const decide = async () => {
    if (!acting) return;
    const { row, action } = acting;
    if (action === "rejected" && !form.note.trim()) {
      return toast({ title: "Reason required", description: "Please give a reason for rejecting this leave request.", variant: "destructive" });
    }
    setBusy(true);
    const details = { ...row.details, approval_note: form.note || row.details.approval_note, decided_by: employee?.email, decided_at: new Date().toISOString(), confirmation_email_sent: false };
    const update: any = { status: action, details, updated_at: new Date().toISOString() };
    if (action === "approved") { update.admin_approved = true; update.finance_approved = true; }
    const { error } = await supabase.from("approval_requests").update(update).eq("id", row.id);
    if (error) { setBusy(false); return toast({ title: "Could not update", description: error.message, variant: "destructive" }); }
    try {
      await sendEmail(row, action, details);
      await supabase.from("approval_requests").update({ details: { ...details, confirmation_email_sent: true, confirmation_email_at: new Date().toISOString() } } as any).eq("id", row.id);
      toast({ title: action === "approved" ? "Leave approved" : "Leave rejected", description: "Confirmation email sent." });
    } catch (e: any) {
      toast({ title: "Saved, but email failed", description: "Use Resend email to try again.", variant: "destructive" });
    }
    setBusy(false);
    setActing(null);
    qc.invalidateQueries({ queryKey: ["admin-leave-requests"] });
  };

  const resend = async (row: LeaveRow) => {
    try {
      await sendEmail(row, statusKey(row.status), row.details);
      await supabase.from("approval_requests").update({ details: { ...row.details, confirmation_email_sent: true, confirmation_email_at: new Date().toISOString() } } as any).eq("id", row.id);
      toast({ title: "Email sent" });
      qc.invalidateQueries({ queryKey: ["admin-leave-requests"] });
    } catch (e: any) {
      toast({ title: "Email failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Leave Requests" subtitle="All leave requests from the system, email and Teams">
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="card-modern p-8 text-center text-muted-foreground">No leave requests here.</div>
        ) : (
          <div className="grid gap-3">
            {visible.map((row) => {
              const d = row.details;
              const s = statusKey(row.status);
              return (
                <div key={row.id} className="card-modern p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{names[row.requestedby]?.name || row.requestedby}</p>
                      <p className="text-xs text-muted-foreground">{row.requestedby} · submitted {fmt(row.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{sourceLabel(d)}</Badge>
                      <Badge variant={s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary"}>{s}</Badge>
                      {s !== "pending" && (
                        <Badge variant="outline">{d.confirmation_email_sent ? "Email sent" : "Email not sent"}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-medium">{d.leave_type || "Leave"}</span>
                    <span className="text-muted-foreground">{fmt(d.start_date)} → {fmt(d.end_date)} · {d.days ?? "?"} day(s)</span>
                  </div>
                  {d.reason && <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{d.reason}</p>}
                  {d.approval_note && <p className="text-sm"><span className="font-medium">Note:</span> {d.approval_note}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                    {s !== "approved" && (
                      <Button size="sm" onClick={() => { setForm((f) => ({ ...f, note: d.approval_note || "" })); setActing({ row, action: "approved" }); }}><Check className="h-4 w-4 mr-1" />Approve</Button>
                    )}
                    {s !== "rejected" && (
                      <Button size="sm" variant="destructive" onClick={() => { setForm((f) => ({ ...f, note: "" })); setActing({ row, action: "rejected" }); }}><X className="h-4 w-4 mr-1" />Reject</Button>
                    )}
                    {s !== "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => resend(row)}><Mail className="h-4 w-4 mr-1" />Resend email</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit leave request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Leave type</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start date</Label><Input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value, days: daysBetween(e.target.value, form.end) })} /></div>
              <div><Label>End date</Label><Input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value, days: daysBetween(form.start, e.target.value) })} /></div>
            </div>
            <div><Label>Days</Label><Input type="number" min={0} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></div>
            <div><Label>Note to employee</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Sunday is a work day" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy || !form.start || !form.end}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!acting} onOpenChange={(o) => !o && setActing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{acting?.action === "approved" ? "Approve leave" : "Reject leave"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {acting && `${names[acting.row.requestedby]?.name || acting.row.requestedby}: ${fmt(acting.row.details.start_date)} → ${fmt(acting.row.details.end_date)} (${acting.row.details.days} days). A confirmation email will be sent.`}
          </p>
          <div><Label>{acting?.action === "approved" ? "Note (optional)" : "Reason"}</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActing(null)}>Cancel</Button>
            <Button variant={acting?.action === "approved" ? "default" : "destructive"} onClick={decide} disabled={busy || (acting?.action === "rejected" && !form.note.trim())}>
              {busy ? "Working…" : acting?.action === "approved" ? "Approve & email" : "Reject & email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LeaveRequests;
