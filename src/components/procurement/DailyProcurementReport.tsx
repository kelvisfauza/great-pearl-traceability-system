import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

const kampalaToday = () => {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
};

type FormState = {
  suppliers_visited: string;
  kilograms_purchased: string;
  average_price: string;
  deliveries_expected: string;
  issues: string;
  observations: string;
  actions_taken: string;
  plan_next_day: string;
  market_notes: string;
};

const EMPTY: FormState = {
  suppliers_visited: "",
  kilograms_purchased: "",
  average_price: "",
  deliveries_expected: "",
  issues: "",
  observations: "",
  actions_taken: "",
  plan_next_day: "",
  market_notes: "",
};

const DailyProcurementReport = () => {
  const { toast } = useToast();
  const today = useMemo(kampalaToday, []);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<any | null>(null);
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userEmail = auth.user?.email || "";
        setEmail(userEmail);

        if (userEmail) {
          const { data: emp } = await supabase
            .from("employees")
            .select("name")
            .ilike("email", userEmail)
            .maybeSingle();
          setName(emp?.name || auth.user?.user_metadata?.name || userEmail);

          const { data: report } = await supabase
            .from("procurement_daily_reports")
            .select("*")
            .eq("report_date", today)
            .ilike("submitted_by_email", userEmail)
            .maybeSingle();

          if (report) {
            setExisting(report);
            setForm({
              suppliers_visited: String(report.suppliers_visited ?? ""),
              kilograms_purchased: String(report.kilograms_purchased ?? ""),
              average_price: String(report.average_price ?? ""),
              deliveries_expected: report.deliveries_expected || "",
              issues: report.issues || "",
              observations: report.observations || "",
              actions_taken: report.actions_taken || "",
              plan_next_day: report.plan_next_day || "",
              market_notes: report.market_notes || "",
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [today]);

  const set = (key: keyof FormState) => (e: any) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const submit = async () => {
    if (!email) {
      toast({ title: "Not signed in", description: "Sign in to file the report.", variant: "destructive" });
      return;
    }
    if (!form.observations.trim()) {
      toast({ title: "Observations required", description: "Describe what you observed today.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        report_date: today,
        submitted_by_email: email,
        submitted_by_name: name,
        suppliers_visited: Number(form.suppliers_visited || 0),
        kilograms_purchased: Number(form.kilograms_purchased || 0),
        average_price: Number(form.average_price || 0),
        deliveries_expected: form.deliveries_expected.trim() || null,
        issues: form.issues.trim() || null,
        observations: form.observations.trim(),
        actions_taken: form.actions_taken.trim() || null,
        plan_next_day: form.plan_next_day.trim() || null,
        market_notes: form.market_notes.trim() || null,
      };

      let reportId = existing?.id as string | undefined;

      if (reportId) {
        const { error } = await supabase
          .from("procurement_daily_reports")
          .update(payload)
          .eq("id", reportId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("procurement_daily_reports")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        reportId = data.id;
      }

      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        "procurement-daily-report",
        { body: { reportId } },
      );
      if (sendError) throw sendError;

      const { data: refreshed } = await supabase
        .from("procurement_daily_reports")
        .select("*")
        .eq("id", reportId!)
        .maybeSingle();
      setExisting(refreshed);

      if (sendResult?.ok) {
        toast({ title: "Report filed", description: `Sent to ${sendResult.sent} admin email(s) for review.` });
      } else {
        toast({
          title: "Report saved",
          description: sendResult?.error || "Saved, but the email could not be sent. Administration can still view it.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Could not file report", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Daily Comprehensive Report
            </CardTitle>
            <CardDescription>
              Mandatory every working day — submitted straight to the admin emails for review.
            </CardDescription>
          </div>
          {loading ? null : existing ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Filed {existing.emailed_at ? "& emailed" : ""} today
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Not filed today
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="dpr-suppliers">Suppliers visited / engaged</Label>
            <Input id="dpr-suppliers" type="number" min="0" value={form.suppliers_visited} onChange={set("suppliers_visited")} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dpr-kg">Kilograms purchased</Label>
            <Input id="dpr-kg" type="number" min="0" value={form.kilograms_purchased} onChange={set("kilograms_purchased")} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dpr-price">Average price (UGX/kg)</Label>
            <Input id="dpr-price" type="number" min="0" value={form.average_price} onChange={set("average_price")} placeholder="0" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dpr-obs">Observations <span className="text-destructive">*</span></Label>
          <Textarea id="dpr-obs" rows={4} value={form.observations} onChange={set("observations")}
            placeholder="What did you observe in the field and at the stores today — supplier behaviour, quality, competition, prices..." />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dpr-issues">Issues / challenges</Label>
            <Textarea id="dpr-issues" rows={3} value={form.issues} onChange={set("issues")} placeholder="Anything blocking procurement today." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dpr-actions">Actions taken</Label>
            <Textarea id="dpr-actions" rows={3} value={form.actions_taken} onChange={set("actions_taken")} placeholder="Calls made, reminders sent, contracts followed up." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dpr-deliveries">Deliveries expected</Label>
            <Textarea id="dpr-deliveries" rows={3} value={form.deliveries_expected} onChange={set("deliveries_expected")} placeholder="Supplier, quantity and expected date." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dpr-market">Market notes</Label>
            <Textarea id="dpr-market" rows={3} value={form.market_notes} onChange={set("market_notes")} placeholder="Prevailing market prices and competitor activity." />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dpr-plan">Plan for tomorrow</Label>
          <Textarea id="dpr-plan" rows={3} value={form.plan_next_day} onChange={set("plan_next_day")} placeholder="Priorities and supplier visits planned." />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {existing ? "Update & resend to admins" : "Submit to admins"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Filing as {name || email || "—"} for {new Date(today).toLocaleDateString("en-GB")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyProcurementReport;
