import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** Admin queue: new-device sign-ins waiting for authorisation. */
const DeviceLoginApprovals: React.FC = () => {
  const { employee } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 14 * 864e5).toISOString();
    const { data } = await (supabase as any).from('device_sessions').select('*')
      .eq('is_trusted', false).is('rejected_at', null).gte('last_seen_at', since)
      .order('last_seen_at', { ascending: false }).limit(50);
    setRows(data || []);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const decide = async (d: any, approve: boolean) => {
    setBusy(d.id);
    const patch = approve
      ? { is_trusted: true, token_used_at: new Date().toISOString(), rejected_at: null }
      : { is_trusted: false, rejected_at: new Date().toISOString() };
    const { error } = await (supabase as any).from('device_sessions').update(patch).eq('id', d.id);
    if (error) { setBusy(null); toast.error(error.message); return; }
    const device = `${d.browser || 'Browser'} on ${d.os || 'unknown device'}`;
    const by = employee?.name || 'Administrator';
    const message = approve
      ? `Your new device (${device}) has been authorised by ${by}. You can now sign in on it. Great Agro Coffee.`
      : `A sign-in from a new device (${device}) was blocked by ${by}. If this was you, contact IT. If not, change your password now. Great Agro Coffee.`;
    const sends = [d.user_email, 'operations@greatpearlcoffee.com'].filter(Boolean).map((to: string) =>
      supabase.functions.invoke('send-transactional-email', { body: {
        templateName: 'general-notification', recipientEmail: to,
        idempotencyKey: `device-${approve ? 'ok' : 'no'}-${d.id}-${to}`,
        templateData: { title: approve ? 'New device approved' : 'New device blocked', message: to === d.user_email ? message : `${d.user_email}: ${message}` },
      } }).catch(() => null));
    await Promise.all(sends);
    await (supabase as any).from('audit_logs').insert({ action: approve ? 'ADMIN_APPROVE_DEVICE' : 'ADMIN_REJECT_DEVICE', table_name: 'device_sessions', record_id: d.id, performed_by: by, record_data: { user_email: d.user_email, device } });
    setBusy(null);
    toast.success(approve ? 'Device approved — email sent' : 'Device blocked — email sent');
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /> New device sign-ins ({rows.length})</CardTitle>
        <CardDescription>Approve to give the person access on that device. They get an email either way.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No devices waiting.</p>}
        {rows.map(d => (
          <div key={d.id} className="p-3 border rounded-lg flex flex-wrap justify-between gap-2 items-center">
            <div>
              <p className="font-medium">{d.user_email}</p>
              <p className="text-sm text-muted-foreground">
                {d.device_name || d.browser || 'Browser'} • {d.os_version || d.os || 'Unknown'} • Last seen {new Date(d.last_seen_at || d.created_at).toLocaleString()}
              </p>
              {(d.location_label || d.latitude != null) && (
                <p className="text-xs text-muted-foreground">
                  {d.location_label || 'Location'}
                  {d.latitude != null && <> ({d.latitude}, {d.longitude})</>}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy === d.id} onClick={() => decide(d, true)}><Check className="h-4 w-4 mr-1" /> Approve</Button>
              <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => decide(d, false)}><X className="h-4 w-4 mr-1" /> Reject</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DeviceLoginApprovals;
