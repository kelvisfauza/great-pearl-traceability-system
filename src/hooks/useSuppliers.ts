
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Supplier {
  id: string; // Changed from number to string to match UUID
  name: string;
  location: string;
  contact: string;
  coffeeTypes: string;
  rating: number;
  status: string;
  lastDelivery: string;
  totalBags: number;
  averagePrice: number;
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
        return;
      }

      const transformedSuppliers: Supplier[] = data.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        location: supplier.origin,
        contact: supplier.phone || 'N/A',
        coffeeTypes: 'Arabica, Robusta', // Default value
        rating: 4.5, // Default rating
        status: 'Active',
        lastDelivery: supplier.date_registered,
        totalBags: 0, // Will be calculated from actual deliveries
        averagePrice: supplier.opening_balance || 0
      }));

      setSuppliers(transformedSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          name: supplierData.name,
          origin: supplierData.location,
          phone: supplierData.contact,
          code: `SUP${Date.now()}`,
          opening_balance: supplierData.averagePrice || 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchSuppliers(); // Refresh the list
    } catch (error) {
      console.error('Error adding supplier:', error);
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
