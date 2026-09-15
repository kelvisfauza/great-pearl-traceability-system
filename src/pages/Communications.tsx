import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Megaphone, Send, Loader2, Users, Truck, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const QUICK_TEMPLATES = [
  {
    label: "Pause coffee purchases",
    audience: "suppliers",
    subject: "Temporary pause on coffee purchases",
    message:
      "Great Agro Coffee: We are temporarily pausing coffee purchases starting today until further notice. Please do not deliver coffee until we inform you. We will notify you as soon as buying resumes. Thank you.",
  },
  {
    label: "Buying resumes",
    audience: "suppliers",
    subject: "Coffee buying has resumed",
    message:
      "Great Agro Coffee: Coffee buying has resumed at our stores. You are welcome to deliver your coffee. Call the office for today's prices. Thank you.",
  },
  {
    label: "Store closed / holiday",
    audience: "both",
    subject: "Store closure notice",
    message:
      "Great Agro Coffee: Our stores will be closed on [date] for [reason]. Normal operations resume on [date]. Thank you for your understanding.",
  },
  {
    label: "Staff notice",
    audience: "employees",
    subject: "Staff notice",
    message: "Great Agro Coffee: [Write your notice to staff here].",
  },
];

interface BroadcastRow {
  id: string;
  audience: string;
  channels: string[];
  subject: string | null;
  message: string;
  sms_recipients: number;
  sms_sent: number;
  sms_failed: number;
  email_recipients: number;
  emails_sent: number;
  emails_failed: number;
  status: string;
  created_by_name: string | null;
  created_at: string;
}

const AUDIENCE_LABEL: Record<string, string> = {
  suppliers: "Suppliers & farmers",
  employees: "Employees",
  both: "Suppliers & employees",
  test: "Test message",
};

const Communications = () => {
  const { employee } = useAuth();
  const [audience, setAudience] = useState("suppliers");
  const [sendSms, setSendSms] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<BroadcastRow[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("broadcast_communications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);
    setHistory((data as any) || []);
  };

  useEffect(() => { loadHistory(); }, []);

  const segments = Math.max(1, Math.ceil(message.length / 160));

  const applyTemplate = (t: typeof QUICK_TEMPLATES[number]) => {
    setAudience(t.audience);
    setSubject(t.subject);
    setMessage(t.message);
  };

  const invokeSend = async (test: boolean) => {
    if (!message.trim()) {
      toast.error("Please write the message first");
      return;
    }
    if (test && !testPhone.trim()) {
      toast.error("Enter a phone number to test with");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: {
          audience,
          sendSms,
          sendEmail,
          subject: subject.trim() || "Company Communication",
          message: message.trim(),
          testPhone: test ? testPhone.trim() : null,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Sending failed");

      if (test) {
        toast.success(`Test message sent to ${testPhone}`);
      } else {
        toast.success(
          `Sent to ${data.smsSent} phone${data.smsSent === 1 ? "" : "s"}` +
            (data.emailRecipients ? ` and ${data.emailsSent} email${data.emailsSent === 1 ? "" : "s"}` : "") +
            (data.smsFailed || data.emailsFailed ? ` (${data.smsFailed + data.emailsFailed} did not go through)` : "")
        );
        setMessage("");
        setSubject("");
      }
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Could not send the message");
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Communications
          </h1>
          <p className="text-muted-foreground text-sm">
            Send one message to all your suppliers, all your staff, or both — by text message and email.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>New message</CardTitle>
              <CardDescription>Choose who should receive it and how it should reach them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((t) => (
                  <Button key={t.label} variant="outline" size="sm" onClick={() => applyTemplate(t)}>
                    {t.label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Send to</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suppliers">Suppliers & farmers</SelectItem>
                      <SelectItem value="employees">Employees</SelectItem>
                      <SelectItem value="both">Suppliers & employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>How to send</Label>
                  <div className="flex items-center gap-5 h-10">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={sendSms} onCheckedChange={(v) => setSendSms(!!v)} />
                      Text message
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} />
                      Email
                    </label>
                  </div>
                </div>
              </div>

              {sendEmail && (
                <div className="space-y-2">
                  <Label>Email subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Temporary pause on coffee purchases"
                    maxLength={150}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={7}
                  maxLength={900}
                  placeholder="e.g. Great Agro Coffee: We are pausing coffee purchases from today until further notice. Please do not deliver coffee until we inform you."
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Keep it short and plain — no emojis. Each 160 characters is one text credit.</span>
                  <span>{message.length}/900 · {segments} text{segments === 1 ? "" : "s"} per person</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2 border-t">
                <div className="space-y-2 flex-1">
                  <Label className="text-xs uppercase text-muted-foreground">Try it on one number first</Label>
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                  />
                </div>
                <Button variant="outline" onClick={() => invokeSend(true)} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                  <span className="ml-2">Send test</span>
                </Button>
                <Button onClick={() => setConfirmOpen(true)} disabled={sending || !message.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="ml-2">Send to everyone</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recently sent</CardTitle>
              <CardDescription>Your last 25 company messages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[560px] overflow-auto">
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
              )}
              {history.map((h) => (
                <div key={h.id} className="p-3 rounded border bg-muted/30 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      {h.audience === "employees" ? <Users className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                      {AUDIENCE_LABEL[h.audience] || h.audience}
                    </Badge>
                    <Badge
                      variant={h.status === "sent" ? "default" : h.status === "failed" ? "destructive" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {h.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-3 break-words">{h.message}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {h.sms_sent}/{h.sms_recipients} texts
                    {h.email_recipients > 0 && ` · ${h.emails_sent}/${h.email_recipients} emails`}
                    {h.created_by_name && ` · by ${h.created_by_name}`}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this to everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              This goes out to {AUDIENCE_LABEL[audience].toLowerCase()} straight away
              {sendSms && sendEmail ? " by text message and email" : sendSms ? " by text message" : " by email"}.
              It cannot be recalled once sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); invokeSend(false); }} disabled={sending}>
              {sending ? "Sending..." : "Yes, send now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Communications;
