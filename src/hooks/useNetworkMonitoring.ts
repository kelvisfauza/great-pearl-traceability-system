import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';

export interface NetworkStatus {
  online: boolean;
  download_mbps?: number;
  upload_mbps?: number;
  latency_ms?: number;
  updated_at?: any;
}

export interface NetworkDevice {
  id: string;
  name: string;
  type: 'Router' | 'Switch' | 'Access Point' | string;
  ip: string;
  status: 'online' | 'offline' | 'warning';
  uptime?: string;
  traffic?: string; // e.g., '85%'
}

export interface NetworkTrafficPoint {
  id: string;
  time: string; // 'HH:mm' or ISO
  inbound: number; // Mbps
  outbound: number; // Mbps
}

export const useNetworkMonitoring = () => {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [traffic, setTraffic] = useState<NetworkTrafficPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubStatus = onSnapshot(doc(db, 'network_status', 'summary'), (d) => {
      setStatus(d.exists() ? (d.data() as any) : null);
      setLoading(false);
    });

    const unsubDevices = onSnapshot(collection(db, 'network_devices'), (snap) => {
      setDevices(snap.docs.map((x) => ({ id: x.id, ...(x.data() as any) })) as NetworkDevice[]);
    });

    const unsubTraffic = onSnapshot(query(collection(db, 'network_traffic'), orderBy('time', 'asc')), (snap) => {
      setTraffic(snap.docs.map((x) => ({ id: x.id, ...(x.data() as any) })) as NetworkTrafficPoint[]);
    });

    return () => {
      unsubStatus();
      unsubDevices();
      unsubTraffic();
    };
  }, []);

  const runLatencyCheck = useCallback(async () => {
    const t0 = performance.now();
    try {
      // Lightweight request to measure round-trip time
      await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store', mode: 'no-cors' });
    } catch {
      // ignore; no-cors may throw on some envs, still measure time
    } finally {
      const t1 = performance.now();
      const latency = Math.round(t1 - t0);
      await setDoc(
        doc(db, 'network_status', 'summary'),
        { latency_ms: latency, updated_at: serverTimestamp() },
        { merge: true }
      );
    }
  }, []);

  const updateStatus = useCallback(async (partial: Partial<NetworkStatus>) => {
    await setDoc(doc(db, 'network_status', 'summary'), { ...partial, updated_at: serverTimestamp() }, { merge: true });
  }, []);

  return { status, devices, traffic, loading, runLatencyCheck, updateStatus };
};
