import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PresenceRecord {
  id: string;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  role?: string | null;
  status: PresenceStatus;
  online_at?: string;
  last_login?: string;
  total_logins?: number;
  active_days?: number;
}

// Consider online if last_seen within 2 minutes
const isRecentlyOnline = (lastSeen: string | null, dbStatus: string) => {
  if (!lastSeen) return false;
  if (dbStatus === 'offline') return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 120000; // 2 minutes
};

export const usePresenceList = () => {
  const [users, setUsers] = useState<PresenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUsers = async () => {
    try {
      // Fetch login tracker data + presence in parallel
      const [loginRes, presenceRes, employeeRes] = await Promise.all([
        supabase
          .from('employee_login_tracker')
          .select('auth_user_id, employee_name, employee_email, login_date, login_time'),
        supabase
          .from('user_presence')
          .select('user_id, status, last_seen'),
        supabase
          .from('employees')
          .select('auth_user_id, name, email, department, role')
          .eq('status', 'Active'),
      ]);

      const presenceMap = new Map<string, { status: string; last_seen: string }>();
      (presenceRes.data || []).forEach(p => {
        presenceMap.set(p.user_id, { status: p.status, last_seen: p.last_seen });
      });

      // Aggregate login stats
      const loginMap = new Map<string, { name: string; email: string; lastDate: string; lastTime: string; totalLogins: number; activeDays: Set<string> }>();
      (loginRes.data || []).forEach(row => {
        const key = row.auth_user_id;
        if (!loginMap.has(key)) {
          loginMap.set(key, {
            name: row.employee_name || '',
            email: row.employee_email || '',
            lastDate: row.login_date,
            lastTime: row.login_time || row.login_date,
            totalLogins: 0,
            activeDays: new Set(),
          });
        }
        const entry = loginMap.get(key)!;
        entry.totalLogins++;
        entry.activeDays.add(row.login_date);
        if (row.login_date > entry.lastDate) {
          entry.lastDate = row.login_date;
          entry.lastTime = row.login_time || row.login_date;
        }
      });

      // Build user list from employees
      const employeeMap = new Map<string, any>();
      (employeeRes.data || []).forEach(emp => {
        if (emp.auth_user_id) {
          employeeMap.set(emp.auth_user_id, emp);
        }
      });

      // Merge all data sources
      const allUserIds = new Set([...loginMap.keys(), ...employeeMap.keys()]);
      const userList: PresenceRecord[] = [];

      allUserIds.forEach(uid => {
        const emp = employeeMap.get(uid);
        const login = loginMap.get(uid);
        const presence = presenceMap.get(uid);

        const dbStatus = presence?.status || 'offline';
        const lastSeen = presence?.last_seen || null;
        const online = isRecentlyOnline(lastSeen, dbStatus);

        userList.push({
          id: uid,
          name: emp?.name || login?.name || null,
          email: emp?.email || login?.email || null,
          department: emp?.department || null,
          role: emp?.role || null,
          status: online ? (dbStatus as PresenceStatus) : 'offline',
          online_at: lastSeen || undefined,
          last_login: login?.lastTime || undefined,
          total_logins: login?.totalLogins || 0,
          active_days: login?.activeDays.size || 0,
        });
      });

      setUsers(userList);
    } catch (error) {
      console.error('Error fetching presence list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Refresh every 30 seconds
    const interval = setInterval(fetchUsers, 30000);

    return () => clearInterval(interval);
  }, []);

  const sorted = useMemo(() => {
    const priority: Record<PresenceStatus, number> = { online: 0, away: 1, offline: 2 };
    return [...users].sort((a, b) => {
      const pa = priority[a.status] ?? 3;
      const pb = priority[b.status] ?? 3;
      if (pa !== pb) return pa - pb;
      const dateA = a.online_at ? new Date(a.online_at).getTime() : 0;
      const dateB = b.online_at ? new Date(b.online_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [users]);

  const onlineCount = useMemo(() => users.filter(u => u.status === 'online' || u.status === 'away').length, [users]);

  return { users: sorted, loading, onlineCount, refetch: fetchUsers };
};
