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
      const snapshot = await getDocs(coffeeRecordsRef);
      
      console.log(`🔍 Checking inventory for: "${coffeeType}"`);
      console.log(`📦 Total records in database: ${snapshot.size}`);
      
      // Step 1: Get total original delivery quantity from coffee_records
      let totalDelivered = 0;
      const matchedRecordIds: string[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const recordCoffeeType = (data.coffee_type || '').toString();
        const kilograms = Number(data.kilograms) || 0;
        
        if (kilograms > 0) {
          const searchLower = coffeeType.toLowerCase().trim();
          const recordLower = recordCoffeeType.toLowerCase().trim();
          
          const matches = recordLower.includes(searchLower) || 
                         searchLower.includes(recordLower) ||
                         recordLower === searchLower;
          
          if (matches) {
            console.log(`   ✅ Original delivery: ${doc.id} = ${kilograms} kg`);
            totalDelivered += kilograms;
            matchedRecordIds.push(doc.id);
          }
        }
      });

      // Step 2: Get total movements (sales, wastage, etc.) from Supabase
      let totalMoved = 0;
      if (matchedRecordIds.length > 0) {
        const { data: movements, error } = await supabase
          .from('inventory_movements')
          .select('quantity_kg')
          .in('coffee_record_id', matchedRecordIds);
        
        if (!error && movements) {
          totalMoved = movements.reduce((sum, m) => sum + Number(m.quantity_kg), 0);
          console.log(`📦 Total movements: ${totalMoved} kg (negative = sold)`);
        }
      }

      // Step 3: Calculate available = delivered - moved (movements are negative for sales)
      const totalAvailable = totalDelivered + totalMoved; // totalMoved is negative for sales
      
      console.log(`📊 Summary for "${coffeeType}":`);
      console.log(`   - Total delivered: ${totalDelivered} kg`);
      console.log(`   - Total moved: ${totalMoved} kg`);
      console.log(`   - Available: ${totalAvailable} kg`);

      return {
        available: Math.max(0, totalAvailable),
        sufficient: totalAvailable >= weightNeeded
      };
    } catch (error) {
      console.error('Error checking inventory:', error);
      return { available: 0, sufficient: false };
    }
  };

  const recordInventoryMovement = async (
    coffeeType: string, 
    quantityKg: number, 
    referenceId: string,
    movementType: 'sale' | 'wastage' | 'adjustment',
    createdBy: string
  ) => {
    try {
      // Get matching coffee records to distribute the movement
      const coffeeRecordsRef = collection(db, 'coffee_records');
      const snapshot = await getDocs(coffeeRecordsRef);
      
      const matchedRecords: Array<{ id: string; kilograms: number; created_at: string }> = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const recordCoffeeType = (data.coffee_type || '').toString();
        const kilograms = Number(data.kilograms) || 0;
        
        if (kilograms > 0) {
          const searchLower = coffeeType.toLowerCase().trim();
          const recordLower = recordCoffeeType.toLowerCase().trim();
          
          const matches = recordLower.includes(searchLower) || 
                         searchLower.includes(recordLower) ||
                         recordLower === searchLower;
          
          if (matches) {
            matchedRecords.push({
              id: docSnap.id,
              kilograms,
              created_at: data.created_at || new Date().toISOString()
            });
          }
        }
      });
      
      // Sort by creation date (FIFO - oldest first)
      matchedRecords.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
      });
      
      // Get existing movements for these records to calculate available per record
      const recordIds = matchedRecords.map(r => r.id);
      const { data: existingMovements } = await supabase
        .from('inventory_movements')
        .select('coffee_record_id, quantity_kg')
        .in('coffee_record_id', recordIds);
      
      // Calculate available quantity per record
      const movementsByRecord: Record<string, number> = {};
      existingMovements?.forEach(m => {
        movementsByRecord[m.coffee_record_id] = (movementsByRecord[m.coffee_record_id] || 0) + Number(m.quantity_kg);
      });
      
      // Distribute movement across records (FIFO)
      let remainingToMove = quantityKg;
      const movementsToCreate: any[] = [];
      
      for (const record of matchedRecords) {
        if (remainingToMove <= 0) break;
        
        const available = record.kilograms + (movementsByRecord[record.id] || 0);
        if (available <= 0) continue;
        
        const toMoveFromThis = Math.min(available, remainingToMove);
        
        movementsToCreate.push({
          movement_type: movementType,
          coffee_record_id: record.id,
          quantity_kg: -toMoveFromThis, // Negative for deductions
          reference_id: referenceId,
          reference_type: movementType,
          created_by: createdBy
        });
        
        remainingToMove -= toMoveFromThis;
      }
      
      // Insert all movements in one batch
      if (movementsToCreate.length > 0) {
        const { error } = await supabase
          .from('inventory_movements')
          .insert(movementsToCreate);
        
        if (error) throw error;
        
        console.log(`✅ Recorded ${movementsToCreate.length} inventory movements for ${quantityKg} kg`);
      }
      
      return true;
    } catch (error) {
      console.error('Error recording inventory movement:', error);
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

      // Create the sales transaction
      const { data, error } = await supabase
        .from('sales_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) throw error;

      // Record inventory movement (doesn't modify original coffee_records)
      await recordInventoryMovement(
        transactionData.coffee_type,
        transactionData.weight,
        data.id,
        'sale',
        'Sales Department' // You can pass actual user name here
      );

      toast({
        title: "Success",
        description: `Sale recorded successfully. ${transactionData.weight} kg tracked in inventory movements.`,
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