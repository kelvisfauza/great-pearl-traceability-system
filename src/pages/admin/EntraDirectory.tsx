import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Laptop, Loader2, Search, Users } from 'lucide-react';

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

export default function EntraDirectory() {
  const [ov, setOv] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { call({ view: 'overview' }).then(setOv).catch(e => setErr(e.message)); }, []);
  const stat = (icon: JSX.Element, label: string, value: any) => (
    <Card><CardContent className="flex items-center gap-3 p-4">{icon}<div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold">{value ?? '—'}</p></div></CardContent></Card>
  );
  return (
    <div className="container mx-auto space-y-4 p-4">
      <div><h1 className="text-2xl font-bold">Microsoft 365 Staff & Devices</h1><p className="text-sm text-muted-foreground">Read-only view from Microsoft Entra. Administrators only; every view is logged.</p></div>
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
            <TabsList><TabsTrigger value="users">Staff</TabsTrigger><TabsTrigger value="devices">Devices</TabsTrigger></TabsList>
            <TabsContent value="users"><DirectoryList view="users" /></TabsContent>
            <TabsContent value="devices"><DirectoryList view="devices" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
