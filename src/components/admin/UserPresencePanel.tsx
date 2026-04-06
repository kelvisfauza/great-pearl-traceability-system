import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { usePresenceList } from '@/hooks/usePresenceList';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Wifi, WifiOff, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const formatLastSeen = (dateStr?: string) => {
  try {
    if (!dateStr) return '-';
    const lastSeen = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return lastSeen.toLocaleDateString();
  } catch {
    return '-';
  }
};

const UserPresencePanel = () => {
  const { users, loading, onlineCount } = usePresenceList();
  const { user } = useAuth();
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
        <CardDescription className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {onlineCount} online now
          </span>
          <span>•</span>
          <span>Refreshes every 30s</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search by name, email, department" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="space-y-2">
          {loading && <div className="text-sm text-muted-foreground">Loading presence...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">No matching users.</div>
          )}
          {!loading && filtered.map((u) => {
            const isOnline = u.status === 'online';
            const isAway = u.status === 'away';
            const isCurrentUser = u.id === user?.id;

            return (
              <div key={u.id} className={`flex items-center justify-between p-2.5 border rounded-lg ${isCurrentUser ? 'border-primary/30 bg-primary/5' : ''}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {(u.name || 'U').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-background ${
                      isOnline ? 'bg-green-500 animate-pulse' : isAway ? 'bg-yellow-500' : 'bg-muted-foreground/30'
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {u.name || u.email || 'User'}
                      {isCurrentUser && <span className="ml-1 text-xs text-primary font-normal">(You)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.department || '—'} • {u.role || '—'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {isOnline ? 'Active now' : `Last seen: ${formatLastSeen(u.online_at || u.last_login)}`}
                    </p>
                  </div>
                </div>
                <Badge className={
                  isOnline ? 'bg-green-100 text-green-800' :
                  isAway ? 'bg-yellow-100 text-yellow-800' :
                  'bg-muted text-muted-foreground'
                }>
                  {isOnline ? <><Wifi className="h-3 w-3 mr-1" />Online</> : isAway ? 'Away' : <><WifiOff className="h-3 w-3 mr-1" />Offline</>}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserPresencePanel;
