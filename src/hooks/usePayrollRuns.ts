import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PayrollRun {
  id: string;
  month: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'disbursed' | 'rejected';
  total_gross: number;
  total_nssf_employee: number;
  total_nssf_employer: number;
  total_paye: number;
  total_net: number;
  employee_count: number;
  created_by: string | null;
  created_by_email: string | null;
  approved_by: string | null;
  approved_by_email: string | null;
  approved_at: string | null;
  disbursed_at: string | null;
  preview: any;
  created_at: string;
}

export const usePayrollRuns = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('payroll_runs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast({ title: 'Failed to load payroll runs', description: error.message, variant: 'destructive' });
    } else {
      setRuns((data || []) as PayrollRun[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const generatePreview = async (month: string, createdBy: string, createdByEmail: string) => {
    const { data, error } = await supabase.functions.invoke('run-payroll-preview', {
      body: { month, createdBy, createdByEmail },
    });
    if (error) throw error;
    if (data?.ok === false) throw new Error(data.error || 'Failed to generate preview');
    await fetchRuns();
    return data.run as PayrollRun;
  };

  const approveAndDisburse = async (runId: string, approvedBy: string, approvedByEmail: string) => {
    const { data, error } = await supabase.functions.invoke('approve-payroll-run', {
      body: { runId, approvedBy, approvedByEmail, disburse: true },
    });
    if (error) throw error;
    if (data?.ok === false) throw new Error(data.error || 'Approval failed');
    await fetchRuns();
    return data;
  };

  const reject = async (runId: string) => {
    const { error } = await (supabase as any).from('payroll_runs').update({ status: 'rejected' }).eq('id', runId);
    if (error) throw error;
    await fetchRuns();
  };

  return { runs, loading, refetch: fetchRuns, generatePreview, approveAndDisburse, reject };
};