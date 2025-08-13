import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { usePresenceList } from '@/hooks/usePresenceList';
import { Users } from 'lucide-react';

const statusBadge = (status: string) => {
  switch (status) {
    case 'online':
      return <Badge className="bg-green-100 text-green-800">Online</Badge>;
    case 'away':
      return <Badge className="bg-yellow-100 text-yellow-800">Away</Badge>;
    default:
      return <Badge variant="secondary">Offline</Badge>;
  }
};

const formatDateTime = (ts?: any) => {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    return d ? d.toLocaleString() : '-';
  } catch {
    return '-';
  }
};

const UserPresencePanel = () => {
  const { users, loading, onlineCount } = usePresenceList();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(qq) ||
      (u.email || '').toLowerCase().includes(qq) ||
      (u.department || '').toLowerCase().includes(qq)
    );
  }, [users, q]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> User Presence</CardTitle>
        <CardDescription>
          Monitor who is online, their departments and login times. {onlineCount} online.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Search by name, email, department" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="space-y-2">
          {loading && <div className="text-sm text-muted-foreground">Loading presence...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">No matching users.</div>
          )}
          {!loading && filtered.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="min-w-0">
                <p className="font-medium truncate">{u.name || u.email || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{u.department || '—'} • {u.role || '—'}</p>
                <p className="text-xs text-muted-foreground">Login: {formatDateTime(u.login_time)} • Last seen: {formatDateTime(u.last_seen)}</p>
              </div>
              {statusBadge(u.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserPresencePanel;
