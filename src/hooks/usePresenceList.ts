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
  // Device & location info
  ip_address?: string | null;
  city?: string | null;
  country?: string | null;
  browser?: string | null;
  os?: string | null;
  device_type?: string | null;
  device_model?: string | null;
  location_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const isRecentlyOnline = (lastSeen: string | null, dbStatus: string) => {
  if (!lastSeen) return false;
  if (dbStatus === 'offline') return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 120000;
};

export const usePresenceList = () => {
  const [users, setUsers] = useState<PresenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUsers = async () => {
    try {
      const [loginRes, presenceRes, employeeRes] = await Promise.all([
        supabase
          .from('employee_login_tracker')
          .select('auth_user_id, employee_name, employee_email, login_date, login_time'),
        supabase
          .from('user_presence')
          .select('user_id, status, last_seen, ip_address, city, country, browser, os, device_type, device_model, location_address, latitude, longitude'),
        supabase
          .from('employees')
          .select('auth_user_id, name, email, department, role')
          .eq('status', 'Active'),
      ]);

      const presenceMap = new Map<string, any>();
      (presenceRes.data || []).forEach(p => {
        presenceMap.set(p.user_id, p);
      });

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

      const employeeMap = new Map<string, any>();
      (employeeRes.data || []).forEach(emp => {
        if (emp.auth_user_id) employeeMap.set(emp.auth_user_id, emp);
      });

      const allUserIds = new Set([...loginMap.keys(), ...employeeMap.keys()]);
      const userList: PresenceRecord[] = [];

      allUserIds.forEach(uid => {
        const emp = employeeMap.get(uid);
        const login = loginMap.get(uid);
        const p = presenceMap.get(uid);

        const dbStatus = p?.status || 'offline';
        const lastSeen = p?.last_seen || null;
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
          ip_address: p?.ip_address || null,
          city: p?.city || null,
          country: p?.country || null,
          browser: p?.browser || null,
          os: p?.os || null,
          device_type: p?.device_type || null,
          device_model: p?.device_model || null,
          location_address: p?.location_address || null,
          latitude: p?.latitude || null,
          longitude: p?.longitude || null,
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

    // Poll every 5 seconds for near-realtime online user updates
    const interval = setInterval(fetchUsers, 5000);

    // Also subscribe to realtime changes on user_presence for instant updates
    const channel = supabase
      .channel('presence-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
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
