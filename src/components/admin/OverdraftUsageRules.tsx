import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Rules = {
  allow_wallet_transfer: boolean;
  allow_mobile_money: boolean;
  allow_withdrawal: boolean;
  allow_loan_repayment: boolean;
};

const DEFAULT_RULES: Rules = {
  allow_wallet_transfer: false,
  allow_mobile_money: true,
  allow_withdrawal: true,
  allow_loan_repayment: true,
};

export default function OverdraftUsageRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "overdraft_usage_rules")
        .maybeSingle();
      if (data?.setting_value) {
        setRules({ ...DEFAULT_RULES, ...(data.setting_value as any) });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("system_settings")
      .upsert(
        { setting_key: "overdraft_usage_rules", setting_value: rules as any, updated_at: new Date().toISOString() },
        { onConflict: "setting_key" },
      );
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Overdraft usage rules saved", description: "Changes take effect immediately." });
  };

  const row = (key: keyof Rules, title: string, desc: string) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <Label htmlFor={key} className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
      <Switch
        id={key}
        checked={rules[key]}
        onCheckedChange={(v) => setRules((r) => ({ ...r, [key]: v }))}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          Overdraft Usage Rules
        </CardTitle>
        <CardDescription>
          Control what employees are allowed to do with their overdraft. Turning a rule OFF pauses that specific use;
          existing wallet balances are unaffected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <>
            <div className="rounded-md border bg-card px-4">
              {row(
                "allow_wallet_transfer",
                "Allow overdraft when sending money to fellow employees",
                "When OFF, staff can still send money from their own wallet balance, but overdraft top-up on wallet-to-wallet transfers is blocked.",
              )}
              {row(
                "allow_withdrawal",
                "Allow overdraft on withdrawals (mobile money to self)",
                "Applies when a staff member withdraws money to their own MoMo number and the wallet is short.",
              )}
              {row(
                "allow_mobile_money",
                "Allow overdraft on mobile-money payouts to other numbers",
                "Applies to Send Money -> mobile number recipients that fall back to overdraft.",
              )}
              {row(
                "allow_loan_repayment",
                "Allow overdraft to cover loan repayments",
                "When OFF, monthly loan recovery cannot pull from overdraft; only real wallet balance is used.",
              )}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save changes
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Note: currently only the wallet-to-wallet transfer rule is enforced end-to-end. The other toggles are
              stored for the next enforcement rollout — flipping them will not yet block those flows.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}