
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
      console.log('Fetching daily tasks from Firebase...');
      
      const targetDate = date || new Date().toISOString().split('T')[0];
      console.log('Target date:', targetDate);
      
      // First try to get all tasks to see what's available
      const allTasksQuery = query(collection(db, 'daily_tasks'));
      const allSnapshot = await getDocs(allTasksQuery);
      console.log('Total daily tasks in database:', allSnapshot.docs.length);
      
      if (allSnapshot.docs.length > 0) {
        console.log('Sample task data:', allSnapshot.docs[0].data());
      }
      
      // Now try to get tasks for the specific date
      const tasksQuery = query(
        collection(db, 'daily_tasks'),
        where('date', '==', targetDate),
        orderBy('completed_at', 'desc')
      );
      
      const snapshot = await getDocs(tasksQuery);
      console.log('Daily tasks found for date:', snapshot.docs.length);
      
      const tasksData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Processing task:', data);
        
        return {
          id: doc.id,
          task_type: data.task_type || 'Unknown',
          description: data.description || 'No description',
          amount: data.amount || undefined,
          batch_number: data.batch_number || undefined,
          completed_at: data.completed_at ? 
            (typeof data.completed_at === 'string' ? 
              data.completed_at : 
              new Date(data.completed_at.seconds * 1000).toLocaleTimeString()
            ) : new Date().toLocaleTimeString(),
          completed_by: data.completed_by || 'Unknown',
          date: data.date || targetDate,
          department: data.department || 'General'
        };
      }) as DailyTask[];

      console.log('Processed daily tasks:', tasksData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast({
        title: "Error",
        description: `Failed to fetch daily tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      
      // Set empty array on error
      setTasks([]);
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
