import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';

export type AlertSeverity = 'low' | 'medium' | 'high';
export type AlertStatus = 'open' | 'investigating' | 'dismissed' | 'resolved';

export interface SecurityAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  count: number;
  details: string;
  created_at?: any; // Firestore timestamp
  updated_at?: any; // Firestore timestamp
  status: AlertStatus;
}

export const useSecurityAlerts = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'security_alerts'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: SecurityAlert[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAlerts(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const markStatus = useCallback(async (id: string, status: AlertStatus) => {
    await updateDoc(doc(db, 'security_alerts', id), {
      status,
      updated_at: serverTimestamp(),
    });
  }, []);

  const dismiss = useCallback((id: string) => markStatus(id, 'dismissed'), [markStatus]);
  const investigate = useCallback((id: string) => markStatus(id, 'investigating'), [markStatus]);
  const resolve = useCallback((id: string) => markStatus(id, 'resolved'), [markStatus]);

  // Optional helper to seed a sample alert (not used in UI)
  const addSample = useCallback(async () => {
    await addDoc(collection(db, 'security_alerts'), {
      type: 'Failed Login Attempts',
      severity: 'medium',
      count: 3,
      details: 'Multiple failed login attempts',
      status: 'open',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }, []);

  const openAlerts = useMemo(() => alerts.filter(a => a.status === 'open' || a.status === 'investigating'), [alerts]);

  return { alerts, openAlerts, loading, dismiss, investigate, resolve, addSample };
};
