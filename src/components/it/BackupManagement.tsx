import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Database, RefreshCw, ShieldCheck, AlertTriangle, RotateCcw, CalendarClock } from 'lucide-react';
import { useBackups, type BackupJob } from '@/hooks/useBackups';

const date = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Kampala', dateStyle: 'medium', timeStyle: 'short' });
const BackupManagement = () => {
  const { protection, loading, error, refresh, restore } = useBackups();
  const [selected, setSelected] = useState<BackupJob | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const jobs = [...(protection?.backups || [])].sort((a, b) => b.inserted_at.localeCompare(a.inserted_at));
  const latest = jobs.find(b => b.status === 'completed');
  const submit = async () => {
    if (!selected || submitting || attempted) return;
    setSubmitting(true); setAttempted(true);
    try { const result = await restore(selected, confirmation); setMessage(result.message); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Restore outcome unconfirmed. Check Supabase before retrying.'); }
    finally { setSubmitting(false); }
  };
  return <div className="space-y-6 min-w-0">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl flex items-center gap-2"><Database className="h-6 w-6 text-primary" />Backup & recovery</h2><p className="text-sm text-muted-foreground mt-1">Great Agro Coffee · Supabase database</p></div>
      <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />{loading ? 'Checking…' : 'Refresh'}</Button>
    </header>
    {error && <div role="alert" className="border border-destructive rounded-md p-4 text-sm text-destructive">{error}{protection && <p className="mt-1">Previously loaded figures below may be out of date.</p>}</div>}
    {!protection && loading && <p className="text-muted-foreground">Checking Supabase backup protection…</p>}
    {protection && <>
      <div className="grid gap-4 sm:grid-cols-3 border-y py-5">
        <div><ShieldCheck className="h-5 w-5 text-primary mb-2" /><p className="text-sm text-muted-foreground">Latest completed backup</p><p className="font-semibold mt-1">{latest ? date(latest.inserted_at) : 'None reported'}</p><p className="text-xs text-muted-foreground">East Africa Time</p></div>
        <div><Database className="h-5 w-5 text-primary mb-2" /><p className="text-sm text-muted-foreground">Saved backup history</p><p className="text-2xl font-semibold mt-1">{jobs.filter(b => b.status === 'completed').length}</p><p className="text-xs text-muted-foreground">Completed backups reported by Supabase</p></div>
        <div><CalendarClock className="h-5 w-5 text-primary mb-2" /><p className="text-sm text-muted-foreground">Point-in-time recovery</p><p className="font-semibold mt-1">{protection.pitr_enabled ? 'Enabled' : 'Not enabled'}</p><p className="text-xs text-muted-foreground">Checked {date(protection.checked_at)}</p></div>
      </div>
      <section className="space-y-3"><h3 className="text-lg">Protection & availability</h3>
        <dl className="space-y-3 text-sm">
          <div><dt className="font-medium">Daily backup schedule</dt><dd className="text-muted-foreground mt-1">{protection.schedule ? `${protection.schedule.schedule_for} UTC` : protection.schedule_error || 'No schedule reported'}</dd></div>
          <div><dt className="font-medium">On-demand recovery point</dt><dd className="text-muted-foreground mt-1">{protection.recovery_point ? `${protection.recovery_point.name} · ${protection.recovery_point.status.toLowerCase()}` : protection.recovery_point_error || 'No recovery point reported'}</dd></div>
          <div><dt className="font-medium">Uploaded files</dt><dd className="text-muted-foreground mt-1">Database backups do not contain uploaded document or photo files. Separate file protection has not been verified.</dd></div>
        </dl>
      </section>
      <section><h3 className="text-lg mb-3">Backup history</h3>
        {!jobs.length && <p className="text-sm text-muted-foreground">Supabase reported no saved backups.</p>}
        <div className="divide-y">{jobs.map(backup => <div key={backup.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><p className="font-medium">{date(backup.inserted_at)}</p><p className="text-xs text-muted-foreground mt-1">{backup.physical ? 'Physical database backup' : 'Database backup'}</p></div>
          <div className="flex items-center gap-3"><Badge variant={backup.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">{backup.status}</Badge>
            {protection.can_restore && backup.status === 'completed' && <Button size="sm" variant="outline" onClick={() => { setSelected(backup); setConfirmation(''); setAcknowledged(false); setMessage(null); setAttempted(false); }}><RotateCcw className="h-4 w-4 mr-2" />Restore</Button>}
          </div>
        </div>)}</div>
        {!protection.can_restore && <p className="text-xs text-muted-foreground mt-3">Production restoration is restricted to Super Admin.</p>}
      </section>
    </>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !submitting) setSelected(null); }}>
      <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Restore production database</DialogTitle><DialogDescription>Restore the backup from {selected ? date(selected.inserted_at) : ''} (East Africa Time).</DialogDescription></DialogHeader>
        <div className="border border-destructive rounded-md p-3 text-sm text-destructive flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0" /><p>Changes made after this backup will be lost. The system will be interrupted. Uploaded files are not restored. Sign in again within ten minutes before submitting.</p></div>
        <label className="flex gap-2 text-sm items-start"><Checkbox checked={acknowledged} onCheckedChange={v => setAcknowledged(v === true)} disabled={attempted} /><span>I accept the data loss and service interruption.</span></label>
        <label className="text-sm space-y-2"><span className="block">Type the exact confirmation:</span><code className="block break-all text-xs">RESTORE {selected?.inserted_at}</code><Input aria-label="Restore confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={attempted} autoComplete="off" /></label>
        {message && <p role="status" className="text-sm border rounded-md p-3">{message}</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={submitting} onClick={() => setSelected(null)}>Close</Button><Button variant="destructive" disabled={!selected || !acknowledged || confirmation !== `RESTORE ${selected.inserted_at}` || submitting || attempted} onClick={() => void submit()}>{submitting ? 'Submitting…' : 'Confirm restore'}</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
};
export default BackupManagement;
