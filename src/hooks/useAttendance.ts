import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  marked_by: string;
  marked_at: string;
  notes?: string;
}

interface WeeklyAllowance {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  week_start_date: string;
  week_end_date: string;
  days_attended: number;
  total_eligible_amount: number;
  amount_requested: number;
  balance_available: number;
}

export const useAttendance = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [weeklyAllowances, setWeeklyAllowances] = useState<WeeklyAllowance[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();
  const { toast } = useToast();

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today)
        .order('employee_name');

      if (error) throw error;
      setAttendance((data || []) as AttendanceRecord[]);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchWeeklyAllowances = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_allowances')
        .select('*')
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setWeeklyAllowances((data || []) as WeeklyAllowance[]);
    } catch (error) {
      console.error('Error fetching weekly allowances:', error);
    }
  };

  const getCurrentWeekAllowance = async (employeeId: string): Promise<WeeklyAllowance | null> => {
    try {
      // Get current week start (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff)).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('weekly_allowances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('week_start_date', weekStart)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching current week allowance:', error);
      return null;
    }
  };

  const markAttendance = async (
    employeeId: string,
    employeeName: string,
    employeeEmail: string,
    status: 'present' | 'absent' | 'leave',
    notes?: string
  ) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('attendance')
        .upsert({
          employee_id: employeeId,
          employee_name: employeeName,
          employee_email: employeeEmail,
          date: today,
          status,
          marked_by: employee?.name || employee?.email || 'Admin',
          notes
        }, {
          onConflict: 'employee_id,date'
        });

      if (error) throw error;

      toast({
        title: "Attendance Marked",
        description: `${employeeName} marked as ${status} for today`,
      });

      await fetchTodayAttendance();
      await fetchWeeklyAllowances();
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  const bulkMarkAttendance = async (employeeIds: string[], employees: any[], status: 'present' | 'absent') => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const records = employees.map(emp => ({
        employee_id: emp.id,
        employee_name: emp.name,
        employee_email: emp.email,
        date: today,
        status,
        marked_by: employee?.name || employee?.email || 'Admin'
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, {
          onConflict: 'employee_id,date'
        });

      if (error) throw error;

      toast({
        title: "Bulk Attendance Marked",
        description: `${records.length} employees marked as ${status}`,
      });

      await fetchTodayAttendance();
      await fetchWeeklyAllowances();
    } catch (error: any) {
      console.error('Error bulk marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to bulk mark attendance",
        variant: "destructive",
      });
    }
  };

  const deductFromAllowance = async (employeeId: string, amount: number) => {
    try {
      const allowance = await getCurrentWeekAllowance(employeeId);
      
      if (!allowance) {
        throw new Error('No allowance found for current week');
      }

      if (allowance.balance_available < amount) {
        throw new Error('Insufficient balance in weekly allowance');
      }

      const { error } = await supabase
        .from('weekly_allowances')
        .update({
          amount_requested: allowance.amount_requested + amount,
          balance_available: allowance.balance_available - amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', allowance.id);

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error('Error deducting from allowance:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchTodayAttendance(), fetchWeeklyAllowances()]);
      setLoading(false);
    };

    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance' },
        () => fetchTodayAttendance()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_allowances' },
        () => fetchWeeklyAllowances()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    attendance,
    weeklyAllowances,
    loading,
    markAttendance,
    bulkMarkAttendance,
    getCurrentWeekAllowance,
    deductFromAllowance,
    refreshAttendance: fetchTodayAttendance,
    refreshAllowances: fetchWeeklyAllowances
  };
};