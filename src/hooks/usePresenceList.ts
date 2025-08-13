import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PresenceRecord {
  id: string; // uid
  name?: string | null;
  email?: string | null;
  department?: string | null;
  role?: string | null;
  status: PresenceStatus;
  login_time?: any;
  last_seen?: any;
}

export const usePresenceList = () => {
  const [users, setUsers] = useState<PresenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'presence'));
    const unsub = onSnapshot(q, (snap) => {
      const list: PresenceRecord[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const sorted = useMemo(() => {
    const priority: Record<PresenceStatus, number> = { online: 0, away: 1, offline: 2 };
    return [...users].sort((a, b) => {
      const pa = priority[a.status] ?? 3;
      const pb = priority[b.status] ?? 3;
      if (pa !== pb) return pa - pb;
      const la = (a.last_seen?.toMillis?.() ?? 0) as number;
      const lb = (b.last_seen?.toMillis?.() ?? 0) as number;
      return lb - la;
    });
  }, [users]);

  const onlineCount = useMemo(() => users.filter((u) => u.status === 'online').length, [users]);

  return { users: sorted, loading, onlineCount };
};
