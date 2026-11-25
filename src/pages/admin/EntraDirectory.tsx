import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Building2, MoreHorizontal, Laptop, Loader2, Search, Users } from 'lucide-react';

type View = 'users' | 'devices';
const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('entra-directory', { body });
  if (error) throw new Error('Microsoft 365 could not be reached');
  if (!data?.ok) throw new Error(data?.error || 'Request failed');
  return data;
};
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function DirectoryList({ view }: { view: View }) {
  const [items, setItems] = useState<any[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async (append = false) => {
    setLoading(true); setError(null);
    try {
      const d = await call({ view, search: search || undefined, next: append ? next : undefined });
      setItems(p => (append ? [...p, ...d.items] : d.items)); setNext(d.next);
    } catch (e: any) { setError(e.message); if (!append) setItems([]); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); load(); }}>
        <Input placeholder={view === 'users' ? 'Search staff by name' : 'Search devices by name'} value={search} onChange={e => setSearch(e.target.value)} />
        <Button type="submit" disabled={loading}><Search className="h-4 w-4" /></Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {view === 'users' ? (
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Job / Department</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow>
            ) : (
              <TableRow><TableHead>Device</TableHead><TableHead>System</TableHead><TableHead>Managed</TableHead><TableHead>Status</TableHead><TableHead>Last sign-in</TableHead></TableRow>
            )}
          </TableHeader>
          <TableBody>
            {items.map(i => view === 'users' ? (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.displayName}</TableCell>
                <TableCell className="text-muted-foreground">{i.mail || i.userPrincipalName}</TableCell>
                <TableCell>{[i.jobTitle, i.department].filter(Boolean).join(' · ') || '—'}</TableCell>
                <TableCell><Badge variant={i.accountEnabled ? 'default' : 'secondary'}>{i.accountEnabled ? 'Active' : 'Disabled'}</Badge></TableCell>
                <TableCell>{fmt(i.createdDateTime)}</TableCell>
              </TableRow>
            ) : (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.displayName}</TableCell>
                <TableCell>{[i.operatingSystem, i.operatingSystemVersion].filter(Boolean).join(' ') || '—'}</TableCell>
                <TableCell>{i.isManaged ? 'Yes' : 'No'}{i.isCompliant === false ? ' · not compliant' : ''}</TableCell>
                <TableCell><Badge variant={i.accountEnabled ? 'default' : 'secondary'}>{i.accountEnabled ? 'Enabled' : 'Disabled'}</Badge></TableCell>
                <TableCell>{fmt(i.approximateLastSignInDateTime)}</TableCell>
              </TableRow>
            ))}
            {!loading && !error && items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nothing found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
      {next && !loading && <Button variant="outline" onClick={() => load(true)}>Load more</Button>}
    </div>
  );
}

const ACTIONS: Record<string, { label: string; impact: string; danger?: boolean }> = {
  lock: { label: 'Lock now', impact: 'The screen locks immediately. The user must sign in again with their PIN or password.' },
  restart: { label: 'Restart', impact: 'The device restarts within a few minutes. Unsaved work on it may be lost.' },
  sync: { label: 'Check for updates', impact: 'The device checks in with Microsoft for new policies and updates.' },
  block: { label: 'Block sign-in', impact: 'Company accounts can no longer sign in on this device until it is unblocked.' },
  unblock: { label: 'Unblock sign-in', impact: 'Company accounts can sign in on this device again.' },
  retire: { label: 'Remove company data', impact: 'Company email, apps and data are removed and the device leaves management. Personal files stay. Cannot be undone.', danger: true },
  wipe: { label: 'Erase whole device', impact: 'Everything on the device is erased back to factory settings, including personal files. Cannot be undone.', danger: true },
};

function ManagedDevices() {
  const [items, setItems] = useState<any[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ device: any; action: string } | null>(null);
  const [typed, setTyped] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [sending, setSending] = useState(false);
  const load = async (append = false) => {
    setLoading(true); setError(null);
    try {
      const d = await call({ view: 'managed', search: search || undefined, next: append ? next : undefined });
      setItems(p => (append ? [...p, ...d.items] : d.items)); setNext(d.next);
    } catch (e: any) { setError(e.message); if (!append) setItems([]); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const open = (device: any, action: string) => { setPending({ device, action }); setTyped(''); setUnderstood(false); };
  const meta = pending ? ACTIONS[pending.action] : null;
  const ready = pending && typed.trim().toLowerCase() === String(pending.device.deviceName).toLowerCase() && (!meta?.danger || understood);
  const send = async () => {
    if (!pending || !ready) return;
    setSending(true);
    try {
      const d = await call({ action: pending.action, deviceId: pending.device.id, confirmName: typed, acknowledge: true });
      toast.success(d.message); setPending(null);
    } catch (e: any) { toast.error(e.message); }
    setSending(false);
  };
  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); load(); }}>
        <Input placeholder="Search devices by name" value={search} onChange={e => setSearch(e.target.value)} />
        <Button type="submit" disabled={loading}><Search className="h-4 w-4" /></Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>User</TableHead><TableHead>System</TableHead><TableHead>Compliance</TableHead><TableHead>Last check-in</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {items.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.deviceName}<div className="text-xs text-muted-foreground">{[i.manufacturer, i.model].filter(Boolean).join(' ')}</div></TableCell>
                <TableCell>{i.userDisplayName || '—'}<div className="text-xs text-muted-foreground">{i.userPrincipalName}</div></TableCell>
                <TableCell>{[i.operatingSystem, i.osVersion].filter(Boolean).join(' ')}</TableCell>
                <TableCell><Badge variant={i.complianceState === 'compliant' ? 'default' : 'secondary'}>{i.complianceState || 'unknown'}</Badge></TableCell>
                <TableCell>{fmt(i.lastSyncDateTime)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Device actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {['lock', 'restart', 'sync', 'block', 'unblock'].map(k => <DropdownMenuItem key={k} onClick={() => open(i, k)}>{ACTIONS[k].label}</DropdownMenuItem>)}
                      <DropdownMenuSeparator />
                      {['retire', 'wipe'].map(k => <DropdownMenuItem key={k} className="text-destructive" onClick={() => open(i, k)}>{ACTIONS[k].label}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nothing found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
      {next && !loading && <Button variant="outline" onClick={() => load(true)}>Load more</Button>}
      <Dialog open={!!pending} onOpenChange={o => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{meta?.label}: {pending?.device.deviceName}</DialogTitle>
            <DialogDescription>Used by {pending?.device.userDisplayName || pending?.device.userPrincipalName || 'unknown user'}. {meta?.impact}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Type the device name <span className="font-semibold">{pending?.device.deviceName}</span> to confirm.</p>
            <Input value={typed} onChange={e => setTyped(e.target.value)} />
            {meta?.danger && (
              <label className="flex items-start gap-2 text-sm text-destructive">
                <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} className="mt-1" />
                I understand this cannot be undone and the data cannot be recovered.
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
            <Button variant={meta?.danger ? 'destructive' : 'default'} disabled={!ready || sending} onClick={send}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : meta?.label}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamsMeetings() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const soon = new Date(Date.now() + 10 * 60000);
  const local = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`;
  const [organizer, setOrganizer] = useState('fauzakusa@greatpearlcoffee.com');
  const [subject, setSubject] = useState('');
  const [start, setStart] = useState(local);
  const [minutes, setMinutes] = useState(60);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const load = () => call({ meetings: 'list' }).then(d => setList(d.items)).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async (now: boolean) => {
    if (subject.trim().length < 3) { toast.error('Enter a meeting title'); return; }
    setBusy(true);
    try {
      const when = now ? new Date() : new Date(start);
      const d = await call({ meeting: 'create', organizer: organizer.trim(), subject: subject.trim(), start: when.toISOString(), minutes });
      toast.success('Teams meeting created');
      if (now) window.open(d.joinUrl, '_blank', 'noopener');
      setSubject(''); load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const copy = (u: string) => navigator.clipboard.writeText(u).then(() => toast.success('Join link copied'));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="text-xs text-muted-foreground">Title</label><Input value={subject} maxLength={200} onChange={e => setSubject(e.target.value)} placeholder="Management meeting" /></div>
        <div><label className="text-xs text-muted-foreground">Organizer (Microsoft email)</label><Input value={organizer} onChange={e => setOrganizer(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Starts</label><Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Length (minutes)</label><Input type="number" min={15} max={480} value={minutes} onChange={e => setMinutes(Math.max(15, Math.min(480, Number(e.target.value) || 60)))} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => create(true)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Start meeting now</Button>
        <Button variant="outline" disabled={busy} onClick={() => create(false)}>Schedule meeting</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Meeting</TableHead><TableHead>Starts</TableHead><TableHead>Organizer</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {list.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No meetings created yet</TableCell></TableRow>}
          {list.map((m, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{m.subject}</TableCell>
              <TableCell>{m.start ? new Date(m.start).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</TableCell>
              <TableCell>{m.organizer}</TableCell>
              <TableCell className="space-x-2 text-right">{m.joinUrl && <><Button size="sm" variant="outline" onClick={() => copy(m.joinUrl)}>Copy link</Button><Button size="sm" onClick={() => window.open(m.joinUrl, '_blank', 'noopener')}>Join</Button></>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function EntraDirectory() {
  const [ov, setOv] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { call({ view: 'overview' }).then(setOv).catch(e => setErr(e.message)); }, []);
  const stat = (icon: JSX.Element, label: string, value: any) => (
    <Card><CardContent className="flex items-center gap-3 p-4">{icon}<div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold">{value ?? '—'}</p></div></CardContent></Card>
  );
  return (
    <div className="container mx-auto space-y-4 p-4">
      <div><h1 className="text-2xl font-bold">Microsoft 365 Staff & Devices</h1><p className="text-sm text-muted-foreground">Staff and company devices from Microsoft 365. Administrators only; every view and device action is logged.</p></div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {stat(<Building2 className="h-6 w-6 text-primary" />, 'Organization', ov?.organization?.name)}
        {stat(<Users className="h-6 w-6 text-primary" />, 'Accounts', ov?.userCount)}
        {stat(<Laptop className="h-6 w-6 text-primary" />, 'Devices', ov?.deviceCount)}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Directory</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList><TabsTrigger value="users">Staff</TabsTrigger><TabsTrigger value="devices">Devices</TabsTrigger><TabsTrigger value="meetings">Meetings</TabsTrigger></TabsList>
            <TabsContent value="users"><DirectoryList view="users" /></TabsContent>
            <TabsContent value="devices"><ManagedDevices /></TabsContent>
            <TabsContent value="meetings"><TeamsMeetings /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
