import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";

type Status = { suspended?: boolean; mode?: string; changed_by?: string; changed_at?: string };

const LoyaltyAwardsToggle = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).rpc("get_loyalty_awards_status");
    setStatus((data as Status) || {});
  };
  useEffect(() => { load(); }, []);

  const enabled = !!status && !status.suspended && status.mode !== "off";

  const toggle = async (on: boolean) => {
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("set_loyalty_awards_enabled", { p_enabled: on });
    if (error) {
      setSaving(false);
      toast({ title: "Could not change loyalty", description: error.message, variant: "destructive" });
      return;
    }
    setStatus(data as Status);

    if (on) {
      // Notify every active employee by email and SMS that loyalty is back on
      const { data: notify, error: notifyError } = await (supabase as any).functions.invoke("loyalty-reenabled-notify");
      setSaving(false);
      if (notifyError || notify?.ok === false) {
        toast({ title: "Loyalty turned ON", description: "But the confirmation emails/texts failed to send. Try switching off and on again.", variant: "destructive" });
      } else {
        toast({ title: "Loyalty turned ON", description: `Confirmations sent: ${notify?.emailsSent ?? 0} emails and ${notify?.smsSent ?? 0} texts to staff.` });
      }
      return;
    }

    setSaving(false);
    toast({ title: "Loyalty turned OFF", description: "No loyalty will be credited or paid to anyone." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> Loyalty Rewards</CardTitle>
        <CardDescription>Turn loyalty earning and the daily 8pm payout on or off for all employees. Changes are silent — no messages are sent.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            {status === null ? <span className="text-muted-foreground">Loading…</span> :
              <Badge variant={enabled ? "default" : "destructive"}>{enabled ? "ON" : "OFF"}</Badge>}
          </div>
          {status?.changed_by && (
            <p className="text-xs text-muted-foreground">
              Last changed by {status.changed_by}{status.changed_at ? ` on ${new Date(status.changed_at).toLocaleString()}` : ""}
            </p>
          )}
        </div>
        <Switch checked={enabled} disabled={saving || status === null} onCheckedChange={toggle} aria-label="Loyalty rewards on or off" />
      </CardContent>
    </Card>
  );
};

export default LoyaltyAwardsToggle;
