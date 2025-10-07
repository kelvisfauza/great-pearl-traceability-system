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

      // Step 2: Get total already sold from sales tracking (does NOT modify coffee_records)
      let totalSold = 0;
      if (matchedRecordIds.length > 0) {
        const { data: salesTracking, error } = await supabase
          .from('sales_inventory_tracking')
          .select('quantity_kg')
          .in('coffee_record_id', matchedRecordIds);
        
        if (!error && salesTracking) {
          totalSold = salesTracking.reduce((sum, s) => sum + Number(s.quantity_kg), 0);
          console.log(`📦 Total sold: ${totalSold} kg`);
        }
      }

      // Step 3: Calculate available = delivered - sold
      const totalAvailable = totalDelivered - totalSold;
      
      console.log(`📊 Summary for "${coffeeType}":`);
      console.log(`   - Total delivered: ${totalDelivered} kg`);
      console.log(`   - Total sold: ${totalSold} kg`);
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
    createdBy: string,
    customerName?: string
  ) => {
    try {
      console.log(`📊 Recording sale tracking for ${quantityKg}kg of ${coffeeType}`);
      
      // Get matching coffee records from Firebase (read-only, never modify!)
      const coffeeRecordsRef = collection(db, 'coffee_records');
      const snapshot = await getDocs(coffeeRecordsRef);
      
      const matchedRecords: Array<{ 
        id: string; 
        kilograms: number; 
        batch_number: string;
        created_at: string 
      }> = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const recordCoffeeType = (data.coffee_type || '').toString();
        const kilograms = Number(data.kilograms) || 0;
        const batchNumber = data.batch_number || '';
        
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
              batch_number: batchNumber,
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
      
      // Get existing sales tracking to calculate what's been sold from each record
      const recordIds = matchedRecords.map(r => r.id);
      const { data: existingSales } = await supabase
        .from('sales_inventory_tracking')
        .select('coffee_record_id, quantity_kg')
        .in('coffee_record_id', recordIds);
      
      // Calculate sold quantity per record
      const soldByRecord: Record<string, number> = {};
      existingSales?.forEach(s => {
        soldByRecord[s.coffee_record_id] = (soldByRecord[s.coffee_record_id] || 0) + Number(s.quantity_kg);
      });
      
      // Distribute sale across records (FIFO) WITHOUT modifying original records
      let remainingToSell = quantityKg;
      const salesToTrack: any[] = [];
      
      for (const record of matchedRecords) {
        if (remainingToSell <= 0) break;
        
        const alreadySold = soldByRecord[record.id] || 0;
        const available = record.kilograms - alreadySold;
        
        if (available <= 0) continue;
        
        const toSellFromThis = Math.min(available, remainingToSell);
        
        salesToTrack.push({
          sale_id: referenceId,
          coffee_record_id: record.id,
          batch_number: record.batch_number,
          coffee_type: coffeeType,
          quantity_kg: toSellFromThis,
          customer_name: customerName,
          created_by: createdBy
        });
        
        remainingToSell -= toSellFromThis;
      }
      
      // Insert sale tracking records (does NOT modify coffee_records!)
      if (salesToTrack.length > 0) {
        const { error } = await supabase
          .from('sales_inventory_tracking')
          .insert(salesToTrack);
        
        if (error) throw error;
        
        console.log(`✅ Tracked ${salesToTrack.length} sales records for ${quantityKg}kg (original coffee records UNCHANGED)`);
      }
      
      return true;
    } catch (error) {
      console.error('Error recording sales tracking:', error);
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

      // Record sale tracking (does NOT modify coffee_records in Firebase or Supabase!)
      await recordInventoryMovement(
        transactionData.coffee_type,
        transactionData.weight,
        data.id,
        'sale',
        'Sales Department',
        transactionData.customer
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