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
  const [hiddenSignIn, setHiddenSignIn] = useState(false);
  const load = async (append = false) => {
    setLoading(true); setError(null);
    try {
      const d = await call({ view, search: search || undefined, next: append ? next : undefined });
      setItems(p => (append ? [...p, ...d.items] : d.items)); setNext(d.next); if (!append) setHiddenSignIn(!!d.signInHidden);
    } catch (e: any) { setError(e.message); if (!append) setItems([]); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  return (
    <div className="space-y-3">
      {view === 'users' && hiddenSignIn && <p className="text-xs text-muted-foreground">Last sign-in times need the Microsoft permission AuditLog.Read.All. Each person's devices are listed in the Devices tab.</p>}
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); load(); }}>
        <Input placeholder={view === 'users' ? 'Search staff by name' : 'Search devices by name'} value={search} onChange={e => setSearch(e.target.value)} />
        <Button type="submit" disabled={loading}><Search className="h-4 w-4" /></Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {view === 'users' ? (
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Job / Department</TableHead><TableHead>Status</TableHead><TableHead>Last sign-in</TableHead><TableHead>Created</TableHead></TableRow>
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
                <TableCell>{hiddenSignIn ? 'Needs permission' : fmt(i.signInActivity?.lastSuccessfulSignInDateTime || i.signInActivity?.lastSignInDateTime)}</TableCell>
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
            {!loading && !error && items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nothing found</TableCell></TableRow>}
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
  const [filter, setFilter] = useState<'all' | 'stale' | 'new'>('all');
  const DAY = 86400000;
  const shown = items.filter(i => filter === 'all' ? true : filter === 'stale' ? (!i.lastSyncDateTime || Date.now() - new Date(i.lastSyncDateTime).getTime() > 21 * DAY) : (i.enrolledDateTime && Date.now() - new Date(i.enrolledDateTime).getTime() < 7 * DAY));
  const staleCount = items.filter(i => !i.lastSyncDateTime || Date.now() - new Date(i.lastSyncDateTime).getTime() > 21 * DAY).length;
  const newCount = items.filter(i => i.enrolledDateTime && Date.now() - new Date(i.enrolledDateTime).getTime() < 7 * DAY).length;
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
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All ({items.length})</Button>
        <Button size="sm" variant={filter === 'new' ? 'default' : 'outline'} onClick={() => setFilter('new')}>New this week ({newCount})</Button>
        <Button size="sm" variant={filter === 'stale' ? 'default' : 'outline'} onClick={() => setFilter('stale')}>Not seen for 3+ weeks ({staleCount})</Button>
      </div>
      {newCount > 0 && filter === 'all' && <p className="rounded-md border border-primary/40 bg-primary/5 p-2 text-sm">{newCount} device{newCount > 1 ? 's' : ''} joined in the last 7 days. Check they belong to staff.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>User</TableHead><TableHead>System</TableHead><TableHead>Compliance</TableHead><TableHead>Last check-in</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {shown.map(i => (
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
            {!loading && !error && shown.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nothing found</TableCell></TableRow>}
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

const suggestUpn = (name: string, email?: string) => {
  if (email && email.toLowerCase().endsWith('@greatpearlcoffee.com')) return email.toLowerCase();
  const p = name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/);
  return `${p[0] ?? 'staff'}${p.length > 1 ? '.' + p[p.length - 1] : ''}@greatpearlcoffee.com`;
};

function AccountSync() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [create, setCreate] = useState<any>(null); const [upn, setUpn] = useState(''); const [ack, setAck] = useState(false);
  const [disable, setDisable] = useState<any>(null); const [typed, setTyped] = useState('');
  const [made, setMade] = useState<{ upn: string; tempPassword: string } | null>(null);
  const load = () => { setErr(null); call({ account: 'sync' }).then(setD).catch(e => setErr(e.message)); };
  useEffect(load, []);
  const doCreate = async () => { setBusy(true); try { const r = await call({ account: 'create', employeeId: create.id, upn, acknowledge: true }); setMade({ upn: r.upn, tempPassword: r.tempPassword }); toast.success(r.message); setCreate(null); load(); } catch (e: any) { toast.error(e.message); } setBusy(false); };
  const doDisable = async () => { setBusy(true); try { const r = await call({ account: 'disable', userId: disable.userId, confirmName: typed, acknowledge: true }); toast.success(r.message); setDisable(null); load(); } catch (e: any) { toast.error(e.message); } setBusy(false); };
  return (
    <div className="space-y-5">
      {err && <p className="text-sm text-destructive">{err}</p>}
      {!d && !err && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
      {d && <>
        <div><h3 className="mb-2 font-semibold">Active staff without a Microsoft account ({d.missing.length})</h3>
          <Table><TableBody>{d.missing.map((m: any) => <TableRow key={m.id}><TableCell className="font-medium">{m.name}<div className="text-xs text-muted-foreground">{m.department} {m.email ? `· ${m.email}` : ''}</div></TableCell><TableCell className="text-right"><Button size="sm" onClick={() => { setCreate(m); setUpn(suggestUpn(m.name, m.email)); setAck(false); }}>Create</Button></TableCell></TableRow>)}
            {!d.missing.length && <TableRow><TableCell className="text-center text-muted-foreground">Everyone active has an account</TableCell></TableRow>}</TableBody></Table></div>
        <div><h3 className="mb-2 font-semibold">People who left but can still sign in to Microsoft ({d.leavers.length})</h3>
          <Table><TableBody>{d.leavers.map((l: any) => <TableRow key={l.userId}><TableCell className="font-medium">{l.name}<div className="text-xs text-muted-foreground">{l.upn} · staff record: {l.status}</div></TableCell><TableCell className="text-right"><Button size="sm" variant="destructive" onClick={() => { setDisable(l); setTyped(''); }}>Disable</Button></TableCell></TableRow>)}
            {!d.leavers.length && <TableRow><TableCell className="text-center text-muted-foreground">No leavers with active accounts</TableCell></TableRow>}</TableBody></Table></div>
      </>}
      <Dialog open={!!create} onOpenChange={o => !o && setCreate(null)}>
        <DialogContent><DialogHeader><DialogTitle>Create Microsoft account for {create?.name}</DialogTitle><DialogDescription>A new company sign-in is made. They must change the temporary password the first time. Email needs a Microsoft 365 licence assigned in the admin centre.</DialogDescription></DialogHeader>
          <label className="text-xs text-muted-foreground">Company email address</label><Input value={upn} onChange={e => setUpn(e.target.value.trim())} />
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={ack} onChange={e => setAck(e.target.checked)} />I confirm this person should get a company Microsoft account.</label>
          <DialogFooter><Button variant="outline" onClick={() => setCreate(null)}>Cancel</Button><Button disabled={!ack || busy || !upn.endsWith('@greatpearlcoffee.com')} onClick={doCreate}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={!!disable} onOpenChange={o => !o && setDisable(null)}>
        <DialogContent><DialogHeader><DialogTitle>Disable {disable?.name}</DialogTitle><DialogDescription>They are signed out everywhere and can no longer sign in to Microsoft. Their mailbox and files are kept, and you can turn the account back on in Microsoft.</DialogDescription></DialogHeader>
          <p className="text-sm">Type <span className="font-semibold">{disable?.name}</span> to confirm.</p><Input value={typed} onChange={e => setTyped(e.target.value)} />
          <DialogFooter><Button variant="outline" onClick={() => setDisable(null)}>Cancel</Button><Button variant="destructive" disabled={busy || typed.trim().toLowerCase() !== String(disable?.name).toLowerCase()} onClick={doDisable}>Disable account</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={!!made} onOpenChange={o => !o && setMade(null)}>
        <DialogContent><DialogHeader><DialogTitle>Account created</DialogTitle><DialogDescription>Give these details to the staff member in person. The temporary password is shown only once and is not saved anywhere.</DialogDescription></DialogHeader>
          <p className="text-sm">Sign-in: <span className="font-semibold">{made?.upn}</span></p><p className="text-sm">Temporary password: <span className="font-mono font-semibold">{made?.tempPassword}</span></p>
          <DialogFooter><Button onClick={() => setMade(null)}>Done</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

function OfficialNotices() {
  const [staff, setStaff] = useState<any[]>([]); const [picked, setPicked] = useState<string[]>([]); const [find, setFind] = useState('');
  const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { (supabase as any).from('employees').select('id,name,department,email').eq('status', 'Active').not('disabled', 'is', true).order('name').then(({ data }: any) => setStaff(data ?? [])); }, []);
  const send = async () => { setBusy(true); try { const r = await call({ notice: 'send', subject, body, recipients: picked }); toast.success(r.message); setSubject(''); setBody(''); setPicked([]); } catch (e: any) { toast.error(e.message); } setBusy(false); };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Sent by email from Fauzakusa@greatpearlcoffee.com. Staff are blind-copied so they don't see each other's addresses.</p>
      <Input placeholder="Notice title" maxLength={150} value={subject} onChange={e => setSubject(e.target.value)} />
      <textarea className="min-h-32 w-full rounded-md border bg-background p-2 text-sm" maxLength={5000} placeholder="Message" value={body} onChange={e => setBody(e.target.value)} />
      <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{picked.length} staff chosen</span><div className="space-x-2"><Button size="sm" variant="ghost" onClick={() => setPicked(staff.filter(s => s.email).map(s => s.id))}>All staff</Button><Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button></div></div>
      <Input placeholder="Search staff" value={find} onChange={e => setFind(e.target.value)} />
      <div className="max-h-48 overflow-y-auto rounded-md border p-2">{staff.filter(s => !find || `${s.name} ${s.department ?? ''}`.toLowerCase().includes(find.toLowerCase())).map(s => (
        <label key={s.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" disabled={!s.email} checked={picked.includes(s.id)} onChange={e => setPicked(p => e.target.checked ? [...p, s.id] : p.filter(x => x !== s.id))} /><span>{s.name}</span><span className="text-xs text-muted-foreground">{s.email || 'no email'}</span></label>))}</div>
      <Button disabled={busy || subject.trim().length < 3 || body.trim().length < 5 || !picked.length} onClick={send}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send notice</Button>
    </div>
  );
}

function DocumentBackup() {
  const [d, setD] = useState<any>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const load = () => call({ backup: 'status' }).then(setD).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async () => { setBusy(true); setErr(null); try { const r = await call({ backup: 'run' }); if (r.error) setErr(r.error); toast.success(`Copied ${r.copiedNow} document(s) to SharePoint${r.tooBig ? `, ${r.tooBig} too large` : ''}`); load(); } catch (e: any) { setErr(e.message); } setBusy(false); };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Signed contracts, loan documents and clearance scans are copied to the company SharePoint site, in the folder "Great Agro Coffee Documents". Each click copies up to 15 files that aren't there yet.</p>
      {d && <p className="text-sm">{d.copied} of {d.total} documents copied · {d.pending} waiting</p>}
      {err && <p className="text-sm text-destructive">{err}{/40[13]/.test(err) ? ' Needed Microsoft permission: Sites.ReadWrite.All.' : ''}</p>}
      <Button disabled={busy || d?.pending === 0} onClick={run}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Copy next documents</Button>
    </div>
  );
}

function SecurityReports() {
  const [signins, setSignins] = useState<any[]>([]); const [risky, setRisky] = useState<any[]>([]);
  const [e1, setE1] = useState<string | null>(null); const [e2, setE2] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      call({ view: 'signins' }).then(d => setSignins(d.items)).catch(e => setE1(e.message)),
      call({ view: 'risky' }).then(d => setRisky(d.items)).catch(e => setE2(e.message)),
    ]).finally(() => setLoading(false));
  }, []);
  const flagged = signins.filter(s => (s.riskLevelAggregated && !['none', 'hidden'].includes(s.riskLevelAggregated)) || (s.location?.countryOrRegion && s.location.countryOrRegion !== 'UG') || s.status?.errorCode);
  return (
    <div className="space-y-4">
      {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
      <div>
        <h3 className="mb-2 font-semibold">Accounts Microsoft marks as risky</h3>
        {e2 ? <p className="text-sm text-destructive">{e2} Needed Microsoft permission: IdentityRiskyUser.Read.All (also needs Entra ID P2).</p> : (
          <Table><TableHeader><TableRow><TableHead>Person</TableHead><TableHead>Risk</TableHead><TableHead>State</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
            <TableBody>{risky.length === 0 && !loading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No risky accounts</TableCell></TableRow>}
              {risky.map(r => <TableRow key={r.id}><TableCell>{r.userDisplayName}<div className="text-xs text-muted-foreground">{r.userPrincipalName}</div></TableCell><TableCell><Badge variant="destructive">{r.riskLevel}</Badge></TableCell><TableCell>{r.riskState}</TableCell><TableCell>{fmt(r.riskLastUpdatedDateTime)}</TableCell></TableRow>)}
            </TableBody></Table>)}
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Unusual sign-ins (outside Uganda, failed or risky)</h3>
        {e1 ? <p className="text-sm text-destructive">{e1} Needed Microsoft permission: AuditLog.Read.All (also needs Entra ID P1).</p> : (
          <Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>Person</TableHead><TableHead>Where</TableHead><TableHead>Device</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
            <TableBody>{flagged.length === 0 && !loading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No unusual sign-ins in the latest 50</TableCell></TableRow>}
              {flagged.map(s => <TableRow key={s.id}><TableCell>{new Date(s.createdDateTime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell><TableCell>{s.userDisplayName}<div className="text-xs text-muted-foreground">{s.appDisplayName}</div></TableCell><TableCell>{[s.location?.city, s.location?.countryOrRegion].filter(Boolean).join(', ') || '—'}<div className="text-xs text-muted-foreground">{s.ipAddress}</div></TableCell><TableCell>{[s.deviceDetail?.operatingSystem, s.deviceDetail?.browser].filter(Boolean).join(' · ') || '—'}</TableCell><TableCell>{s.status?.errorCode ? <Badge variant="destructive">Failed</Badge> : <Badge>OK</Badge>}{s.riskLevelAggregated && !['none', 'hidden'].includes(s.riskLevelAggregated) ? <Badge variant="destructive" className="ml-1">{s.riskLevelAggregated} risk</Badge> : null}</TableCell></TableRow>)}
            </TableBody></Table>)}
      </div>
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
  const [staff, setStaff] = useState<any[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [find, setFind] = useState('');
  useEffect(() => { (supabase as any).from('employees').select('id,name,department,phone').eq('status', 'Active').not('disabled', 'is', true).order('name').then(({ data }: any) => setStaff(data ?? [])); }, []);
  const load = () => call({ meetings: 'list' }).then(d => setList(d.items)).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async (now: boolean) => {
    if (subject.trim().length < 3) { toast.error('Enter a meeting title'); return; }
    setBusy(true);
    try {
      const when = now ? new Date() : new Date(start);
      const d = await call({ meeting: 'create', organizer: organizer.trim(), subject: subject.trim(), start: when.toISOString(), minutes, attendees: picked });
      toast.success(d.sms ? `Teams meeting created. SMS sent to ${d.sms.sent}${d.sms.failed ? `, ${d.sms.failed} failed` : ''}${d.sms.skipped ? `, ${d.sms.skipped} without a registered phone` : ''}` : 'Teams meeting created');
      if (now) window.open(d.joinUrl, '_blank', 'noopener');
      setSubject(''); setPicked([]); load();
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
      <div className="space-y-2">
        <div className="flex items-center justify-between"><label className="text-xs text-muted-foreground">Invite staff by SMS ({picked.length} chosen)</label><div className="space-x-2"><Button size="sm" variant="ghost" onClick={() => setPicked(staff.map(s => s.id))}>All staff</Button><Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button></div></div>
        <Input placeholder="Search staff" value={find} onChange={e => setFind(e.target.value)} />
        <div className="max-h-48 overflow-y-auto rounded-md border p-2">
          {staff.filter(s => !find || `${s.name} ${s.department ?? ''}`.toLowerCase().includes(find.toLowerCase())).map(s => (
            <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" checked={picked.includes(s.id)} onChange={e => setPicked(p => e.target.checked ? [...p, s.id] : p.filter(x => x !== s.id))} />
              <span>{s.name}</span><span className="text-xs text-muted-foreground">{s.department}{!s.phone ? ' · no phone' : ''}</span>
            </label>
          ))}
        </div>
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
            <TabsList className="flex h-auto flex-wrap"><TabsTrigger value="users">Staff</TabsTrigger><TabsTrigger value="devices">Devices</TabsTrigger><TabsTrigger value="meetings">Meetings</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger><TabsTrigger value="accounts">Accounts</TabsTrigger><TabsTrigger value="notices">Notices</TabsTrigger><TabsTrigger value="documents">Documents</TabsTrigger></TabsList>
            <TabsContent value="users"><DirectoryList view="users" /></TabsContent>
            <TabsContent value="devices"><ManagedDevices /></TabsContent>
            <TabsContent value="meetings"><TeamsMeetings /></TabsContent>
            <TabsContent value="security"><SecurityReports /></TabsContent>
            <TabsContent value="accounts"><AccountSync /></TabsContent>
            <TabsContent value="notices"><OfficialNotices /></TabsContent>
            <TabsContent value="documents"><DocumentBackup /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
