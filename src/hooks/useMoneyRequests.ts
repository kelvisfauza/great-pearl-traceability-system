import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MoneyRequest {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  status: string;
  requested_by: string;
  approval_stage: string;
  finance_approved_by?: string;
  finance_approved_at?: string;
  admin_approved_by?: string;
  admin_approved_at?: string;
  created_at: string;
  updated_at: string;
  isArchived?: boolean;
}

export const useMoneyRequests = () => {
  const [moneyRequests, setMoneyRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMoneyRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch current money requests
      const { data: currentData, error: currentError } = await supabase
        .from('money_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentError) throw currentError;

      // Fetch archived money requests
      const { data: archivedData, error: archivedError } = await supabase
        .from('archived_money_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (archivedError && archivedError.code !== 'PGRST116') {
        console.error('Error fetching archived money requests:', archivedError);
      }

      // Combine and format data
      const currentRequests: MoneyRequest[] = (currentData || []).map((req: any) => ({
        id: req.id,
        user_id: req.user_id,
        amount: parseFloat(req.amount) || 0,
        reason: req.reason,
        status: req.status,
        requested_by: req.requested_by,
        approval_stage: req.approval_stage,
        finance_approved_by: req.finance_approved_by,
        finance_approved_at: req.finance_approved_at,
        admin_approved_by: req.admin_approved_by,
        admin_approved_at: req.admin_approved_at,
        created_at: req.created_at,
        updated_at: req.updated_at,
        isArchived: false
      }));

      const archivedRequests: MoneyRequest[] = (archivedData || []).map((req: any) => ({
        id: req.id,
        user_id: req.original_id || req.id,
        amount: parseFloat(req.amount) || 0,
        reason: req.reason,
        status: req.status,
        requested_by: req.employee_name || req.requested_by || 'Unknown',
        approval_stage: 'approved',
        finance_approved_by: req.approved_by,
        finance_approved_at: req.approved_at,
        admin_approved_by: req.approved_by,
        admin_approved_at: req.approved_at,
        created_at: req.created_at,
        updated_at: req.created_at,
        isArchived: true
      }));

      setMoneyRequests([...currentRequests, ...archivedRequests]);
    } catch (error) {
      console.error('Error fetching money requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoneyRequests();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('money_requests_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'money_requests' },
        () => fetchMoneyRequests()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    moneyRequests,
    loading,
    refetch: fetchMoneyRequests
  };
};
