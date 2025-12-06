import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BuyerContract {
  id: string;
  contract_ref: string;
  buyer_ref: string | null;
  buyer_name: string;
  buyer_address: string | null;
  buyer_phone: string | null;
  quality: string;
  quality_terms: string | null;
  total_quantity: number;
  packaging: string | null;
  price_per_kg: number;
  delivery_period_start: string | null;
  delivery_period_end: string | null;
  delivery_terms: string | null;
  seller_name: string;
  status: string;
  allocated_quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useBuyerContracts = () => {
  const [contracts, setContracts] = useState<BuyerContract[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('buyer_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      console.error('Error fetching buyer contracts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch buyer contracts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateContractRef = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('buyer_contracts')
        .select('contract_ref')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNum = 1;
      if (data && data.length > 0) {
        const lastRef = data[0].contract_ref;
        const match = lastRef.match(/GPC-BC\s*(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }

      return `GPC-BC ${nextNum.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating contract ref:', error);
      return `GPC-BC ${Date.now().toString().slice(-4)}`;
    }
  };

  const createContract = async (data: Omit<BuyerContract, 'id' | 'contract_ref' | 'created_at' | 'updated_at' | 'allocated_quantity'>) => {
    try {
      const contract_ref = await generateContractRef();
      
      const { data: newContract, error } = await supabase
        .from('buyer_contracts')
        .insert([{ ...data, contract_ref, allocated_quantity: 0 }])
        .select()
        .single();

      if (error) throw error;

      setContracts(prev => [newContract, ...prev]);
      toast({
        title: "Success",
        description: `Buyer contract ${contract_ref} created successfully`
      });

      return newContract;
    } catch (error: any) {
      console.error('Error creating buyer contract:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create buyer contract",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateContract = async (id: string, updates: Partial<BuyerContract>) => {
    try {
      const { error } = await supabase
        .from('buyer_contracts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setContracts(prev => 
        prev.map(c => c.id === id ? { ...c, ...updates } : c)
      );

      toast({
        title: "Success",
        description: "Buyer contract updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating buyer contract:', error);
      toast({
        title: "Error",
        description: "Failed to update buyer contract",
        variant: "destructive"
      });
    }
  };

  const getRemainingQuantity = (contract: BuyerContract): number => {
    return contract.total_quantity - contract.allocated_quantity;
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return {
    contracts,
    loading,
    fetchContracts,
    createContract,
    updateContract,
    generateContractRef,
    getRemainingQuantity
  };
};
