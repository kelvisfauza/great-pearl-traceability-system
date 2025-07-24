
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
      console.log('Fetching suppliers...');
      
      // Using mock data for now since suppliers table doesn't exist yet
      const mockSuppliers: Supplier[] = [
        {
          id: '1',
          name: 'Premium Coffee Suppliers Ltd',
          code: 'SUP001',
          phone: '+256 700 123456',
          origin: 'Bugisu',
          opening_balance: 5000000,
          date_registered: '2024-01-15',
          created_at: '2024-01-15T08:00:00Z',
          updated_at: '2024-01-15T08:00:00Z'
        },
        {
          id: '2',
          name: 'Mountain Coffee Co.',
          code: 'SUP002',
          phone: '+256 750 987654',
          origin: 'Rwenzori',
          opening_balance: 3500000,
          date_registered: '2024-02-01',
          created_at: '2024-02-01T09:30:00Z',
          updated_at: '2024-02-01T09:30:00Z'
        }
      ];
      
      console.log('Mock suppliers loaded:', mockSuppliers);
      setSuppliers(mockSuppliers);
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
      console.log('Adding supplier:', supplierData);
      
      // For now, simulate adding to the mock data
      const newSupplier: Supplier = {
        id: `SUP${Date.now()}`,
        name: supplierData.name,
        origin: supplierData.origin,
        phone: supplierData.phone || null,
        code: `SUP${Date.now()}`,
        opening_balance: supplierData.opening_balance || 0,
        date_registered: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('New supplier object:', newSupplier);
      
      // Add to current state (mock implementation)
      setSuppliers(prev => [newSupplier, ...prev]);
      
      console.log('Supplier added successfully');
      toast({
        title: "Success",
        description: "Supplier added successfully"
      });
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
