import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MoneyRequest {
  id: string;
  user_id: string;
  amount: number;
  request_type: string;
  reason: string;
  status: string;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  finance_approved_at: string | null;
  finance_approved_by: string | null;
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  approval_stage: string;
  payment_slip_generated: boolean;
  payment_slip_number: string | null;
}

export const useSupabaseSalaryRequests = () => {
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('money_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests(data || []);
      console.log('Fetched salary requests from Supabase:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching salary requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch salary requests",
        variant: "destructive"
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRequests = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('money_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests(data || []);
      console.log('Fetched user salary requests from Supabase:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching user salary requests:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch your salary requests",
        variant: "destructive"
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestsByEmail = useCallback(async (email: string) => {
    try {
      console.log('fetchRequestsByEmail called for:', email);
      setLoading(true);
      const { data, error } = await supabase
        .from('money_requests')  
        .select('*')
        .eq('requested_by', email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests(data || []);
      console.log('Fetched email salary requests from Supabase:', data?.length || 0);
      console.log('Setting loading to false');
    } catch (error) {
      console.error('Error fetching email salary requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your salary requests", 
        variant: "destructive"
      });
      setRequests([]);
    } finally {
      console.log('fetchRequestsByEmail - Setting loading to false');
      setLoading(false);
    }
  }, [toast]);

  const createRequest = async (amount: number, reason: string, userId: string, requestedBy: string) => {
    try {
      const { data, error } = await supabase
        .from('money_requests')
        .insert([{
          user_id: userId,
          amount,
          reason,
          request_type: 'salary',
          requested_by: requestedBy,
          status: 'pending',
          approval_stage: 'pending_finance'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Salary request submitted successfully"
      });

      // Refresh the list
      fetchRequests();
      return data;
    } catch (error) {
      console.error('Error creating salary request:', error);
      toast({
        title: "Error",
        description: "Failed to submit salary request",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    // Don't auto-fetch on mount, let components control their own fetching
  }, []);

  return {
    requests,
    loading,
    fetchRequests,
    fetchUserRequests,
    fetchRequestsByEmail,
    createRequest,
    refetch: fetchRequests
  };
};