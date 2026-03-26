import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Clock } from 'lucide-react';
import { usePresenceList } from '@/hooks/usePresenceList';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface LoginStats {
  auth_user_id: string;
  employee_name: string;
  employee_email: string;
  last_login_date: string;
  last_login_time: string;
  total_logins: number;
  active_days: number;
}

const formatLastSeen = (dateStr: string, timeStr: string) => {
  try {
    const lastLogin = new Date(timeStr || dateStr);
    const now = new Date();
    const diffMs = now.getTime() - lastLogin.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastLogin.toLocaleDateString();
  } catch {
    return 'Never';
  }
};

const getUsageLevel = (activeDays: number) => {
  // Based on ~26 working days in March
  const rate = (activeDays / 26) * 100;
  if (rate >= 75) return { label: 'High', color: 'bg-green-100 text-green-800', percent: rate };
  if (rate >= 40) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', percent: rate };
  return { label: 'Low', color: 'bg-red-100 text-red-800', percent: rate };
};

const ActiveUsers = () => {
  const { users: presenceUsers, loading: presenceLoading } = usePresenceList();
  const [loginStats, setLoginStats] = useState<LoginStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    const fetchLoginStats = async () => {
      const { data, error } = await supabase
        .from('employee_login_tracker')
        .select('auth_user_id, employee_name, employee_email, login_date, login_time');

      if (data && !error) {
        // Aggregate in JS
        const grouped: Record<string, LoginStats> = {};
        data.forEach((row) => {
          const key = row.auth_user_id;
          if (!grouped[key]) {
            grouped[key] = {
              auth_user_id: row.auth_user_id,
              employee_name: row.employee_name || '',
              employee_email: row.employee_email || '',
              last_login_date: row.login_date,
              last_login_time: row.login_time || row.login_date,
              total_logins: 0,
              active_days: 0,
            };
          }
          grouped[key].total_logins++;
          // Track unique days
          if (row.login_date > grouped[key].last_login_date) {
            grouped[key].last_login_date = row.login_date;
            grouped[key].last_login_time = row.login_time || row.login_date;
          }
        });

        // Count unique active days per user
        const dayMap: Record<string, Set<string>> = {};
        data.forEach((row) => {
          if (!dayMap[row.auth_user_id]) dayMap[row.auth_user_id] = new Set();
          dayMap[row.auth_user_id].add(row.login_date);
        });
        Object.keys(grouped).forEach((key) => {
          grouped[key].active_days = dayMap[key]?.size || 0;
        });

        const sorted = Object.values(grouped).sort((a, b) =>
          b.last_login_date.localeCompare(a.last_login_date)
        );
        setLoginStats(sorted);
      }
      setLoading(false);
    };
    fetchLoginStats();
  }, []);

  const onlineUserIds = useMemo(() => {
    return new Set(presenceUsers.map((u) => u.id));
  }, [presenceUsers]);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return loginStats.filter(
      (u) =>
        u.employee_name.toLowerCase().includes(qq) ||
        u.employee_email.toLowerCase().includes(qq)
    );
  }, [loginStats, q]);

  const onlineCount = filtered.filter((u) => onlineUserIds.has(u.auth_user_id)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Users & Usage
        </CardTitle>
        <CardDescription>
          {onlineCount} online now • {loginStats.length} total users tracked
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Search by name or email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {(loading || presenceLoading) && (
          <div className="text-sm text-muted-foreground">Loading user data...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No matching users.</div>
        )}
        {!loading &&
          filtered.map((u) => {
            const isOnline = onlineUserIds.has(u.auth_user_id);
            const usage = getUsageLevel(u.active_days);
            return (
              <div
                key={u.auth_user_id}
                className="flex items-center justify-between p-3 border rounded-lg gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {(u.employee_name || 'U')
                          .split(' ')
                          .map((s) => s[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{u.employee_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.employee_email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last seen: {isOnline ? 'Now' : formatLastSeen(u.last_login_date, u.last_login_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {u.active_days} days • {u.total_logins} logins
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={Math.min(usage.percent, 100)} className="h-1.5 flex-1 max-w-[120px]" />
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${usage.color}`}>
                        {usage.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Badge className={isOnline ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}>
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
};

export default ActiveUsers;
