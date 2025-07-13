
import { useState, useEffect } from 'react';
import { firebaseClient } from '@/lib/firebaseClient';

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

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      console.log('Fetching suppliers from Firebase...');
      
      const { data, error } = await firebaseClient
        .from('suppliers')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (error) {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
        return;
      }

      console.log('Raw Firebase suppliers:', data);
      const transformedSuppliers = (data || []).map((supplier: any) => ({
        id: supplier.id,
        name: supplier.name,
        code: supplier.code,
        phone: supplier.phone,
        origin: supplier.origin,
        opening_balance: supplier.opening_balance || 0,
        date_registered: supplier.date_registered || supplier.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        created_at: supplier.created_at,
        updated_at: supplier.updated_at
      }));
      
      console.log('Transformed suppliers:', transformedSuppliers);
      setSuppliers(transformedSuppliers);
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
      console.log('Adding supplier to Firebase:', supplierData);
      
      const supplierToAdd = {
        name: supplierData.name,
        origin: supplierData.origin,
        phone: supplierData.phone || null,
        code: `SUP${Date.now()}`,
        opening_balance: supplierData.opening_balance || 0,
        date_registered: new Date().toISOString().split('T')[0]
      };

      console.log('Supplier object to add:', supplierToAdd);

      const { data, error } = await firebaseClient
        .from('suppliers')
        .insert(supplierToAdd);

      if (error) {
        console.error('Firebase insert error:', error);
        throw error;
      }
      
      console.log('Supplier added successfully:', data);
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
