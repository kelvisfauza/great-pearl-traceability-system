import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PresenceRecord {
  id: string;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  role?: string | null;
  status: PresenceStatus;
  online_at?: string;
}

export const usePresenceList = () => {
  const [users, setUsers] = useState<PresenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 Setting up presence list listener');
    const channel: RealtimeChannel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('🔄 Presence sync event. Raw state:', presenceState);
        
        // Convert presence state to array of users
        const userList: PresenceRecord[] = [];
        
        Object.keys(presenceState).forEach((key) => {
          const presences = presenceState[key];
          console.log(`📋 Processing presence key "${key}":`, presences);
          presences.forEach((presence: any) => {
            userList.push({
              id: presence.user_id,
              email: presence.email,
              name: presence.name,
              department: presence.department,
              role: presence.role,
              status: presence.status || 'online',
              online_at: presence.online_at,
            });
          });
        });

        console.log('✅ Updated user list:', userList);
        console.log(`👥 Total users: ${userList.length}, Online: ${userList.filter(u => u.status === 'online').length}`);
        setUsers(userList);
        setLoading(false);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('➕ User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('➖ User left:', key, leftPresences);
      })
      .subscribe((status) => {
        console.log('📡 Presence list channel subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up presence list listener');
      supabase.removeChannel(channel);
    };
  }, []);

  const sorted = useMemo(() => {
    const priority: Record<PresenceStatus, number> = { online: 0, away: 1, offline: 2 };
    return [...users].sort((a, b) => {
      const pa = priority[a.status] ?? 3;
      const pb = priority[b.status] ?? 3;
      if (pa !== pb) return pa - pb;
      
      // Sort by online_at timestamp
      const dateA = a.online_at ? new Date(a.online_at).getTime() : 0;
      const dateB = b.online_at ? new Date(b.online_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [users]);

  const onlineCount = useMemo(() => users.filter((u) => u.status === 'online').length, [users]);

  return { users: sorted, loading, onlineCount };
};
