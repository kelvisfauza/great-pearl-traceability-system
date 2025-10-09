import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface OvertimeAward {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  hours: number;
  minutes: number;
  total_amount: number;
  status: 'pending' | 'claimed' | 'completed';
  reference_number: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  created_by: string;
  notes: string | null;
}

export const useOvertimeAwards = () => {
  const [awards, setAwards] = useState<OvertimeAward[]>([]);
  const [myAwards, setMyAwards] = useState<OvertimeAward[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { employee } = useAuth();

  const fetchAllAwards = async () => {
    try {
      console.log('Fetching all overtime awards...');
      console.log('Current employee:', employee);
      
      const { data, error } = await supabase
        .from('overtime_awards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all awards:', error);
        throw error;
      }
      console.log('All awards fetched:', data);
      console.log('Number of awards:', data?.length);
      setAwards((data || []) as OvertimeAward[]);
    } catch (error) {
      console.error('Error fetching overtime awards:', error);
      toast({
        title: "Error Loading Awards",
        description: "Failed to load overtime awards. Check console for details.",
        variant: "destructive"
      });
    }
  };

  const fetchMyAwards = async () => {
    if (!employee?.email) {
      console.log('No employee email, skipping my awards fetch');
      return;
    }
    
    try {
      console.log('Fetching my overtime awards for:', employee.email);
      const { data, error } = await supabase
        .from('overtime_awards')
        .select('*')
        .eq('employee_email', employee.email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my awards:', error);
        throw error;
      }
      console.log('My awards fetched:', data);
      setMyAwards((data || []) as OvertimeAward[]);
    } catch (error) {
      console.error('Error fetching my overtime awards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAwards();
    fetchMyAwards();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('overtime-awards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'overtime_awards'
        },
        () => {
          fetchAllAwards();
          fetchMyAwards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.email]);

  const createOvertimeAward = async (
    employeeId: string,
    employeeName: string,
    employeeEmail: string,
    department: string,
    hours: number,
    minutes: number,
    notes?: string
  ) => {
    try {
      // Calculate total amount (4000 UGX per hour)
      const totalMinutes = (hours * 60) + minutes;
      const totalAmount = (totalMinutes / 60) * 4000;

      const { error } = await supabase
        .from('overtime_awards')
        .insert({
          employee_id: employeeId,
          employee_name: employeeName,
          employee_email: employeeEmail,
          department,
          hours,
          minutes,
          total_amount: totalAmount,
          created_by: employee?.name || 'Admin',
          notes
        });

      if (error) throw error;

      toast({
        title: "Overtime Awarded",
        description: `Successfully awarded overtime to ${employeeName}`
      });

      return true;
    } catch (error) {
      console.error('Error creating overtime award:', error);
      toast({
        title: "Error",
        description: "Failed to award overtime",
        variant: "destructive"
      });
      return false;
    }
  };

  const claimOvertime = async (awardId: string) => {
    try {
      // Generate reference number
      const refNumber = `OT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { error } = await supabase
        .from('overtime_awards')
        .update({
          status: 'claimed',
          reference_number: refNumber,
          claimed_at: new Date().toISOString()
        })
        .eq('id', awardId);

      if (error) throw error;

      toast({
        title: "Overtime Claimed",
        description: `Your claim reference: ${refNumber}`
      });

      return refNumber;
    } catch (error) {
      console.error('Error claiming overtime:', error);
      toast({
        title: "Error",
        description: "Failed to claim overtime",
        variant: "destructive"
      });
      return null;
    }
  };

  const completeOvertimeClaim = async (awardId: string) => {
    try {
      const { error } = await supabase
        .from('overtime_awards')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: employee?.name || 'Admin'
        })
        .eq('id', awardId);

      if (error) throw error;

      toast({
        title: "Claim Completed",
        description: "Overtime claim has been marked as completed"
      });

      return true;
    } catch (error) {
      console.error('Error completing overtime claim:', error);
      toast({
        title: "Error",
        description: "Failed to complete claim",
        variant: "destructive"
      });
      return false;
    }
  };

  const searchByReference = async (referenceNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('overtime_awards')
        .select('*')
        .eq('reference_number', referenceNumber)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching overtime award:', error);
      return null;
    }
  };

  return {
    awards,
    myAwards,
    loading,
    createOvertimeAward,
    claimOvertime,
    completeOvertimeClaim,
    searchByReference,
    refetch: () => {
      fetchAllAwards();
      fetchMyAwards();
    }
  };
};
