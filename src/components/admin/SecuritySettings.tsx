import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Shield, Smartphone, Fingerprint, Network, History, Trash2, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Policy = {
  session_inactivity_minutes: number;
  tv_mode_inactivity_minutes: number;
  require_new_device_verification: boolean;
  require_otp_for_withdrawals: boolean;
  require_biometric_first_login: boolean;
  enforce_network_whitelist: boolean;
  block_disabled_accounts: boolean;
  max_failed_login_attempts: number;
  password_min_length: number;
};

const DEFAULT_POLICY: Policy = {
  session_inactivity_minutes: 30,
  tv_mode_inactivity_minutes: 5,
  require_new_device_verification: true,
  require_otp_for_withdrawals: true,
  require_biometric_first_login: true,
  enforce_network_whitelist: false,
  block_disabled_accounts: true,
  max_failed_login_attempts: 5,
  password_min_length: 8,
};

export default function SecuritySettings() {
  const { toast } = useToast();
  const [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [devices, setDevices] = useState<any[]>([]);
  const [biometrics, setBiometrics] = useState<any[]>([]);
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [roleAudit, setRoleAudit] = useState<any[]>([]);
  const [newIp, setNewIp] = useState("");
  const [newIpDesc, setNewIpDesc] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const [p, d, b, w, r] = await Promise.all([
      supabase.from("system_settings").select("setting_value").eq("setting_key", "security_settings").maybeSingle(),
      supabase.from("device_sessions").select("*").order("last_seen_at", { ascending: false }).limit(25),
      supabase.from("biometric_credentials").select("*").order("created_at", { ascending: false }).limit(25),
      supabase.from("network_whitelist").select("*").order("created_at", { ascending: false }),
      supabase.from("role_change_audit").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    if (p.data?.setting_value) setPolicy({ ...DEFAULT_POLICY, ...(p.data.setting_value as any) });
    setDevices(d.data || []);
    setBiometrics(b.data || []);
    setWhitelist(w.data || []);
    setRoleAudit(r.data || []);
    const failed = [
      d.error && "devices",
      b.error && "biometrics",
      w.error && "network whitelist",
      r.error && "role changes",
    ].filter(Boolean);
    if (failed.length) {
      toast({
        title: "Some security data could not load",
        description: `${failed.join(", ")} — ${d.error?.message || b.error?.message || w.error?.message || r.error?.message}`,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const savePolicy = async () => {
    setSaving(true);
    const { error } = await supabase.from("system_settings").upsert(
      { setting_key: "security_settings", setting_value: policy as any, updated_at: new Date().toISOString() },
      { onConflict: "setting_key" },
    );
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Security policy saved", description: "Changes take effect immediately." });
  };

  const toggleRow = (key: keyof Policy, title: string, desc: string) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <Label htmlFor={key} className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
      <Switch id={key} checked={Boolean(policy[key])} onCheckedChange={(v) => setPolicy((p) => ({ ...p, [key]: v }))} />
    </div>
  );

  const numberRow = (key: keyof Policy, title: string, desc: string) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <Label htmlFor={key} className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
      <Input
        id={key}
        type="number"
        min={1}
        className="w-28"
        value={Number(policy[key])}
        onChange={(e) => setPolicy((p) => ({ ...p, [key]: Number(e.target.value) }))}
      />
    </div>
  );

  const revokeDevice = async (id: string) => {
    const { error } = await supabase.from("device_sessions").delete().eq("id", id);
    if (error) return toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    setDevices((ds) => ds.filter((d) => d.id !== id));
    toast({ title: "Device revoked", description: "The device must verify again on next login." });
  };

  const trustDevice = async (id: string, trusted: boolean) => {
    const { error } = await supabase.from("device_sessions").update({ is_trusted: trusted }).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setDevices((ds) => ds.map((d) => (d.id === id ? { ...d, is_trusted: trusted } : d)));
  };

  const revokeBiometric = async (id: string) => {
    const { error } = await supabase.from("biometric_credentials").delete().eq("id", id);
    if (error) return toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    setBiometrics((bs) => bs.filter((b) => b.id !== id));
    toast({ title: "Biometric credential removed" });
  };

  const addIp = async () => {
    const ip = newIp.trim();
    if (!ip) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("network_whitelist")
      .insert({ ip_address: ip, description: newIpDesc.trim() || null, is_active: true, created_by: userRes?.user?.email || null })
      .select()
      .single();
    if (error) return toast({ title: "Could not add IP", description: error.message, variant: "destructive" });
    setWhitelist((w) => [data, ...w]);
    setNewIp(""); setNewIpDesc("");
    toast({ title: "IP added to whitelist" });
  };

  const toggleIp = async (id: string, active: boolean) => {
    const { error } = await supabase.from("network_whitelist").update({ is_active: active }).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setWhitelist((w) => w.map((x) => (x.id === id ? { ...x, is_active: active } : x)));
  };

  const removeIp = async (id: string) => {
    const { error } = await supabase.from("network_whitelist").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setWhitelist((w) => w.filter((x) => x.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading security settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Policy
            </CardTitle>
            <CardDescription>Authentication, session and access-control rules applied system-wide.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {numberRow("session_inactivity_minutes", "Session inactivity timeout (minutes)", "Users are signed out automatically after this period of inactivity.")}
          {numberRow("tv_mode_inactivity_minutes", "TV / display mode timeout (minutes)", "Shorter idle window for kiosk and market display screens.")}
          {numberRow("max_failed_login_attempts", "Max failed login attempts", "Attempts before the account is temporarily locked.")}
          {numberRow("password_min_length", "Minimum password length", "Enforced when users set or change a password.")}
          {toggleRow("require_new_device_verification", "Verify new devices", "Send an email verification token when an unrecognised device signs in.")}
          {toggleRow("require_biometric_first_login", "Biometric enrolment on first login", "Prompt staff to register fingerprint/face on their first successful login.")}
          {toggleRow("require_otp_for_withdrawals", "OTP for withdrawals", "Require a one-time code before wallet withdrawals are submitted.")}
          {toggleRow("block_disabled_accounts", "Block disabled accounts", "Immediately deny access to accounts marked as disabled or suspended.")}
          {toggleRow("enforce_network_whitelist", "Enforce network whitelist", "Only allow access from the approved IP addresses listed below.")}
          <div className="pt-4">
            <Button onClick={savePolicy} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save security policy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Network Whitelist
          </CardTitle>
          <CardDescription>Approved IP addresses. Only enforced when the policy toggle above is on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="IP address e.g. 41.210.0.1" value={newIp} onChange={(e) => setNewIp(e.target.value)} className="sm:max-w-xs" />
            <Input placeholder="Description (office, warehouse...)" value={newIpDesc} onChange={(e) => setNewIpDesc(e.target.value)} />
            <Button onClick={addIp} className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP address</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whitelist.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No IP addresses whitelisted</TableCell></TableRow>
                )}
                {whitelist.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-sm">{w.ip_address}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.description || "—"}</TableCell>
                    <TableCell><Switch checked={!!w.is_active} onCheckedChange={(v) => toggleIp(w.id, v)} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => removeIp(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Devices &amp; Sessions
          </CardTitle>
          <CardDescription>Recently seen devices. Revoke to force re-verification on next sign-in.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Trusted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No device sessions recorded</TableCell></TableRow>
              )}
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">{d.user_email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{[d.browser, d.os].filter(Boolean).join(" · ") || "Unknown"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "—"}</TableCell>
                  <TableCell><Switch checked={!!d.is_trusted} onCheckedChange={(v) => trustDevice(d.id, v)} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => revokeDevice(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            Biometric Credentials
          </CardTitle>
          <CardDescription>Registered fingerprint / passkey credentials. Remove one to force re-enrolment.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {biometrics.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No biometric credentials registered</TableCell></TableRow>
              )}
              {biometrics.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-sm">{b.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.created_at ? new Date(b.created_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => revokeBiometric(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent Role Changes
          </CardTitle>
          <CardDescription>Last 10 role assignment events, including blocked privilege-escalation attempts.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roleAudit.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No role changes recorded</TableCell></TableRow>
              )}
              {roleAudit.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-sm">{r.operation}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(r.old_role || "—") + " → " + (r.new_role || "—")}</TableCell>
                  <TableCell>
                    {r.was_blocked
                      ? <Badge variant="destructive">Blocked</Badge>
                      : <Badge variant="secondary">Applied</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}