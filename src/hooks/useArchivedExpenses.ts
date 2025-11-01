import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ArchivedExpense {
  id: string;
  original_id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  requestedby: string;
  daterequested: string;
  priority: string;
  status: string;
  details: any;
  financeApproved: boolean;
  adminApproved: boolean;
  financeApprovedAt?: string;
  adminApprovedAt?: string;
  financeApprovedBy?: string;
  adminApprovedBy?: string;
  archived_at: string;
  archived_by: string;
  archive_period: string;
  created_at: string;
}

export const useArchivedExpenses = () => {
  const [archivedExpenses, setArchivedExpenses] = useState<ArchivedExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchivedExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('archived_approval_requests')
        .select('*')
        .order('daterequested', { ascending: false });

      if (error) throw error;

      const expenses: ArchivedExpense[] = data.map((record: any) => ({
        id: record.id,
        original_id: record.original_id,
        type: record.type,
        title: record.title,
        description: record.description,
        amount: parseFloat(record.amount) || 0,
        requestedby: record.requestedby,
        daterequested: record.daterequested,
        priority: record.priority,
        status: record.status,
        details: record.details || {},
        financeApproved: record.finance_approved || false,
        adminApproved: record.admin_approved || false,
        financeApprovedAt: record.finance_approved_at,
        adminApprovedAt: record.admin_approved_at,
        financeApprovedBy: record.finance_approved_by,
        adminApprovedBy: record.admin_approved_by,
        archived_at: record.archived_at,
        archived_by: record.archived_by,
        archive_period: record.archive_period,
        created_at: record.created_at
      }));

      setArchivedExpenses(expenses);
    } catch (error) {
      console.error('Error fetching archived expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedExpenses();
  }, []);

  return {
    archivedExpenses,
    loading,
    refetch: fetchArchivedExpenses
  };
};