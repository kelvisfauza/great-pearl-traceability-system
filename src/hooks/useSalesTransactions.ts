import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';

export interface SalesTransaction {
  id: string;
  date: string;
  customer: string;
  coffee_type: string;
  moisture?: string;
  weight: number;
  unit_price: number;
  total_amount: number;
  truck_details: string;
  driver_details: string;
  status: string;
  grn_file_url?: string;
  grn_file_name?: string;
  created_at: string;
  updated_at: string;
}

export const useSalesTransactions = () => {
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching sales transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sales transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkInventoryAvailability = async (coffeeType: string, weightNeeded: number) => {
    try {
      const coffeeRecordsRef = collection(db, 'coffee_records');
      // Query all in_stock records and filter by coffee type
      const q = query(
        coffeeRecordsRef,
        where('status', '==', 'in_stock')
      );
      
      const snapshot = await getDocs(q);
      let totalAvailable = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const recordCoffeeType = data.coffee_type || '';
        
        // Check if the record's coffee type contains the selected type (case-insensitive)
        if (recordCoffeeType.toLowerCase().includes(coffeeType.toLowerCase())) {
          totalAvailable += Number(data.kilograms) || 0;
        }
      });

      return {
        available: totalAvailable,
        sufficient: totalAvailable >= weightNeeded
      };
    } catch (error) {
      console.error('Error checking inventory:', error);
      return { available: 0, sufficient: false };
    }
  };

  const deductFromInventory = async (coffeeType: string, weightToDeduct: number) => {
    try {
      const coffeeRecordsRef = collection(db, 'coffee_records');
      // Query all in_stock records
      const q = query(
        coffeeRecordsRef,
        where('status', '==', 'in_stock'),
        orderBy('created_at', 'asc') // FIFO - oldest first
      );
      
      const snapshot = await getDocs(q);
      let remainingToDeduct = weightToDeduct;
      
      // Filter and deduct from matching coffee types (oldest first)
      for (const docSnap of snapshot.docs) {
        if (remainingToDeduct <= 0) break;
        
        const data = docSnap.data();
        const recordCoffeeType = data.coffee_type || '';
        
        // Only process records that match the coffee type (case-insensitive partial match)
        if (!recordCoffeeType.toLowerCase().includes(coffeeType.toLowerCase())) {
          continue;
        }
        
        const currentKg = Number(data.kilograms) || 0;
        
        if (currentKg <= remainingToDeduct) {
          // This entire record is consumed
          await updateDoc(doc(db, 'coffee_records', docSnap.id), {
            status: 'sold',
            kilograms: 0,
            updated_at: new Date().toISOString()
          });
          remainingToDeduct -= currentKg;
        } else {
          // Partial deduction
          await updateDoc(doc(db, 'coffee_records', docSnap.id), {
            kilograms: currentKg - remainingToDeduct,
            updated_at: new Date().toISOString()
          });
          remainingToDeduct = 0;
        }
      }

      return true;
    } catch (error) {
      console.error('Error deducting from inventory:', error);
      throw error;
    }
  };

  const createTransaction = async (transactionData: Omit<SalesTransaction, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);

      // Check inventory availability first
      const inventoryCheck = await checkInventoryAvailability(
        transactionData.coffee_type,
        transactionData.weight
      );

      if (!inventoryCheck.sufficient) {
        toast({
          title: "Insufficient Inventory",
          description: `Only ${inventoryCheck.available.toFixed(2)} kg available. Cannot sell ${transactionData.weight} kg.`,
          variant: "destructive"
        });
        throw new Error('Insufficient inventory');
      }

      // Deduct from inventory
      await deductFromInventory(transactionData.coffee_type, transactionData.weight);

      // Create the sales transaction
      const { data, error } = await supabase
        .from('sales_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Sale recorded successfully. ${transactionData.weight} kg deducted from inventory.`,
      });

      await fetchTransactions();
      return data;
    } catch (error: any) {
      console.error('Error creating sales transaction:', error);
      if (error.message !== 'Insufficient inventory') {
        toast({
          title: "Error",
          description: "Failed to record sales transaction",
          variant: "destructive"
        });
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadGRNFile = async (file: File, transactionId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${transactionId}-grn.${fileExt}`;
      const filePath = `grn/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sales-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store the file path instead of public URL for private bucket (like store reports)
      const { error: updateError } = await supabase
        .from('sales_transactions')
        .update({
          grn_file_url: filePath, // Store file path, not public URL
          grn_file_name: file.name
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      await fetchTransactions();
      return filePath;
    } catch (error) {
      console.error('Error uploading GRN file:', error);
      toast({
        title: "Error",
        description: "Failed to upload GRN file",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getGRNFileUrl = async (filePath: string) => {
    try {
      const { data } = await supabase.storage
        .from('sales-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const updateTransaction = async (id: string, transactionData: Partial<SalesTransaction>) => {
    try {
      console.log('Updating transaction:', id, transactionData);
      
      const { data, error } = await supabase
        .from('sales_transactions')
        .update(transactionData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }

      console.log('Transaction updated successfully:', data);
      await fetchTransactions(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      console.log('Deleting transaction:', id);
      
      const { error } = await supabase
        .from('sales_transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
      }

      console.log('Transaction deleted successfully');
      await fetchTransactions(); // Refresh the list
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  return {
    transactions,
    loading,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    uploadGRNFile,
    getGRNFileUrl,
    checkInventoryAvailability
  };
};