
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Supplier {
  id: number;
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
      // For now, we'll return empty array since suppliers table doesn't exist yet
      // This prevents errors while maintaining the interface
      setSuppliers([]);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return {
    suppliers,
    loading,
    fetchSuppliers
  };
};
