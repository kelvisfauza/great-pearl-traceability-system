import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupplierSubcontract {
  id: string;
  contract_ref: string;
  supplier_id: string | null;
  supplier_name: string;
  contract_size: string;
  delivery_station: string;
  net_weight: number;
  price_per_kg: number;
  price_subject_to_uprisal: boolean;
  cuttings: string | null;
  terms: string | null;
  outturn: number | null;
  moisture: number | null;
  total_fm: number | null;
  duration: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useSupplierSubcontracts = () => {
  const [subcontracts, setSubcontracts] = useState<SupplierSubcontract[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubcontracts = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_subcontracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubcontracts(data || []);
    } catch (error: any) {
      console.error('Error fetching subcontracts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch supplier subcontracts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateContractRef = async (): Promise<string> => {
    try {
      // Get the count of existing contracts to generate next number
      const { data, error } = await supabase
        .from('supplier_subcontracts')
        .select('contract_ref')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNum = 1;
      if (data && data.length > 0) {
        const lastRef = data[0].contract_ref;
        const match = lastRef.match(/GPC\s*(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      return `GPC ${nextNum.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating contract ref:', error);
      return `GPC ${Date.now().toString().slice(-4)}`;
    }
  };

  const createSubcontract = async (data: Omit<SupplierSubcontract, 'id' | 'contract_ref' | 'created_at' | 'updated_at'>) => {
    try {
      const contract_ref = await generateContractRef();
      
      const { data: newContract, error } = await supabase
        .from('supplier_subcontracts')
        .insert([{ ...data, contract_ref }])
        .select()
        .single();

      if (error) throw error;

      setSubcontracts(prev => [newContract, ...prev]);
      toast({
        title: "Success",
        description: `Subcontract ${contract_ref} created successfully`
      });

      return newContract;
    } catch (error: any) {
      console.error('Error creating subcontract:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create subcontract",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSubcontract = async (id: string, updates: Partial<SupplierSubcontract>) => {
    try {
      const { error } = await supabase
        .from('supplier_subcontracts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setSubcontracts(prev => 
        prev.map(sc => sc.id === id ? { ...sc, ...updates } : sc)
      );

      toast({
        title: "Success",
        description: "Subcontract updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating subcontract:', error);
      toast({
        title: "Error",
        description: "Failed to update subcontract",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSubcontracts();
  }, []);

  return {
    subcontracts,
    loading,
    fetchSubcontracts,
    createSubcontract,
    updateSubcontract,
    generateContractRef
  };
};
