import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { usePresenceList } from '@/hooks/usePresenceList';

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

const formatTime = (ts?: string) => {
  try {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleTimeString();
  } catch {
    return '-';
  }
};

const ActiveUsers = () => {
  const { users, loading, onlineCount } = usePresenceList();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Users
        </CardTitle>
        <CardDescription>
          {onlineCount} online • {users.length} total tracked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Loading presence...</div>}
          {!loading && users.length === 0 && (
            <div className="text-sm text-muted-foreground">No users tracked yet.</div>
          )}
          {!loading && users.slice(0, 10).map((u) => (
            <div key={u.id} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {(u.name || u.email || 'U')
                      .split(' ')
                      .map((s) => s[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{u.name || u.email || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.department || '—'} • {u.role || 'User'} • Online: {formatTime(u.online_at)}
                  </p>
                </div>
              </div>
              {statusBadge(u.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveUsers;
