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
      console.log('Fetching daily tasks...');
      
      // Mock data since daily_tasks table doesn't exist yet
      const mockTasks: DailyTask[] = [];

      console.log('Daily tasks loaded:', mockTasks.length);
      setTasks(mockTasks);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch daily tasks",
        variant: "destructive"
      });
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