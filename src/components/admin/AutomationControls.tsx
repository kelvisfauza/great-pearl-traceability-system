import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { CalendarOff, Utensils, Wallet } from "lucide-react";
import { AUTOMATION_BOUNDS, AUTOMATION_DEFAULTS, useAutomationControls, type AutomationKey, type AutomationNumberKey } from "@/hooks/useAutomationControls";

type Field = { key: AutomationNumberKey; label: string; help: string; unit: string; step?: number };

const WITHDRAWAL_FIELDS: Field[] = [
  { key: "withdrawal_limit", label: "Automatic limit", unit: "UGX", help: "Withdrawals BELOW this amount are paid automatically. This amount and above follow normal approval." },
  { key: "work_days", label: "Must have worked within", unit: "days", help: "Staff with no sign-in or clock-in in this many days go to normal approval." },
  { key: "max_per_day", label: "Automatic withdrawals per person per day", unit: "per day", help: "Extra withdrawals the same day go to normal approval and you get a watch alert." },
  { key: "source_days", label: "Check money received in the last", unit: "days", help: "Money from fellow employees in this period is always rejected; recent points or rewards go to normal approval." },
];
const MEAL_FIELDS: Field[] = [
  { key: "meal_limit", label: "Automatic limit", unit: "UGX", help: "Meal plans up to this amount (including the charge) can be approved automatically." },
  { key: "meal_usual_multiplier", label: "Unusual amount check", unit: "× usual", step: 0.1, help: "Meal plans above this many times the usual amount are left for Finance." },
];

const Section = ({ icon: Icon, title, desc, toggle, fields }: { icon: any; title: string; desc: string; toggle: AutomationKey; fields: Field[] }) => {
  const { data, save } = useAutomationControls();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setDraft(Object.fromEntries(fields.map(f => [f.key, String(data[f.key])]))); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const errors = Object.fromEntries(fields.map(f => {
    const n = Number(draft[f.key]); const [lo, hi] = AUTOMATION_BOUNDS[f.key];
    return [f.key, !Number.isFinite(n) || n < lo || n > hi ? `Enter ${lo.toLocaleString()} – ${hi.toLocaleString()}` : (f.step ? "" : !Number.isInteger(n) ? "Whole numbers only" : "")];
  }));
  const dirty = !!data && fields.some(f => Number(draft[f.key]) !== data[f.key]);
  const invalid = Object.values(errors).some(Boolean);
  const done = (msg: string) => ({ onSuccess: () => toast({ title: msg }), onError: (e: any) => toast({ title: "Could not save", description: e?.message, variant: "destructive" as const }) });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5" />{title}
              {data && <Badge variant={data[toggle] ? "default" : "secondary"}>{data[toggle] ? "ON" : "OFF"}</Badge>}</CardTitle>
            <CardDescription>{desc}</CardDescription>
          </div>
          <Switch checked={!!data?.[toggle]} disabled={!data || save.isPending} aria-label={title}
            onCheckedChange={(on) => save.mutate({ [toggle]: on } as any, done(`${title} turned ${on ? "ON" : "OFF"}`))} />
        </div>
      </CardHeader>
      {fields.length > 0 && <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(f => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={f.key}>{f.label} <span className="text-muted-foreground font-normal">({f.unit})</span></Label>
              <Input id={f.key} type="number" inputMode="decimal" step={f.step ?? 1} value={draft[f.key] ?? ""} disabled={!data}
                onChange={(e) => setDraft(d => ({ ...d, [f.key]: e.target.value }))} aria-invalid={!!errors[f.key]} />
              <p className={`text-xs ${errors[f.key] ? "text-destructive" : "text-muted-foreground"}`}>{errors[f.key] || f.help}</p>
              <p className="text-xs text-muted-foreground">Default: {AUTOMATION_DEFAULTS[f.key].toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!dirty || invalid || save.isPending} onClick={() => save.mutate(Object.fromEntries(fields.map(f => [f.key, Number(draft[f.key])])) as any, done(`${title}: limits saved`))}>Save limits</Button>
          <Button variant="outline" disabled={!dirty} onClick={() => data && setDraft(Object.fromEntries(fields.map(f => [f.key, String(data[f.key])])))}>Undo changes</Button>
          <Button variant="ghost" disabled={save.isPending} onClick={() => save.mutate(Object.fromEntries(fields.map(f => [f.key, AUTOMATION_DEFAULTS[f.key]])) as any, done(`${title}: defaults restored`))}>Restore defaults</Button>
        </div>
      </CardContent>}
    </Card>
  );
};

const AutomationControls = () => {
  const { data, error } = useAutomationControls();
  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive">Settings could not be loaded. Reload to try again.</p>}
      <Section icon={Wallet} toggle="withdrawal_auto" fields={WITHDRAWAL_FIELDS} title="Automatic mobile money withdrawals"
        desc="Pays small mobile money withdrawals without approval after the system checks the wallet, source of money, work activity, leave, suspension and GosentePay balance. When OFF, every withdrawal follows normal Admin and Finance approval." />
      <Section icon={Utensils} toggle="meal_auto" fields={MEAL_FIELDS} title="Automatic meal plan Finance approval"
        desc="After Admin approves, the first itemised mobile money meal plan each day is approved and paid by the system. When OFF, Finance approves every meal plan by hand." />
      <Section icon={CalendarOff} toggle="outlook_ooo" fields={[]} title="Outlook out-of-office on leave approval"
        desc="Shows the option to set an Outlook out-of-office reply when approving leave. When OFF, the option is hidden." />
      {data?.changed_by && <p className="text-xs text-muted-foreground">Last changed by {data.changed_by}{data.changed_at ? ` on ${new Date(data.changed_at).toLocaleString()}` : ""}</p>}
      <Card>
        <CardHeader><CardTitle className="text-base">Other recent features</CardTitle><CardDescription>These have no settings; open them here.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[["/admin/microsoft-365", "Microsoft 365 staff, devices & notices"], ["/admin/leave-requests", "Leave requests"], ["/admin/treasury", "Treasury pool"]].map(([to, l]) => <Button key={to} asChild variant="outline" size="sm"><Link to={to}>{l}</Link></Button>)}
        </CardContent>
      </Card>
    </div>
  );
};
export default AutomationControls;
