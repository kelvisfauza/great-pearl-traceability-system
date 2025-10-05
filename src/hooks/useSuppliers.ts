
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Supplier {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  origin: string;
  opening_balance: number;
  date_registered: string;
  created_at: string;
  updated_at: string;
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      console.log('Fetching suppliers from Supabase...');
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const suppliersData = (data || []).map(supplier => ({
        ...supplier,
        date_registered: supplier.date_registered || new Date().toISOString().split('T')[0]
      })) as Supplier[];
      
      console.log('Supabase suppliers:', suppliersData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (supplierData: {
    name: string;
    phone: string;
    origin: string;
    opening_balance: number;
  }) => {
    try {
      console.log('Adding supplier to Supabase:', supplierData);
      
      const supplierToAdd = {
        name: supplierData.name,
        origin: supplierData.origin,
        phone: supplierData.phone || null,
        code: `SUP${Date.now()}`,
        opening_balance: supplierData.opening_balance || 0,
        date_registered: new Date().toISOString().split('T')[0]
      };

      console.log('Supplier object to add:', supplierToAdd);

      const { error } = await supabase
        .from('suppliers')
        .insert(supplierToAdd);

      if (error) throw error;
      
      console.log('Supplier added successfully');
      toast({
        title: "Success",
        description: "Supplier added successfully"
      });
      
      await fetchSuppliers(); // Refresh the list
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return {
    suppliers,
    loading,
    fetchSuppliers,
    addSupplier
  };
};
