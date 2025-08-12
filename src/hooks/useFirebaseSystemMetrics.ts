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

  // Fetch system metrics
  const fetchMetrics = async () => {
    if (!hasPermission('IT Management')) return;

    try {
      const metricsQuery = query(collection(db, 'system_metrics'), orderBy('updated_at', 'desc'));
      const querySnapshot = await getDocs(metricsQuery);
      
      const metricsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemMetric[];
      
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system metrics",
        variant: "destructive"
      });
    }
  };

  // Fetch system services
  const fetchServices = async () => {
    if (!hasPermission('IT Management')) return;

    try {
      const servicesQuery = query(collection(db, 'system_services'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(servicesQuery);
      
      const servicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemService[];
      
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching system services:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system services",
        variant: "destructive"
      });
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

      fetchServices(); // Refresh services list
    } catch (error) {
      console.error('Error updating service status:', error);
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive"
      });
    }
  };

  // Initialize default data if collections are empty
  const initializeSystemData = async () => {
    if (!hasPermission('IT Management')) return;

    try {
      // Check if metrics exist
      const metricsSnapshot = await getDocs(collection(db, 'system_metrics'));
      if (metricsSnapshot.empty) {
        const defaultMetrics = [
          { name: 'CPU Usage', value: 45, status: 'normal', icon: 'Cpu' },
          { name: 'Memory Usage', value: 67, status: 'warning', icon: 'Activity' },
          { name: 'Disk Usage', value: 78, status: 'warning', icon: 'HardDrive' },
          { name: 'Network Load', value: 32, status: 'normal', icon: 'Monitor' }
        ];

        for (const metric of defaultMetrics) {
          await addDoc(collection(db, 'system_metrics'), {
            ...metric,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // Check if services exist
      const servicesSnapshot = await getDocs(collection(db, 'system_services'));
      if (servicesSnapshot.empty) {
        const defaultServices = [
          { name: 'Database Server', status: 'running', uptime: '15 days', icon: 'Database', description: 'Firebase Firestore' },
          { name: 'Web Server', status: 'running', uptime: '15 days', icon: 'Server', description: 'React Application' },
          { name: 'Authentication Service', status: 'running', uptime: '30 days', icon: 'Shield', description: 'Firebase Auth' },
          { name: 'Coffee ERP API', status: 'running', uptime: '15 days', icon: 'Server', description: 'Core API Services' },
          { name: 'Backup Service', status: 'maintenance', uptime: '2 hours', icon: 'HardDrive', description: 'Data Backup System' },
          { name: 'Email Service', status: 'running', uptime: '12 days', icon: 'Mail', description: 'Notification System' }
        ];

        for (const service of defaultServices) {
          await addDoc(collection(db, 'system_services'), {
            ...service,
            last_check: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // Add initial activity
      await addActivity({
        action: 'System monitoring initialized',
        type: 'success',
        details: 'IT Department system monitoring has been configured'
      });

    } catch (error) {
      console.error('Error initializing system data:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await initializeSystemData();
      await fetchMetrics();
      await fetchServices();
      const unsubscribe = fetchActivities();
      setLoading(false);
      return unsubscribe;
    };

    loadData();
  }, []);

  return {
    metrics,
    services,
    activities,
    loading,
    updateServiceStatus,
    addActivity,
    refetch: () => {
      fetchMetrics();
      fetchServices();
    }
  };
};