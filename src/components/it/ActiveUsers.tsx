import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { usePresenceList } from '@/hooks/usePresenceList';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const formatLastSeen = (ts?: string) => {
  try {
    if (!ts) return 'Never';
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

interface SessionRecord {
  user_id: string;
  last_activity: string;
  device_info: string;
  user_agent: string;
}

const ActiveUsers = () => {
  const { users, loading, onlineCount } = usePresenceList();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('user_sessions')
        .select('user_id, last_activity, device_info, user_agent')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });
      if (data) setSessions(data);
    };
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSessionInfo = (userId: string) => {
    return sessions.find(s => s.user_id === userId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Users
        </CardTitle>
        <CardDescription>
          {onlineCount} online now • {users.length} tracked via presence • {sessions.length} active sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Loading presence...</div>}
          {!loading && users.length === 0 && (
            <div className="text-sm text-muted-foreground">No users online right now.</div>
          )}
          {!loading && users.map((u) => {
            const session = getSessionInfo(u.id);
            return (
              <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                      {u.department || '—'} • {u.role || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Online since: {formatTime(u.online_at)}
                      {session && <> • Last activity: {formatLastSeen(session.last_activity)}</>}
                    </p>
                    {session && (
                      <p className="text-xs text-muted-foreground/60">
                        {session.device_info}
                      </p>
                    )}
                  </div>
                </div>
                {statusBadge(u.status)}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveUsers;
