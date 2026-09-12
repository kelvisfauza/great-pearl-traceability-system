import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MinusCircle } from "lucide-react";

interface Employee { id: string; name: string; email: string; phone: string | null }

const REASONS = [
  { code: "undertime", label: "Undertime" },
  { code: "late_arrival", label: "Late arrival" },
  { code: "absence", label: "Unexcused absence" },
  { code: "damages", label: "Damages / loss of company property" },
  { code: "policy_breach", label: "Policy breach" },
  { code: "uniform", label: "Uniform / PPE non-compliance" },
  { code: "other", label: "Other charge" },
];

const fmt = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

export default function ChargeEmployeeCard() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("undertime");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("employees")
      .select("id, name, email, phone")
      .eq("status", "Active")
      .order("name")
      .then(({ data }) => {
        const rows = ((data || []) as Employee[]).filter(
          (e) => e.email && e.email.includes("@") && (e as any).disabled !== true,
        );
        setEmployees(rows);
      });
  }, []);

  const selected = useMemo(() => employees.find((e) => e.email === email), [employees, email]);
  const numAmount = Number(amount);
  const valid = !!selected && Number.isInteger(numAmount) && numAmount >= 100 && numAmount <= 5_000_000 && !!reason;
  const reasonLabel = REASONS.find((r) => r.code === reason)?.label || "";

  const submit = async () => {
    if (!valid || !selected) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("employee-charge", {
        body: { employee_email: selected.email, amount: numAmount, reason_code: reason, note: note.trim() },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Charge failed");
      toast({
        title: `Charged ${data.employee} ${fmt(data.amount)}`,
        description:
          `Ref ${data.reference}. Email ${data.email_status}, SMS ${data.sms_status}.` +
          (data.access_fee > 0 ? ` Overdraft used ${fmt(data.overdraft_portion)} + 2.75% fee ${fmt(data.access_fee)}.` : ""),
      });
      setAmount(""); setNote(""); setEmail("");
    } catch (e: any) {
      toast({ title: "Charge failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card className="border-border/30 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-destructive via-chart-4 to-primary" />
      <CardHeader className="pb-3 border-b border-border/20 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-destructive/10 rounded-lg">
            <MinusCircle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Charge an Employee</CardTitle>
            <CardDescription className="text-xs">
              Deducts from the wallet into Fees & Charges Income. Uncovered amounts use overdraft with the 2.75% access fee. Email + SMS sent.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Employee</Label>
          <Select value={email} onValueChange={setEmail}>
            <SelectTrigger><SelectValue placeholder="Pick an employee" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.email}>{e.name} — {e.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Amount (UGX)</Label>
          <Input type="number" min={100} step={100} inputMode="numeric" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Reason</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Note (optional, shown to the employee)</Label>
          <Textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Reported at 9:40 AM" />
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button variant="destructive" disabled={!valid || submitting} onClick={() => setConfirmOpen(true)}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MinusCircle className="h-4 w-4 mr-2" />}
            Charge & notify
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm charge</AlertDialogTitle>
            <AlertDialogDescription>
              Deduct <strong>{fmt(numAmount || 0)}</strong> from <strong>{selected?.name}</strong> for{" "}
              <strong>{reasonLabel}</strong>{note.trim() ? ` (${note.trim()})` : ""}? They will be notified by email
              {selected?.phone ? " and SMS" : " (no phone on file for SMS)"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); submit(); }} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Yes, charge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
