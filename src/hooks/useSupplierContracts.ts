
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupplierContract {
  id: string;
  supplierName: string;
  supplierId: string;
  contractType: string;
  date: string;
  kilogramsExpected: number;
  pricePerKg: number;
  advanceGiven: number;
  status: string;
  created_at: string;
  voided_at?: string;
  voided_by?: string;
  void_reason?: string;
  approval_status: string;
  approved_by?: string;
  approved_at?: string;
}

export interface ContractApproval {
  id: string;
  contract_id: string;
  action_type: string;
  requested_by: string;
  requested_at: string;
  reason: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export const useSupplierContracts = () => {
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        setContracts([]);
      } else {
        const formattedContracts = data.map(contract => ({
          id: contract.id,
          supplierName: contract.supplier_name,
          supplierId: contract.supplier_id || '',
          contractType: contract.contract_type,
          date: contract.date,
          kilogramsExpected: contract.kilograms_expected,
          pricePerKg: contract.price_per_kg,
          advanceGiven: contract.advance_given || 0,
          status: contract.status || 'Active',
          created_at: contract.created_at,
          voided_at: contract.voided_at,
          voided_by: contract.voided_by,
          void_reason: contract.void_reason,
          approval_status: contract.approval_status || 'approved',
          approved_by: contract.approved_by,
          approved_at: contract.approved_at
        }));
        setContracts(formattedContracts);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const createContract = async (contractData: Omit<SupplierContract, 'id' | 'created_at' | 'approval_status'>) => {
    try {
      const { data, error } = await supabase
        .from('supplier_contracts')
        .insert({
          supplier_name: contractData.supplierName,
          supplier_id: contractData.supplierId,
          contract_type: contractData.contractType,
          date: contractData.date,
          kilograms_expected: contractData.kilogramsExpected,
          price_per_kg: contractData.pricePerKg,
          advance_given: contractData.advanceGiven,
          status: contractData.status
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchContracts();
      return data;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  };

  const requestContractAction = async (contractId: string, actionType: 'void' | 'terminate', reason: string, requestedBy: string) => {
    try {
      const { error } = await supabase
        .from('contract_approvals')
        .insert({
          contract_id: contractId,
          action_type: actionType,
          requested_by: requestedBy,
          reason: reason,
          status: 'pending'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error requesting contract action:', error);
      throw error;
    }
  };

  const approveContractAction = async (approvalId: string, approvedBy: string) => {
    try {
      const { data: approval, error: fetchError } = await supabase
        .from('contract_approvals')
        .select('*')
        .eq('id', approvalId)
        .single();

      if (fetchError) throw fetchError;

      // Update approval status
      const { error: updateApprovalError } = await supabase
        .from('contract_approvals')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      if (updateApprovalError) throw updateApprovalError;

      // Update contract status
      const newStatus = approval.action_type === 'void' ? 'Voided' : 'Terminated';
      const { error: updateContractError } = await supabase
        .from('supplier_contracts')
        .update({
          status: newStatus,
          voided_at: new Date().toISOString(),
          voided_by: approvedBy,
          void_reason: approval.reason
        })
        .eq('id', approval.contract_id);

      if (updateContractError) throw updateContractError;

      await fetchContracts();
      return true;
    } catch (error) {
      console.error('Error approving contract action:', error);
      throw error;
    }
  };

  const getActiveContractForSupplier = (supplierId: string): SupplierContract | null => {
    return contracts.find(contract => 
      contract.supplierId === supplierId && contract.status === 'Active'
    ) || null;
  };

  const getContractPriceForSupplier = (supplierId: string): number | null => {
    const contract = getActiveContractForSupplier(supplierId);
    return contract ? contract.pricePerKg : null;
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return {
    contracts,
    loading,
    fetchContracts,
    createContract,
    requestContractAction,
    approveContractAction,
    getActiveContractForSupplier,
    getContractPriceForSupplier
  };
};
