import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react';

interface Settings {
  enabled: boolean;
  folder_path: string;
  amount_per_row: number;
  daily_cap_per_user: number;
}

interface ScanRow {
  id: string;
  started_at: string;
  status: string;
  files_scanned: number;
  rows_new: number;
  rows_awarded: number;
  amount_total: number;
  error: string | null;
}

interface AwardRow {
  id: string;
  file_name: string;
  sheet_name: string;
  awarded_name: string | null;
  amount: number;
  awarded: boolean;
  skip_reason: string | null;
  matched_by: string | null;
  row_preview: string | null;
  created_at: string;
}

const DEFAULTS: Settings = { enabled: false, folder_path: '', amount_per_row: 1000, daily_cap_per_user: 20000 };

export default function ExcelLoyalty() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [rows, setRows] = useState<AwardRow[]>([]);

  const load = async () => {
    const [{ data: setting }, { data: scanData }, { data: rowData }] = await Promise.all([
      supabase.from('system_settings').select('setting_value').eq('setting_key', 'excel_loyalty').maybeSingle(),
      supabase.from('excel_loyalty_scans').select('*').order('started_at', { ascending: false }).limit(10),
      supabase.from('excel_loyalty_rows').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (setting?.setting_value) setSettings({ ...DEFAULTS, ...(setting.setting_value as unknown as Settings) });
    setScans((scanData as unknown as ScanRow[]) || []);
    setRows((rowData as unknown as AwardRow[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('system_settings')
      .upsert({ setting_key: 'excel_loyalty', setting_value: settings as never }, { onConflict: 'setting_key' });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved', description: 'Excel reward settings updated.' });
  };

  const runScan = async () => {
    if (!settings.folder_path.trim()) {
      toast({ title: 'Add a folder first', description: 'Enter the OneDrive folder name that holds the Excel files.', variant: 'destructive' });
      return;
    }
    setScanning(true);
    const { data, error } = await supabase.functions.invoke('onedrive-excel-loyalty', { body: { manual: true } });
    setScanning(false);
    if (error) {
      toast({ title: 'Scan failed', description: error.message, variant: 'destructive' });
    } else if (data && (data as any).ok === false) {
      toast({ title: 'Scan failed', description: (data as any).error, variant: 'destructive' });
    } else {
      const d = data as any;
      toast({
        title: 'Scan complete',
        description: `${d.filesScanned} file(s) checked · ${d.rowsNew} new row(s) · UGX ${Number(d.amountTotal || 0).toLocaleString()} awarded`,
      });
    }
    load();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Excel Work Rewards</h1>
          <p className="text-sm text-muted-foreground">
            Reward staff who fill in the company Excel files kept in OneDrive. Points are added to their daily loyalty total and paid at 8:00 PM.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Choose the OneDrive folder to watch and how much each new row is worth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Reward Excel work automatically</p>
              <p className="text-sm text-muted-foreground">Checks the folder every hour and rewards new rows.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
          </div>

          <div className="space-y-2">
            <Label>OneDrive folder</Label>
            <Input
              value={settings.folder_path}
              onChange={(e) => setSettings({ ...settings, folder_path: e.target.value })}
              placeholder="e.g. GAC-System-Reports or Reports/Daily Entry"
            />
            <p className="text-xs text-muted-foreground">Folder name exactly as it appears in OneDrive. Sub-folder paths use a slash.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Reward per new row (UGX)</Label>
              <Input
                type="number"
                value={settings.amount_per_row}
                onChange={(e) => setSettings({ ...settings, amount_per_row: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Most a person can earn per day (UGX)</Label>
              <Input
                type="number"
                value={settings.daily_cap_per_user}
                onChange={(e) => setSettings({ ...settings, daily_cap_per_user: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save settings
            </Button>
            <Button variant="outline" onClick={runScan} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Check the folder now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent rewards</CardTitle>
          <CardDescription>The newest rows found in the Excel files and who earned for them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet — run a check to get started.</p>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{r.awarded_name || 'Unmatched entry'}</p>
                <p className="text-muted-foreground truncate">
                  {r.file_name} · {r.sheet_name}
                  {r.matched_by ? ` · matched by ${r.matched_by}` : ''}
                </p>
                {r.row_preview && <p className="text-xs text-muted-foreground truncate">{r.row_preview}</p>}
                {r.skip_reason && <p className="text-xs text-destructive">{r.skip_reason}</p>}
              </div>
              <Badge variant={r.awarded ? 'default' : 'secondary'}>
                {r.awarded ? `UGX ${Number(r.amount).toLocaleString()}` : 'No reward'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scans.length === 0 && <p className="text-sm text-muted-foreground">No checks have run yet.</p>}
          {scans.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{new Date(s.started_at).toLocaleString()}</p>
                <p className="text-muted-foreground truncate">
                  {s.files_scanned} file(s) · {s.rows_new} new row(s) · {s.rows_awarded} rewarded · UGX {Number(s.amount_total).toLocaleString()}
                </p>
                {s.error && <p className="text-xs text-destructive truncate">{s.error}</p>}
              </div>
              <Badge variant={s.status === 'completed' ? 'default' : s.status === 'failed' ? 'destructive' : 'secondary'}>{s.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
