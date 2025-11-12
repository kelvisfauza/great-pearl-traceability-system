import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { smsService } from '@/services/smsService';

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
    console.log('useOvertimeAwards useEffect triggered');
    console.log('Employee email:', employee?.email);
    console.log('Employee authUserId:', employee?.authUserId);
    
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
          console.log('Realtime update detected for overtime_awards');
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
      console.log('🎯 Creating overtime award with data:', {
        employeeId,
        employeeName,
        employeeEmail,
        department,
        hours,
        minutes,
        notes
      });

      // Calculate total amount (4000 UGX per hour)
      const totalMinutes = (hours * 60) + minutes;
      const totalAmount = (totalMinutes / 60) * 4000;

      const insertData = {
        employee_id: employeeId,
        employee_name: employeeName,
        employee_email: employeeEmail,
        department,
        hours,
        minutes,
        total_amount: totalAmount,
        created_by: employee?.name || 'Admin',
        notes
      };

      console.log('🎯 Insert data:', insertData);

      const { data, error } = await supabase
        .from('overtime_awards')
        .insert(insertData)
        .select();

      console.log('🎯 Insert result:', { data, error });

      if (error) {
        console.error('🎯 Database error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // Send notification to the employee
      try {
        await addDoc(collection(db, 'notifications'), {
          type: 'system',
          title: 'Overtime Awarded',
          message: `You have been awarded overtime of ${hours} hours and ${minutes} minutes (UGX ${totalAmount.toLocaleString()}). Please claim your overtime through the system.`,
          department: 'Human Resources',
          senderName: employee?.name || 'HR Department',
          senderDepartment: 'Human Resources',
          priority: 'High',
          isRead: false,
          targetUser: employeeName,
          createdAt: new Date().toISOString()
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      toast({
        title: "Overtime Awarded",
        description: `Successfully awarded overtime to ${employeeName}`
      });

      return true;
    } catch (error: any) {
      console.error('❌ Error creating overtime award:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to award overtime",
        variant: "destructive"
      });
      return false;
    }
  };

  const claimOvertime = async (awardId: string) => {
    try {
      console.log('🎯 Claiming overtime award:', awardId);
      console.log('🎯 Current employee:', employee);
      
      // Generate reference number
      const refNumber = `OT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      console.log('🎯 Generated reference:', refNumber);
      console.log('🎯 Attempting database update...');

      const { data, error } = await supabase
        .from('overtime_awards')
        .update({
          status: 'claimed',
          reference_number: refNumber,
          claimed_at: new Date().toISOString()
        })
        .eq('id', awardId)
        .select()
        .maybeSingle();

      console.log('🎯 Update result:', { data, error });

      if (error) {
        console.error('🎯 Database error:', error);
        throw error;
      }

      if (!data) {
        console.error('🎯 No data returned - likely RLS policy blocking update');
        throw new Error('Update failed - you may not have permission to claim this award');
      }

      toast({
        title: "Overtime Claimed",
        description: `Your claim reference: ${refNumber}`
      });

      // Refresh data
      fetchAllAwards();
      fetchMyAwards();

      return refNumber;
    } catch (error: any) {
      console.error('🎯 Error claiming overtime:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim overtime",
        variant: "destructive"
      });
      return null;
    }
  };

  const completeOvertimeClaim = async (awardId: string) => {
    try {
      console.log('✅ Completing overtime claim:', awardId);
      console.log('✅ Current employee:', employee);
      
      const { data, error } = await supabase
        .from('overtime_awards')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: employee?.name || 'Admin'
        })
        .eq('id', awardId)
        .select()
        .maybeSingle();

      console.log('✅ Update result:', { data, error });

      if (error) {
        console.error('✅ Database error:', error);
        throw error;
      }

      if (!data) {
        console.error('✅ No data returned - RLS policy blocking update');
        throw new Error('Update failed - you may not have permission to complete this claim');
      }

      // Send notification to the employee
      const awardData = data as OvertimeAward;
      try {
        await addDoc(collection(db, 'notifications'), {
          type: 'system',
          title: 'Overtime Completed',
          message: `Your overtime claim has been completed and paid. Amount: UGX ${awardData.total_amount.toLocaleString()}. Completed by ${employee?.name || 'Finance'}.`,
          department: 'Finance',
          senderName: employee?.name || 'Finance Department',
          senderDepartment: 'Finance',
          priority: 'High',
          isRead: false,
          targetUser: awardData.employee_name,
          createdAt: new Date().toISOString()
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      // Send SMS notification to employee
      try {
        // Get employee phone number
        const { data: employeeData } = await supabase
          .from('employees')
          .select('phone')
          .eq('email', awardData.employee_email)
          .maybeSingle();

        if (employeeData?.phone) {
          const smsMessage = `Great Pearl Coffee: Your overtime claim (Ref: ${awardData.reference_number}) has been completed and paid. Amount: UGX ${awardData.total_amount.toLocaleString()}. Thank you!`;
          
          const smsResult = await smsService.sendSMS(employeeData.phone, smsMessage);
          
          if (smsResult.success) {
            console.log('✅ SMS sent successfully to:', employeeData.phone);
          } else {
            console.error('⚠️ SMS failed:', smsResult.error);
          }
        } else {
          console.log('⚠️ No phone number found for employee:', awardData.employee_email);
        }
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
      }

      toast({
        title: "Claim Completed",
        description: "Overtime claim has been marked as completed and SMS sent"
      });

      // Refresh data
      fetchAllAwards();
      fetchMyAwards();

      return true;
    } catch (error: any) {
      console.error('✅ Error completing overtime claim:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete claim",
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
        .maybeSingle();

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
