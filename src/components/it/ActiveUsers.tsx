import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Clock, Wifi, WifiOff, Monitor, Smartphone, Tablet, MapPin, Globe } from 'lucide-react';
import { usePresenceList } from '@/hooks/usePresenceList';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

const formatLastSeen = (dateStr?: string) => {
  try {
    if (!dateStr) return 'Never';
    const lastSeen = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeen.toLocaleDateString();
  } catch {
    return 'Never';
  }
};

const getUsageLevel = (activeDays: number) => {
  const rate = (activeDays / 26) * 100;
  if (rate >= 75) return { label: 'High', color: 'bg-green-100 text-green-800', percent: rate };
  if (rate >= 40) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', percent: rate };
  return { label: 'Low', color: 'bg-red-100 text-red-800', percent: rate };
};

const DeviceIcon = ({ type }: { type?: string | null }) => {
  if (type === 'Mobile') return <Smartphone className="h-3 w-3" />;
  if (type === 'Tablet') return <Tablet className="h-3 w-3" />;
  return <Monitor className="h-3 w-3" />;
};

const ActiveUsers = () => {
  const { users, loading, onlineCount } = usePresenceList();
  const { user } = useAuth();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(qq) ||
        (u.email || '').toLowerCase().includes(qq) ||
        (u.department || '').toLowerCase().includes(qq) ||
        (u.city || '').toLowerCase().includes(qq) ||
        (u.country || '').toLowerCase().includes(qq) ||
        (u.browser || '').toLowerCase().includes(qq)
    );
  }, [users, q]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Users & Usage
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {onlineCount} online now
          </span>
          <span>•</span>
          <span>{users.length} total users tracked</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Search by name, email, department, location, browser..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {loading && (
          <div className="text-sm text-muted-foreground">Loading user data...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No matching users.</div>
        )}
        {!loading &&
          filtered.map((u) => {
            const isOnline = u.status === 'online';
            const isAway = u.status === 'away';
            const isCurrentUser = u.id === user?.id;
            const usage = getUsageLevel(u.active_days || 0);
            const hasLocation = u.city && u.city !== 'unknown';
            const hasDevice = u.browser && u.browser !== 'Unknown';
            
            return (
              <div
                key={u.id}
                className={`flex items-center justify-between p-3 border rounded-lg gap-3 transition-colors ${
                  isCurrentUser ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {(u.name || 'U')
                          .split(' ')
                          .map((s) => s[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                        isOnline
                          ? 'bg-green-500 animate-pulse'
                          : isAway
                          ? 'bg-yellow-500'
                          : 'bg-muted-foreground/30'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {u.name || 'User'}
                      {isCurrentUser && (
                        <span className="ml-1.5 text-xs text-primary font-normal">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email}
                      {u.department && <span> • {u.department}</span>}
                    </p>
                    
                    {/* Location & Device info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {isOnline ? 'Active now' : `Last seen: ${formatLastSeen(u.online_at || u.last_login)}`}
                      </span>
                      
                      {hasLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {u.city}, {u.country}
                        </span>
                      )}
                      
                      {hasDevice && (
                        <span className="flex items-center gap-1">
                          <DeviceIcon type={u.device_type} />
                          {u.browser} • {u.os}
                        </span>
                      )}
                      
                      {u.ip_address && u.ip_address !== 'unknown' && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {u.ip_address}
                        </span>
                      )}
                      
                      {(u.total_logins || 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {u.active_days}d • {u.total_logins} logins
                        </span>
                      )}
                    </div>
                    
                    {(u.active_days || 0) > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={Math.min(usage.percent, 100)} className="h-1.5 flex-1 max-w-[120px]" />
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${usage.color}`}>
                          {usage.label}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    className={
                      isOnline
                        ? 'bg-green-100 text-green-800'
                        : isAway
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {isOnline ? (
                      <><Wifi className="h-3 w-3 mr-1" /> Online</>
                    ) : isAway ? (
                      'Away'
                    ) : (
                      <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                    )}
                  </Badge>
                  {u.device_type && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      <DeviceIcon type={u.device_type} />
                      <span className="ml-1">{u.device_type}</span>
                    </Badge>
                  )}
                  {u.role && (
                    <span className="text-[10px] text-muted-foreground">{u.role}</span>
                  )}
                </div>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
};

export default ActiveUsers;
