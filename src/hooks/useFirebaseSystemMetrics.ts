import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface SystemMetric {
  id: string;
  name: string;
  value: number;
  status: 'normal' | 'warning' | 'error';
  icon: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface SystemService {
  id: string;
  name: string;
  status: 'running' | 'maintenance' | 'error' | 'stopped';
  uptime: string;
  icon: string;
  description?: string;
  last_check: string;
  created_at: string;
  updated_at: string;
}

export interface SystemActivity {
  id: string;
  timestamp: string;
  action: string;
  type: 'success' | 'warning' | 'error' | 'info';
  details?: string;
  user_id?: string;
  created_at: string;
}

export const useFirebaseSystemMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<SystemService[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  // Realtime system metrics listener
  const listenMetrics = () => {
    if (!hasPermission('IT Management')) return () => {};

    try {
      const metricsQuery = query(collection(db, 'system_metrics'), orderBy('updated_at', 'desc'));
      const unsubscribe = onSnapshot(metricsQuery, (snapshot) => {
        const metricsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SystemMetric[];
        setMetrics(metricsData);
        setLoading(false);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error listening to system metrics:', error);
      toast({ title: 'Error', description: 'Failed to listen for system metrics', variant: 'destructive' });
      return () => {};
    }
  };

  // Realtime system services listener
  const listenServices = () => {
    if (!hasPermission('IT Management')) return () => {};

    try {
      const servicesQuery = query(collection(db, 'system_services'), orderBy('name', 'asc'));
      const unsubscribe = onSnapshot(servicesQuery, (snapshot) => {
        const servicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SystemService[];
        setServices(servicesData);
        setLoading(false);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error listening to system services:', error);
      toast({ title: 'Error', description: 'Failed to listen for system services', variant: 'destructive' });
      return () => {};
    }
  };

  // Fetch system activities with real-time updates
  const fetchActivities = () => {
    if (!hasPermission('IT Management')) return;

    try {
      const activitiesQuery = query(
        collection(db, 'system_activities'), 
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
        const activitiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SystemActivity[];
        
        setActivities(activitiesData.slice(0, 10)); // Only keep latest 10 activities
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up activities listener:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system activities",
        variant: "destructive"
      });
    }
  };

  // Add system activity
  const addActivity = async (activity: Omit<SystemActivity, 'id' | 'created_at' | 'timestamp'>) => {
    if (!hasPermission('IT Management')) return;

    try {
      await addDoc(collection(db, 'system_activities'), {
        ...activity,
        timestamp: serverTimestamp(),
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding system activity:', error);
      toast({
        title: "Error",
        description: "Failed to log system activity",
        variant: "destructive"
      });
    }
  };

  // Update service status
  const updateServiceStatus = async (serviceId: string, status: SystemService['status'], uptime?: string) => {
    if (!hasPermission('IT Management')) return;

    try {
      await updateDoc(doc(db, 'system_services', serviceId), {
        status,
        ...(uptime && { uptime }),
        last_check: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Log activity
      await addActivity({
        action: `Service ${status === 'running' ? 'started' : status === 'stopped' ? 'stopped' : 'updated'}`,
        type: status === 'running' ? 'success' : status === 'error' ? 'error' : 'info',
        details: `Service status updated to ${status}`
      });

      toast({
        title: "Success",
        description: "Service status updated successfully"
      });

      // Realtime listeners will reflect the change automatically
    } catch (error) {
      console.error('Error updating service status:', error);
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive"
      });
    }
  };

  // Default data initialization removed to avoid dummy data. Expect real documents in
  // 'system_metrics', 'system_services', and 'system_activities' collections.


  useEffect(() => {
    setLoading(true);
    const unsubs: Array<() => void> = [];
    const u1 = listenMetrics();
    const u2 = listenServices();
    const u3 = fetchActivities();
    if (u1) unsubs.push(u1);
    if (u2) unsubs.push(u2);
    if (u3) unsubs.push(u3);
    setLoading(false);
    return () => {
      unsubs.forEach((u) => {
        try { u && u(); } catch {}
      });
    };
  }, []);

  return {
    metrics,
    services,
    activities,
    loading,
    updateServiceStatus,
    addActivity,
    refetch: () => {}
  };
};