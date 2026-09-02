import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, CalendarClock, PackageX, Handshake, UserX, Wallet,
  RefreshCw, Printer, CheckCircle2, ListChecks, Truck,
  Phone, MessageSquare, ExternalLink, Loader2,
} from "lucide-react";

type Severity = "critical" | "warning" | "info";

type ActionItem = {
  id: string;
  group: string;
  title: string;
  detail: string;
  severity: Severity;
  due?: string;
  supplierId?: string;
  supplierName?: string;
  phone?: string | null;
  smsMessage?: string;
};

const DAY = 86400000;
const days = (d?: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY) : null);
const until = (d?: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / DAY) : null);
const fmt = (n: number) => new Intl.NumberFormat("en-UG").format(Math.round(n || 0));

const sevStyles: Record<Severity, string> = {
  critical: "border-destructive/40 bg-destructive/5",
  warning: "border-amber-500/40 bg-amber-500/5",
  info: "border-primary/30 bg-primary/5",
};

const DAILY_TASKS = [
  "Review yesterday's purchases against the store intake records",
  "Confirm today's approved buying price is published to all stations",
  "Follow up on suppliers who booked coffee but have not delivered",
  "Update supplier profiles captured in the field (phone, bank, origin)",
  "Reconcile the Comprehensive Report variances (purchases vs clearance vs sales)",
  "Chase outstanding supplier advances due for recovery",
];

const WEEKLY_TASKS = [
  "Review supplier performance ranking and flag under-performers",
  "Renegotiate prices with the top 10 suppliers by volume",
  "Review buyer contract fulfilment and plan the coming week's dispatch",
  "Close or extend expired bookings",
  "Verify all supplier contracts are approved and filed with signed copies",
  "Submit the weekly procurement summary to management",
];

const ProcurementActionCenter = () => {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<ActionItem | null>(null);
  const [draft, setDraft] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const defaultMessage = (item: ActionItem) =>
    item.smsMessage || `Dear ${item.supplierName || item.title}, please contact Great Agro Coffee procurement on 0393101103.`;

  const openPreview = (item: ActionItem) => {
    if (!item.phone) {
      toast({ title: "No phone number", description: `${item.title} has no phone number on file.`, variant: "destructive" });
      return;
    }
    setDraft(defaultMessage(item));
    setPreview(item);
  };

  const sendReminder = async () => {
    const item = preview;
    if (!item || !item.phone) return;
    const message = draft.trim();
    if (!message) {
      toast({ title: "Empty message", description: "Type the message to send.", variant: "destructive" });
      return;
    }
    setSending(item.id);
    try {
      const { error } = await supabase.functions.invoke("send-sms", {
        body: {
          phone: item.phone,
          message,
          userName: item.supplierName || item.title,
          messageType: "procurement_reminder",
        },
      });
      if (error) throw error;
      setSent(p => ({ ...p, [item.id]: true }));
      setPreview(null);
      toast({ title: "Reminder sent", description: `SMS delivered to ${item.title} via BulkSMS.` });
    } catch (e: any) {
      toast({ title: "Reminder failed", description: e?.message || "Could not send the SMS.", variant: "destructive" });
    } finally {
      setSending(null);
    }
  };


  const { data, isFetching, refetch } = useQuery({
    queryKey: ["procurement-action-center"],
    queryFn: async () => {
      const [suppliers, records, bookings, supContracts, buyContracts, advances] = await Promise.all([
        supabase.from("suppliers").select("id,name,phone,origin,bank_name,account_number,date_registered").limit(2000),
        supabase.from("coffee_records").select("id,supplier_id,supplier_name,date,kilograms,coffee_type").order("date", { ascending: false }).limit(3000),
        supabase.from("coffee_bookings").select("id,supplier_name,coffee_type,booked_quantity_kg,delivered_quantity_kg,remaining_quantity_kg,expected_delivery_date,expiry_date,status").limit(1000),
        supabase.from("supplier_contracts").select("id,supplier_name,kilograms_expected,status,approval_status,date,advance_given").limit(1000),
        supabase.from("buyer_contracts").select("id,contract_ref,buyer_name,total_quantity,allocated_quantity,delivery_period_end,status").limit(1000),
        supabase.from("supplier_advances").select("id,supplier_id,amount_ugx,outstanding_ugx,is_closed,issued_at").limit(1000),
      ]);
      return {
        suppliers: suppliers.data || [],
        records: records.data || [],
        bookings: bookings.data || [],
        supContracts: supContracts.data || [],
        buyContracts: buyContracts.data || [],
        advances: advances.data || [],
      };
    },
    staleTime: 60_000,
  });

  const items = useMemo<ActionItem[]>(() => {
    if (!data) return [];
    const out: ActionItem[] = [];

    // Last delivery per supplier
    const last = new Map<string, string>();
    for (const r of data.records as any[]) {
      const key = r.supplier_id || r.supplier_name;
      if (!key) continue;
      if (!last.has(key)) last.set(key, r.date);
    }

    for (const s of data.suppliers as any[]) {
      const d = days(last.get(s.id) || last.get(s.name) || null);
      if (d === null) {
        const reg = days(s.date_registered);
        if (reg !== null && reg > 14) {
          out.push({
            id: `nodel-${s.id}`, group: "Dormant suppliers", severity: "warning",
            title: s.name, detail: `Registered ${reg} days ago with no delivery recorded yet — call and confirm intent.`,
            supplierId: s.id, supplierName: s.name, phone: s.phone,
            smsMessage: `Dear ${s.name}, you registered with Great Agro Coffee but we have not yet received any delivery from you. Please contact procurement on 0393101103 to confirm your supply plan.`,
          });
        }
      } else if (d >= 21) {
        out.push({
          id: `inactive-${s.id}`, group: "Dormant suppliers",
          severity: d >= 45 ? "critical" : "warning",
          title: s.name, detail: `No delivery for ${d} days — last supply ${new Date(last.get(s.id) || last.get(s.name)!).toLocaleDateString()}.`,
          supplierId: s.id, supplierName: s.name, phone: s.phone,
          smsMessage: `Dear ${s.name}, we have not received coffee from you in ${d} days. Great Agro Coffee is buying today. Please call procurement on 0393101103 for the current price.`,
        });
      }
      const missing = [
        !s.phone && "phone",
        !s.origin && "origin",
        !s.bank_name && "bank name",
        !s.account_number && "account number",
      ].filter(Boolean);
      if (missing.length) {
        out.push({
          id: `profile-${s.id}`, group: "Incomplete supplier profiles", severity: "info",
          title: s.name, detail: `Missing ${missing.join(", ")} — complete before the next payment run.`,
          supplierId: s.id, supplierName: s.name, phone: s.phone,
          smsMessage: `Dear ${s.name}, please share your ${missing.join(", ")} with Great Agro Coffee procurement on 0393101103 so we can process your payments without delay.`,
        });
      }
    }

    const byName = new Map((data.suppliers as any[]).map(s => [String(s.name || "").trim().toLowerCase(), s]));
    const findSupplier = (name?: string) => byName.get(String(name || "").trim().toLowerCase());

    for (const b of data.bookings as any[]) {
      const remaining = Number(b.remaining_quantity_kg ?? (Number(b.booked_quantity_kg || 0) - Number(b.delivered_quantity_kg || 0)));
      if (remaining <= 0 || String(b.status).toLowerCase() === "cancelled") continue;
      const dueIn = until(b.expected_delivery_date);
      const expIn = until(b.expiry_date);
      const sup = findSupplier(b.supplier_name);
      if (dueIn !== null && dueIn < 0) {
        out.push({
          id: `bk-late-${b.id}`, group: "Overdue bookings", severity: "critical",
          title: `${b.supplier_name} — ${b.coffee_type}`,
          detail: `${fmt(remaining)} kg undelivered, ${Math.abs(dueIn)} day(s) past the expected delivery date.`,
          due: b.expected_delivery_date,
          supplierId: sup?.id, supplierName: b.supplier_name, phone: sup?.phone,
          smsMessage: `Dear ${b.supplier_name}, your booking of ${fmt(remaining)} kg ${b.coffee_type} is ${Math.abs(dueIn)} day(s) overdue. Please deliver or contact Great Agro Coffee procurement on 0393101103.`,
        });
      } else if (expIn !== null && expIn <= 7) {
        out.push({
          id: `bk-exp-${b.id}`, group: "Bookings expiring soon", severity: expIn <= 2 ? "critical" : "warning",
          title: `${b.supplier_name} — ${b.coffee_type}`,
          detail: `${fmt(remaining)} kg outstanding, booking expires in ${Math.max(expIn, 0)} day(s).`,
          due: b.expiry_date,
          supplierId: sup?.id, supplierName: b.supplier_name, phone: sup?.phone,
          smsMessage: `Dear ${b.supplier_name}, your booking of ${fmt(remaining)} kg ${b.coffee_type} expires in ${Math.max(expIn, 0)} day(s). Please deliver in time or call Great Agro Coffee on 0393101103.`,
        });
      }
    }

    for (const c of data.buyContracts as any[]) {
      const total = Number(c.total_quantity || 0);
      if (!total || String(c.status).toLowerCase() === "completed") continue;
      const pct = (Number(c.allocated_quantity || 0) / total) * 100;
      const endIn = until(c.delivery_period_end);
      if (pct < 50 && endIn !== null && endIn <= 21) {
        out.push({
          id: `bc-${c.id}`, group: "Buyer contracts at risk", severity: endIn <= 7 ? "critical" : "warning",
          title: `${c.contract_ref || "Contract"} — ${c.buyer_name}`,
          detail: `Only ${pct.toFixed(0)}% allocated (${fmt(Number(c.allocated_quantity || 0))} / ${fmt(total)} kg) with ${endIn} day(s) of the delivery window left.`,
          due: c.delivery_period_end,
        });
      }
    }

    for (const c of data.supContracts as any[]) {
      if (String(c.approval_status || "").toLowerCase() === "pending") {
        const sup = findSupplier(c.supplier_name);
        out.push({
          id: `sc-${c.id}`, group: "Supplier contracts pending approval", severity: "warning",
          title: c.supplier_name,
          detail: `${fmt(Number(c.kilograms_expected || 0))} kg contract awaiting approval since ${c.date ? new Date(c.date).toLocaleDateString() : "—"}.`,
          supplierId: sup?.id, supplierName: c.supplier_name, phone: sup?.phone,
          smsMessage: `Dear ${c.supplier_name}, your supply contract with Great Agro Coffee is being processed. Our procurement team will contact you shortly on 0393101103.`,
        });
      }
    }

    const supplierById = new Map((data.suppliers as any[]).map(s => [s.id, s]));
    for (const a of data.advances as any[]) {
      const outstanding = Number(a.outstanding_ugx ?? a.amount_ugx ?? 0);
      const age = days(a.issued_at);
      if (!a.is_closed && outstanding > 0 && age !== null && age >= 30) {
        const sup: any = supplierById.get(a.supplier_id);
        out.push({
          id: `adv-${a.id}`, group: "Advances due for recovery",
          severity: age >= 60 ? "critical" : "warning",
          title: sup?.name || "Supplier",
          detail: `UGX ${fmt(outstanding)} outstanding for ${age} days — recover through deliveries or enforce the signed undertaking.`,
          supplierId: a.supplier_id, supplierName: sup?.name, phone: sup?.phone,
          smsMessage: `Dear ${sup?.name || "Supplier"}, your advance balance of UGX ${fmt(outstanding)} with Great Agro Coffee has been outstanding for ${age} days. Please deliver coffee or settle it. Procurement: 0393101103.`,
        });
      }
    }

    const todayKg = (data.records as any[])
      .filter(r => new Date(r.date).toDateString() === new Date().toDateString())
      .reduce((s, r) => s + Number(r.kilograms || 0), 0);
    if (todayKg === 0) {
      out.push({
        id: "no-purchase-today", group: "Daily intake", severity: "info",
        title: "No purchases recorded today",
        detail: "Confirm with the stores and field teams before close of business.",
      });
    }

    const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
    return out.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [data]);

  const grouped = useMemo(() => {
    const m = new Map<string, ActionItem[]>();
    for (const i of items) m.set(i.group, [...(m.get(i.group) || []), i]);
    return Array.from(m.entries());
  }, [items]);

  const counts = useMemo(() => ({
    critical: items.filter(i => i.severity === "critical").length,
    warning: items.filter(i => i.severity === "warning").length,
    info: items.filter(i => i.severity === "info").length,
  }), [items]);

  const groupIcon = (g: string) => {
    if (g.includes("Dormant")) return UserX;
    if (g.includes("Overdue")) return PackageX;
    if (g.includes("expiring")) return CalendarClock;
    if (g.includes("Buyer")) return Handshake;
    if (g.includes("Advances")) return Wallet;
    if (g.includes("Daily")) return Truck;
    return AlertTriangle;
  };

  const checklist = (title: string, list: string[], prefix: string) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4" />{title}</CardTitle>
        <CardDescription>Tick items as the team completes them. Resets each session.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.map((t, idx) => {
          const key = `${prefix}-${idx}`;
          return (
            <label key={key} className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox checked={!!done[key]} onCheckedChange={(v) => setDone(p => ({ ...p, [key]: !!v }))} />
              <span className={done[key] ? "line-through text-muted-foreground" : ""}>{t}</span>
            </label>
          );
        })}
        <div className="pt-2 text-xs text-muted-foreground">
          {list.filter((_, i) => done[`${prefix}-${i}`]).length} of {list.length} completed
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Procurement Action Center</h2>
          <p className="text-sm text-muted-foreground">Live follow-ups generated from suppliers, bookings, contracts and advances.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Urgent", value: counts.critical, cls: "text-destructive" },
          { label: "Follow up", value: counts.warning, cls: "text-amber-600" },
          { label: "Housekeeping", value: counts.info, cls: "text-primary" },
          { label: "Total actions", value: items.length, cls: "text-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="daily">Daily tasks</TabsTrigger>
          <TabsTrigger value="weekly">Weekly tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          {grouped.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              {isFetching ? "Loading procurement signals…" : "Nothing outstanding. Procurement is fully up to date."}
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {grouped.map(([group, list]) => {
                const Icon = groupIcon(group);
                return (
                  <Card key={group}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon className="h-4 w-4" />{group}
                        <Badge variant="secondary">{list.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className={list.length > 6 ? "h-72 pr-3" : ""}>
                        <div className="space-y-2">
                          {list.map(i => (
                            <div key={i.id} className={`rounded-md border p-3 ${sevStyles[i.severity]}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-sm">{i.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{i.detail}</p>
                                </div>
                                <Badge variant={i.severity === "critical" ? "destructive" : "outline"} className="shrink-0 capitalize">
                                  {i.severity === "critical" ? "Urgent" : i.severity === "warning" ? "Follow up" : "Info"}
                                </Badge>
                              </div>
                              {(i.phone || i.supplierId) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {i.phone && (
                                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                      <a href={`tel:${i.phone}`}><Phone className="h-3 w-3 mr-1" />Call {i.phone}</a>
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant={sent[i.id] ? "secondary" : "default"}
                                    className="h-7 text-xs"
                                    disabled={!i.phone || sending === i.id}
                                    onClick={() => openPreview(i)}
                                  >
                                    {sending === i.id
                                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      : <MessageSquare className="h-3 w-3 mr-1" />}
                                    {sent[i.id] ? "Reminder sent" : "Send reminder"}
                                  </Button>
                                  {i.supplierId && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() => navigate(`/suppliers?supplier=${i.supplierId}`)}
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1" />Open profile
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="daily" className="mt-4">{checklist("Daily procurement routine", DAILY_TASKS, "d")}</TabsContent>
        <TabsContent value="weekly" className="mt-4">{checklist("Weekly procurement routine", WEEKLY_TASKS, "w")}</TabsContent>
      </Tabs>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review message before sending</DialogTitle>
            <DialogDescription>
              To {preview?.supplierName || preview?.title} · {preview?.phone} · via BulkSMS
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {draft.length} characters · {Math.max(1, Math.ceil(draft.length / 160))} SMS part(s)
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
            <Button onClick={sendReminder} disabled={!!sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1" />}
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ProcurementActionCenter;
