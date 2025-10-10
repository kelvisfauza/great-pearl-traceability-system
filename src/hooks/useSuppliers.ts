
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
      console.log('Fetching suppliers from Supabase only (excluding old Firebase data)...');
      
      // Fetch ONLY from Supabase - no Firebase
      const { data: supabaseData, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) console.error('Supabase error:', error);
      
      const supabaseSuppliers = (supabaseData || []).map(supplier => ({
        ...supplier,
        date_registered: supplier.date_registered || new Date().toISOString().split('T')[0]
      })) as Supplier[];
      
      console.log('✅ Supabase suppliers only:', supabaseSuppliers.length);
      
      setSuppliers(supabaseSuppliers);
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

  const updateSupplier = async (supplierId: string, updates: {
    name: string;
    phone: string;
    origin: string;
  }) => {
    try {
      console.log('🔄 Updating supplier across entire system:', supplierId, updates);
      
      // Get current supplier data first
      const { data: currentSupplier } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', supplierId)
        .single();

      if (!currentSupplier) {
        throw new Error('Supplier not found');
      }

      const oldName = currentSupplier.name;
      console.log('Old supplier name:', oldName);
      
      // 1. Update main supplier record
      const { error: supplierError } = await supabase
        .from('suppliers')
        .update({
          name: updates.name,
          phone: updates.phone || null,
          origin: updates.origin,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId);

      if (supplierError) throw supplierError;
      console.log('✅ Updated supplier record');
      
      // 2. Update coffee_records supplier_name
      const { error: coffeeError } = await supabase
        .from('coffee_records')
        .update({ supplier_name: updates.name })
        .eq('supplier_id', supplierId);

      if (coffeeError) {
        console.error('Error updating coffee records:', coffeeError);
      } else {
        console.log('✅ Updated coffee_records');
      }
      
      // 3. Update payment_records supplier name
      const { error: paymentError } = await supabase
        .from('payment_records')
        .update({ supplier: updates.name })
        .eq('supplier', oldName);

      if (paymentError) {
        console.error('Error updating payment records:', paymentError);
      } else {
        console.log('✅ Updated payment_records');
      }

      // 4. Update supplier_contracts supplier_name
      const { error: contractError } = await supabase
        .from('supplier_contracts')
        .update({ supplier_name: updates.name })
        .eq('supplier_id', supplierId);

      if (contractError) {
        console.error('Error updating supplier contracts:', contractError);
      } else {
        console.log('✅ Updated supplier_contracts');
      }

      // 5. Update purchase_orders supplier_name
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ supplier_name: updates.name })
        .eq('supplier_id', supplierId);

      if (poError) {
        console.error('Error updating purchase orders:', poError);
      } else {
        console.log('✅ Updated purchase_orders');
      }
      
      // Wait a moment for database to propagate changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Supplier updated successfully across all systems');
      toast({
        title: "Success",
        description: "Supplier information updated across all transactions and records"
      });
      
      await fetchSuppliers(); // Refresh the list
      
      return true; // Indicate success
    } catch (error) {
      console.error('❌ Error updating supplier:', error);
      toast({
        title: "Error",
        description: "Failed to update supplier information",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    suppliers,
    loading,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    refetchSuppliers: fetchSuppliers
  };
};
