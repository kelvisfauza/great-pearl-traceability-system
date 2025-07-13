
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export interface DailyTask {
  id: string;
  task_type: string;
  description: string;
  amount?: number;
  batch_number?: string;
  completed_at: string;
  completed_by: string;
  date: string;
  department: string;
}

export const useDailyTasks = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDailyTasks = async (date?: string) => {
    try {
      setLoading(true);
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const tasksQuery = query(
        collection(db, 'daily_tasks'),
        where('date', '==', targetDate),
        orderBy('completed_at', 'desc')
      );
      
      const snapshot = await getDocs(tasksQuery);
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completed_at: new Date(doc.data().completed_at).toLocaleTimeString(),
      })) as DailyTask[];

      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch daily tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyTasks();
  }, []);

  return {
    tasks,
    loading,
    fetchDailyTasks,
    refetch: fetchDailyTasks
  };
};
