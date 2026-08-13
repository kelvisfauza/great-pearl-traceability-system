import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import { COMPANY_EMAIL } from "@/utils/companyBrand";

const inquiryTypes = [
  { value: "coffee_sales", label: "Place an order / buy green coffee" },
  { value: "supplier", label: "Supply coffee to us" },
  { value: "general", label: "General inquiry" },
  { value: "feedback", label: "Newsletter / keep me updated" },
];

export default function InquiryForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "",
    type: "coffee_sales", quantity: "", message: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try {
      const label = inquiryTypes.find((t) => t.value === form.type)?.label ?? "Inquiry";
      const { data, error } = await supabase.functions.invoke("submit-support-ticket", {
        body: {
          customer_name: form.name.trim(),
          customer_email: form.email.trim(),
          customer_phone: form.phone.trim() || null,
          category: form.type,
          priority: form.type === "coffee_sales" ? "high" : "medium",
          subject: `Website inquiry — ${label}`,
          message:
            `Inquiry type: ${label}\n` +
            (form.company.trim() ? `Company: ${form.company.trim()}\n` : "") +
            (form.quantity.trim() ? `Quantity / volume: ${form.quantity.trim()}\n` : "") +
            `\n${form.message.trim()}`,
        },
      });
      if (error) throw error;
      const payload = data as { ok: boolean; ticket_code?: string; error?: string };
      if (!payload?.ok) throw new Error(payload?.error || "Submission failed");
      setRef(payload.ticket_code!);
      toast({ title: "Inquiry sent", description: `Reference ${payload.ticket_code}` });
    } catch (err) {
      toast({ title: "Could not send", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (ref) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h3 className="mt-3 text-lg font-medium">Thank you — we've got your inquiry</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your reference is <span className="font-mono font-semibold">{ref}</span>. Our team replies within one
          business day from {COMPANY_EMAIL}.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => { setRef(null); setForm({ name: "", email: "", phone: "", company: "", type: "coffee_sales", quantity: "", message: "" }); }}>
          Send another inquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="inq-name">Your name *</Label>
          <Input id="inq-name" required maxLength={120} value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="inq-email">Email *</Label>
          <Input id="inq-email" required type="email" maxLength={200} value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="inq-phone">Phone</Label>
          <Input id="inq-phone" maxLength={30} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="inq-company">Company</Label>
          <Input id="inq-company" maxLength={120} value={form.company} onChange={(e) => update("company", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>I'm writing about</Label>
          <Select value={form.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {inquiryTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="inq-qty">Quantity / volume (optional)</Label>
          <Input id="inq-qty" maxLength={100} placeholder="e.g. 2 x 20ft containers, Robusta screen 18" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="inq-msg">Message *</Label>
        <Textarea id="inq-msg" required rows={5} maxLength={5000} value={form.message} onChange={(e) => update("message", e.target.value)} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Sending…" : "Send inquiry"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Submissions are emailed to {COMPANY_EMAIL} and logged with a reference number.
      </p>
    </form>
  );
}
