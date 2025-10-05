
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
      console.log('Fetching suppliers from both Supabase and Firebase...');
      
      // Fetch from Supabase
      const { data: supabaseData, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) console.error('Supabase error:', error);
      
      const supabaseSuppliers = (supabaseData || []).map(supplier => ({
        ...supplier,
        date_registered: supplier.date_registered || new Date().toISOString().split('T')[0],
        source: 'supabase'
      })) as Supplier[];
      
      // Fetch from Firebase
      const suppliersQuery = query(collection(db, 'suppliers'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(suppliersQuery);
      
      const firebaseSuppliers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          code: data.code || '',
          phone: data.phone || null,
          origin: data.origin || '',
          opening_balance: data.opening_balance || 0,
          date_registered: data.date_registered || new Date().toISOString().split('T')[0],
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        } as Supplier;
      });
      
      // Combine both sources
      const allSuppliers = [...supabaseSuppliers, ...firebaseSuppliers];
      
      console.log('Supabase suppliers:', supabaseSuppliers.length);
      console.log('Firebase suppliers:', firebaseSuppliers.length);
      console.log('Total suppliers:', allSuppliers.length);
      
      setSuppliers(allSuppliers);
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
      console.log('Adding supplier to Supabase (new suppliers go to Supabase only):', supplierData);
      
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
