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

  // Get real browser network info
  const updateBrowserNetworkInfo = useCallback(async () => {
    try {
      const isOnline = navigator.onLine;
      
      // Get connection info if available (Chrome/Edge)
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      let downloadMbps, uploadMbps;
      if (connection) {
        // Convert from Mbps to our format
        downloadMbps = connection.downlink ? Math.round(connection.downlink) : undefined;
        // Upload speed not available in API, estimate as 80% of download for typical connections
        uploadMbps = downloadMbps ? Math.round(downloadMbps * 0.8) : undefined;
      }

      const browserStatus: NetworkStatus = {
        online: isOnline,
        download_mbps: downloadMbps,
        upload_mbps: uploadMbps,
        updated_at: serverTimestamp(),
      };

      setStatus(browserStatus);
      
      // Also update Firestore
      await setDoc(doc(db, 'network_status', 'summary'), browserStatus, { merge: true });
    } catch (error) {
      console.error('Error getting browser network info:', error);
    }
  }, []);

  useEffect(() => {
    // Initial network check
    updateBrowserNetworkInfo();

    // Listen for online/offline changes
    const handleOnline = () => updateBrowserNetworkInfo();
    const handleOffline = () => updateBrowserNetworkInfo();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes (if supported)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateBrowserNetworkInfo);
    }

    const unsubStatus = onSnapshot(doc(db, 'network_status', 'summary'), (d) => {
      if (d.exists()) {
        const firestoreData = d.data() as any;
        // Merge browser data with Firestore data, preferring fresh browser data for online status
        setStatus(prev => ({
          ...firestoreData,
          online: navigator.onLine, // Always use real browser status
          ...(prev?.download_mbps && { download_mbps: prev.download_mbps }),
          ...(prev?.upload_mbps && { upload_mbps: prev.upload_mbps }),
        }));
      }
      setLoading(false);
    });

    const unsubDevices = onSnapshot(collection(db, 'network_devices'), (snap) => {
      setDevices(snap.docs.map((x) => ({ id: x.id, ...(x.data() as any) })) as NetworkDevice[]);
    });

    const unsubTraffic = onSnapshot(query(collection(db, 'network_traffic'), orderBy('time', 'asc')), (snap) => {
      setTraffic(snap.docs.map((x) => ({ id: x.id, ...(x.data() as any) })) as NetworkTrafficPoint[]);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateBrowserNetworkInfo);
      }
      unsubStatus();
      unsubDevices();
      unsubTraffic();
    };
  }, [updateBrowserNetworkInfo]);

  const runLatencyCheck = useCallback(async () => {
    const t0 = performance.now();
    try {
      // Test multiple endpoints for better accuracy
      const endpoints = [
        'https://www.cloudflare.com/cdn-cgi/trace',
        'https://httpbin.org/ip',
        'https://api.github.com',
      ];
      
      // Try first available endpoint
      for (const url of endpoints) {
        try {
          await fetch(url, { 
            cache: 'no-store', 
            mode: 'no-cors',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          break; // Success, exit loop
        } catch {
          continue; // Try next endpoint
        }
      }
    } catch {
      // All endpoints failed, but still measure time
    } finally {
      const t1 = performance.now();
      const latency = Math.round(t1 - t0);
      
      // Update both local state and Firestore
      const updatedStatus = { 
        ...status, 
        latency_ms: latency, 
        updated_at: serverTimestamp() 
      };
      setStatus(updatedStatus);
      
      await setDoc(
        doc(db, 'network_status', 'summary'),
        { latency_ms: latency, updated_at: serverTimestamp() },
        { merge: true }
      );
    }
  }, [status]);

  const updateStatus = useCallback(async (partial: Partial<NetworkStatus>) => {
    await setDoc(doc(db, 'network_status', 'summary'), { ...partial, updated_at: serverTimestamp() }, { merge: true });
  }, []);

  return { status, devices, traffic, loading, runLatencyCheck, updateStatus };
};
