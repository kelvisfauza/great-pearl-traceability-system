
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      
      // Fetch from daily_tasks table
      const { data: dailyTasksData, error: dailyTasksError } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('date', targetDate)
        .order('completed_at', { ascending: false });

      if (dailyTasksError) throw dailyTasksError;

      // Convert to DailyTask format
      const compiledTasks: DailyTask[] = (dailyTasksData || []).map(task => ({
        id: task.id,
        task_type: task.task_type,
        description: task.description,
        amount: task.amount ? Number(task.amount) : undefined,
        batch_number: task.batch_number || undefined,
        completed_at: new Date(task.completed_at).toLocaleTimeString(),
        completed_by: task.completed_by,
        date: task.date,
        department: task.department
      }));

      setTasks(compiledTasks);
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
