import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      console.log(`🔍 Checking inventory for: "${coffeeType}"`);
      
      // First, check new inventory_batches system
      const { data: batches, error: batchError } = await supabase
        .from('inventory_batches')
        .select('remaining_kilograms, coffee_type')
        .ilike('coffee_type', `%${coffeeType}%`)
        .gt('remaining_kilograms', 0)
        .in('status', ['filling', 'active', 'selling']);
      
      if (!batchError && batches && batches.length > 0) {
        const totalFromBatches = batches.reduce((sum, b) => sum + Number(b.remaining_kilograms), 0);
        console.log(`📦 From new batch system: ${totalFromBatches} kg available`);
        return {
          available: Math.max(0, totalFromBatches),
          sufficient: totalFromBatches >= weightNeeded
        };
      }

      // Fallback: Calculate from coffee_records with status 'inventory' minus sales
      const { data: coffeeRecords, error: recordsError } = await supabase
        .from('coffee_records')
        .select('id, kilograms, batch_number, created_at')
        .eq('status', 'inventory')
        .ilike('coffee_type', `%${coffeeType}%`);
      
      if (recordsError) {
        console.error('Error fetching coffee records:', recordsError);
        return { available: 0, sufficient: false };
      }
      
      console.log(`📦 Inventory records: ${coffeeRecords?.length || 0}`);
      
      // Calculate total in inventory
      let totalInInventory = 0;
      const matchedRecordIds: string[] = [];
      
      coffeeRecords?.forEach(record => {
        const kilograms = Number(record.kilograms) || 0;
        if (kilograms > 0) {
          totalInInventory += kilograms;
          matchedRecordIds.push(record.id);
        }
      });

      // Get total already sold from sales tracking
      let totalSold = 0;
      if (matchedRecordIds.length > 0) {
        const { data: salesTracking, error } = await supabase
          .from('sales_inventory_tracking')
          .select('quantity_kg')
          .in('coffee_record_id', matchedRecordIds);
        
        if (!error && salesTracking) {
          totalSold = salesTracking.reduce((sum, s) => sum + Number(s.quantity_kg), 0);
          console.log(`📦 Total sold from tracking: ${totalSold} kg`);
        }
      }

      // Also check sales_transactions that may not be tracked
      const { data: allSales, error: salesError } = await supabase
        .from('sales_transactions')
        .select('weight')
        .ilike('coffee_type', `%${coffeeType}%`);
      
      if (!salesError && allSales) {
        const totalFromSalesTable = allSales.reduce((sum, s) => sum + Number(s.weight || 0), 0);
        // Use the larger of the two to be conservative
        totalSold = Math.max(totalSold, totalFromSalesTable);
        console.log(`📦 Total from sales_transactions: ${totalFromSalesTable} kg`);
      }

      // Calculate available = inventory - sold
      const totalAvailable = totalInInventory - totalSold;
      
      console.log(`📊 Summary for "${coffeeType}":`);
      console.log(`   - Total in inventory: ${totalInInventory} kg`);
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
      
      // Get matching coffee records from Supabase
      const { data: coffeeRecords, error: recordsError } = await supabase
        .from('coffee_records')
        .select('id, kilograms, batch_number, created_at')
        .ilike('coffee_type', `%${coffeeType}%`)
        .order('created_at', { ascending: true }); // FIFO - oldest first
      
      if (recordsError) {
        console.error('Error fetching coffee records:', recordsError);
        throw recordsError;
      }
      
      const matchedRecords = coffeeRecords?.map(record => ({
        id: record.id,
        kilograms: Number(record.kilograms) || 0,
        batch_number: record.batch_number || '',
        created_at: record.created_at || new Date().toISOString()
      })).filter(r => r.kilograms > 0) || [];
      
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
      
      // Insert sale tracking records
      if (salesToTrack.length > 0) {
        const { error } = await supabase
          .from('sales_inventory_tracking')
          .insert(salesToTrack);
        
        if (error) throw error;
        
        console.log(`✅ Tracked ${salesToTrack.length} sales records for ${quantityKg}kg`);
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