import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Moon } from 'lucide-react';

interface DowntimeConfig {
  enabled: boolean;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  timezone: string;
  reason: string;
}

const DEFAULT_CFG: DowntimeConfig = {
  enabled: false,
  start_hour: 23,
  start_minute: 0,
  end_hour: 6,
  end_minute: 0,
  timezone: 'Africa/Kampala',
  reason: 'Nightly system maintenance',
};

const toHHMM = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

const ScheduledDowntimeSettings = () => {
  const [cfg, setCfg] = useState<DowntimeConfig>(DEFAULT_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'scheduled_downtime')
        .maybeSingle();
      if (data?.setting_value) {
        setCfg({ ...DEFAULT_CFG, ...(data.setting_value as any) });
      }
      setLoading(false);
    })();
  }, []);

  const save = async (next: DowntimeConfig) => {
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .update({ setting_value: next as any })
      .eq('setting_key', 'scheduled_downtime');
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }
    setCfg(next);
    toast({
      title: 'Schedule updated',
      description: next.enabled
        ? `System will be offline daily ${toHHMM(next.start_hour, next.start_minute)}–${toHHMM(next.end_hour, next.end_minute)} (${next.timezone}).`
        : 'Scheduled downtime disabled.',
    });
  };

  if (loading) return null;

  const startStr = toHHMM(cfg.start_hour, cfg.start_minute);
  const endStr = toHHMM(cfg.end_hour, cfg.end_minute);

  const onTimeChange = (which: 'start' | 'end', value: string) => {
    const [hStr, mStr] = value.split(':');
    const h = Math.min(23, Math.max(0, parseInt(hStr || '0', 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(mStr || '0', 10) || 0));
    setCfg((c) => ({
      ...c,
      [`${which}_hour`]: h,
      [`${which}_minute`]: m,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Daily Scheduled Downtime</CardTitle>
              <CardDescription>
                Automatically take the system offline every day during a fixed window. Users will see the maintenance page and active sessions are signed out.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={cfg.enabled ? 'default' : 'secondary'}>
              {cfg.enabled ? 'ENABLED' : 'Disabled'}
            </Badge>
            <Switch
              checked={cfg.enabled}
              disabled={saving}
              onCheckedChange={(v) => save({ ...cfg, enabled: v })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 border-t pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-time">Start time</Label>
            <Input
              id="start-time"
              type="time"
              value={startStr}
              onChange={(e) => onTimeChange('start', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="end-time">End time</Label>
            <Input
              id="end-time"
              type="time"
              value={endStr}
              onChange={(e) => onTimeChange('end', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tz">Timezone</Label>
            <Input
              id="tz"
              value={cfg.timezone}
              onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">IANA name, e.g. Africa/Kampala</p>
          </div>
          <div>
            <Label htmlFor="reason">Message shown to users</Label>
            <Input
              id="reason"
              value={cfg.reason}
              onChange={(e) => setCfg({ ...cfg, reason: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Window: <strong>{startStr}</strong> – <strong>{endStr}</strong> ({cfg.timezone})
          </p>
          <Button onClick={() => save(cfg)} disabled={saving}>
            {saving ? 'Saving…' : 'Save schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduledDowntimeSettings;