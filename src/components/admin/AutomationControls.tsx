import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAutomationControls, type AutomationKey } from "@/hooks/useAutomationControls";

const ITEMS: { key: AutomationKey; title: string; text: string }[] = [
  { key: "withdrawal_auto", title: "Automatic small withdrawals", text: "Mobile money withdrawals below UGX 30,000 are checked and paid by the system without approval. When OFF, they go through normal Admin and Finance approval." },
  { key: "meal_auto", title: "Automatic meal plan Finance approval", text: "The first itemised meal plan each day, up to UGX 50,000, is approved and paid by the system after Admin approval. When OFF, Finance approves every meal plan by hand." },
  { key: "outlook_ooo", title: "Outlook out-of-office on leave approval", text: "Shows the option to set an Outlook out-of-office reply when approving leave. When OFF, the option is hidden." },
];

const LINKS = [
  { to: "/admin/microsoft-365", label: "Microsoft 365 staff, devices & notices" },
  { to: "/admin/leave-requests", label: "Leave requests" },
  { to: "/admin/treasury", label: "Treasury pool" },
];

const AutomationControls = () => {
  const { data, isLoading, error, save } = useAutomationControls();
  const { toast } = useToast();
  const toggle = (key: AutomationKey, on: boolean, title: string) =>
    save.mutate({ key, on }, {
      onSuccess: () => toast({ title: `${title} turned ${on ? "ON" : "OFF"}` }),
      onError: (e: any) => toast({ title: "Could not save", description: e?.message, variant: "destructive" }),
    });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Automatic actions</CardTitle>
          <CardDescription>Turn the recent automatic features on or off. Changes apply to the next request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p role="alert" className="text-sm text-destructive">Settings could not be loaded. Reload to try again.</p>}
          {ITEMS.map(i => (
            <div key={i.key} className="flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2"><span className="font-medium">{i.title}</span>
                  {data && <Badge variant={data[i.key] ? "default" : "secondary"}>{data[i.key] ? "ON" : "OFF"}</Badge>}</div>
                <p className="text-sm text-muted-foreground">{i.text}</p>
              </div>
              <Switch checked={!!data?.[i.key]} disabled={isLoading || !data || save.isPending} onCheckedChange={(v) => toggle(i.key, v, i.title)} aria-label={i.title} />
            </div>
          ))}
          {data?.changed_by && <p className="text-xs text-muted-foreground">Last changed by {data.changed_by}{data.changed_at ? ` on ${new Date(data.changed_at).toLocaleString()}` : ""}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Other recent features</CardTitle><CardDescription>These have no on/off switch; open them here.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">{LINKS.map(l => <Button key={l.to} asChild variant="outline" size="sm"><Link to={l.to}>{l.label}</Link></Button>)}</CardContent>
      </Card>
    </div>
  );
};
export default AutomationControls;
