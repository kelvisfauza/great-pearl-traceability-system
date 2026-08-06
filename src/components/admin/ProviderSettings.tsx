import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Smartphone, Wallet, MessageSquare, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type FeeTier = { up_to: number; fee: number };

type Settings = {
  yo: {
    enabled: boolean;
    min_amount: number;
    max_amount: number;
    service_fee: number;
    require_admin_approval: boolean;
  };
  gosente: {
    enabled: boolean;
    min_amount: number;
    routing_threshold: number;
    max_amount: number;
    require_admin_approval: boolean;
    fee_tiers: FeeTier[];
  };
  sms: {
    yoola_enabled: boolean;
    infobip_fallback: boolean;
    bulksms_premium: boolean;
    dedup_window_seconds: number;
  };
};

const DEFAULTS: Settings = {
  yo: { enabled: true, min_amount: 50000, max_amount: 5000000, service_fee: 0, require_admin_approval: true },
  gosente: {
    enabled: true,
    min_amount: 500,
    routing_threshold: 50000,
    max_amount: 1000000,
    require_admin_approval: true,
    fee_tiers: [
      { up_to: 500, fee: 0 },
      { up_to: 60000, fee: 1100 },
      { up_to: 500000, fee: 1700 },
      { up_to: 1000000, fee: 2500 },
      { up_to: 9007199254740991, fee: 2900 },
    ],
  },
  sms: { yoola_enabled: true, infobip_fallback: true, bulksms_premium: true, dedup_window_seconds: 90 },
};

const ugx = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function ProviderSettings() {
  const { toast } = useToast();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "provider_settings")
        .maybeSingle();
      const v = (data?.setting_value as any) || {};
      setS({
        yo: { ...DEFAULTS.yo, ...(v.yo || {}) },
        gosente: { ...DEFAULTS.gosente, ...(v.gosente || {}), fee_tiers: v.gosente?.fee_tiers?.length ? v.gosente.fee_tiers : DEFAULTS.gosente.fee_tiers },
        sms: { ...DEFAULTS.sms, ...(v.sms || {}) },
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("system_settings").upsert(
      { setting_key: "provider_settings", setting_value: s as any, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Provider settings saved", description: "Changes take effect on the next transaction." });
  };

  const num = (label: string, value: number, onChange: (v: number) => void, hint?: string) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  const toggle = (label: string, desc: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading provider settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GosentePay */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                GosentePay
              </CardTitle>
              <CardDescription>
                Handles smaller instant withdrawals. Amounts below the routing threshold go through GosentePay.
              </CardDescription>
            </div>
            <Badge variant={s.gosente.enabled ? "default" : "secondary"}>
              {s.gosente.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggle("Enabled", "When off, all withdrawals route to Yo Payments.", s.gosente.enabled, (v) =>
            setS((p) => ({ ...p, gosente: { ...p.gosente, enabled: v } })))}
          {toggle("Require admin approval", "Payouts wait for an administrator before money leaves.", s.gosente.require_admin_approval, (v) =>
            setS((p) => ({ ...p, gosente: { ...p.gosente, require_admin_approval: v } })))}
          <div className="grid gap-4 sm:grid-cols-3">
            {num("Routing threshold", s.gosente.routing_threshold, (v) =>
              setS((p) => ({ ...p, gosente: { ...p.gosente, routing_threshold: v } })), `Below ${ugx(s.gosente.routing_threshold)} → GosentePay`)}
            {num("Minimum amount", s.gosente.min_amount, (v) =>
              setS((p) => ({ ...p, gosente: { ...p.gosente, min_amount: v } })))}
            {num("Maximum amount", s.gosente.max_amount, (v) =>
              setS((p) => ({ ...p, gosente: { ...p.gosente, max_amount: v } })))}
          </div>

          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Service fee tiers</Label>
                <p className="text-xs text-muted-foreground">Fee charged for amounts up to each limit.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setS((p) => ({ ...p, gosente: { ...p.gosente, fee_tiers: [...p.gosente.fee_tiers, { up_to: 0, fee: 0 }] } }))
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add tier
              </Button>
            </div>
            <div className="space-y-2">
              {s.gosente.fee_tiers.map((t, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Up to (UGX)</Label>
                    <Input
                      type="number"
                      className="h-9"
                      value={t.up_to}
                      onChange={(e) =>
                        setS((p) => {
                          const tiers = [...p.gosente.fee_tiers];
                          tiers[i] = { ...tiers[i], up_to: Number(e.target.value) };
                          return { ...p, gosente: { ...p.gosente, fee_tiers: tiers } };
                        })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Fee (UGX)</Label>
                    <Input
                      type="number"
                      className="h-9"
                      value={t.fee}
                      onChange={(e) =>
                        setS((p) => {
                          const tiers = [...p.gosente.fee_tiers];
                          tiers[i] = { ...tiers[i], fee: Number(e.target.value) };
                          return { ...p, gosente: { ...p.gosente, fee_tiers: tiers } };
                        })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() =>
                      setS((p) => ({ ...p, gosente: { ...p.gosente, fee_tiers: p.gosente.fee_tiers.filter((_, x) => x !== i) } }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yo Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Yo Payments
              </CardTitle>
              <CardDescription>Handles larger payouts at or above the GosentePay routing threshold.</CardDescription>
            </div>
            <Badge variant={s.yo.enabled ? "default" : "secondary"}>{s.yo.enabled ? "Active" : "Disabled"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggle("Enabled", "When off, large withdrawals are rejected.", s.yo.enabled, (v) =>
            setS((p) => ({ ...p, yo: { ...p.yo, enabled: v } })))}
          {toggle("Require admin authorization", "Payouts sit in pending authorization until approved.", s.yo.require_admin_approval, (v) =>
            setS((p) => ({ ...p, yo: { ...p.yo, require_admin_approval: v } })))}
          <div className="grid gap-4 sm:grid-cols-3">
            {num("Minimum amount", s.yo.min_amount, (v) => setS((p) => ({ ...p, yo: { ...p.yo, min_amount: v } })))}
            {num("Maximum amount", s.yo.max_amount, (v) => setS((p) => ({ ...p, yo: { ...p.yo, max_amount: v } })))}
            {num("Service fee", s.yo.service_fee, (v) => setS((p) => ({ ...p, yo: { ...p.yo, service_fee: v } })), "Flat fee per payout (0 = free)")}
          </div>
        </CardContent>
      </Card>

      {/* SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            SMS Providers
          </CardTitle>
          <CardDescription>YoolaSMS is the primary gateway, with Infobip and BulkSMS Premium as alternates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggle("YoolaSMS (primary)", "Main SMS gateway for all system messages.", s.sms.yoola_enabled, (v) =>
            setS((p) => ({ ...p, sms: { ...p.sms, yoola_enabled: v } })))}
          {toggle("Infobip fallback", "Automatically retry through Infobip when YoolaSMS fails.", s.sms.infobip_fallback, (v) =>
            setS((p) => ({ ...p, sms: { ...p.sms, infobip_fallback: v } })))}
          {toggle("BulkSMS Premium routing", "Use BulkSMS first for OTP and other critical messages.", s.sms.bulksms_premium, (v) =>
            setS((p) => ({ ...p, sms: { ...p.sms, bulksms_premium: v } })))}
          <div className="grid gap-4 sm:grid-cols-2">
            {num("Duplicate suppression window (seconds)", s.sms.dedup_window_seconds, (v) =>
              setS((p) => ({ ...p, sms: { ...p.sms, dedup_window_seconds: v } })), "Identical messages within this window are skipped. 0 disables it.")}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save provider settings
        </Button>
      </div>
    </div>
  );
}
