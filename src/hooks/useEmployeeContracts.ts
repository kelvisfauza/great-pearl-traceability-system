import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeContract {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_gac_id: string | null;
  contract_type: string;
  position: string;
  department: string;
  contract_start_date: string;
  contract_end_date: string | null;
  contract_duration_months: number | null;
  salary: number;
  status: string;
  renewal_count: number;
  renewed_from_id: string | null;
  notes: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useEmployeeContracts = () => {
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({ title: "Error", description: "Failed to fetch contracts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addContract = async (contractData: Omit<EmployeeContract, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('employee_contracts')
        .insert([contractData as any])
        .select()
        .single();

      if (error) throw error;
      setContracts(prev => [data as any, ...prev]);
      toast({ title: "Success", description: "Contract added successfully" });
      return data;
    } catch (error) {
      console.error('Error adding contract:', error);
      toast({ title: "Error", description: "Failed to add contract", variant: "destructive" });
      throw error;
    }
  };

  const updateContract = async (id: string, updates: Partial<EmployeeContract>) => {
    try {
      const { data, error } = await supabase
        .from('employee_contracts')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setContracts(prev => prev.map(c => c.id === id ? (data as any) : c));
      toast({ title: "Success", description: "Contract updated successfully" });
      return data;
    } catch (error) {
      console.error('Error updating contract:', error);
      toast({ title: "Error", description: "Failed to update contract", variant: "destructive" });
      throw error;
    }
  };

  const renewContract = async (contractId: string, newEndDate: string, newDurationMonths: number) => {
    try {
      const original = contracts.find(c => c.id === contractId);
      if (!original) throw new Error('Contract not found');

      // Mark old as renewed
      await supabase
        .from('employee_contracts')
        .update({ status: 'Renewed' } as any)
        .eq('id', contractId);

      // Create new contract
      const newContract = {
        employee_id: original.employee_id,
        employee_name: original.employee_name,
        employee_email: original.employee_email,
        employee_gac_id: original.employee_gac_id,
        contract_type: original.contract_type,
        position: original.position,
        department: original.department,
        contract_start_date: original.contract_end_date || new Date().toISOString().split('T')[0],
        contract_end_date: newEndDate,
        contract_duration_months: newDurationMonths,
        salary: original.salary,
        status: 'Active',
        renewal_count: (original.renewal_count || 0) + 1,
        renewed_from_id: contractId,
        notes: `Renewed from contract. Renewal #${(original.renewal_count || 0) + 1}`,
        created_by: 'System',
      };

      const { data, error } = await supabase
        .from('employee_contracts')
        .insert([newContract as any])
        .select()
        .single();

      if (error) throw error;

      await fetchContracts();
      toast({ title: "Success", description: `Contract renewed for ${original.employee_name}` });
      return data;
    } catch (error) {
      console.error('Error renewing contract:', error);
      toast({ title: "Error", description: "Failed to renew contract", variant: "destructive" });
      throw error;
    }
  };

  const getExpiringContracts = (daysAhead = 30) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    return contracts.filter(c => {
      if (c.status !== 'Active' || !c.contract_end_date) return false;
      const endDate = new Date(c.contract_end_date);
      return endDate >= now && endDate <= futureDate;
    });
  };

  const getExpiredContracts = () => {
    const now = new Date();
    return contracts.filter(c => {
      if (c.status !== 'Active' || !c.contract_end_date) return false;
      return new Date(c.contract_end_date) < now;
    });
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return {
    contracts,
    loading,
    addContract,
    updateContract,
    renewContract,
    getExpiringContracts,
    getExpiredContracts,
    refetch: fetchContracts,
  };
};
