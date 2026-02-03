import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type BatchStatus = 'filling' | 'active' | 'selling' | 'sold_out';

export interface InventoryBatch {
  id: string;
  batch_code: string;
  coffee_type: string;
  target_capacity: number;
  total_kilograms: number;
  remaining_kilograms: number;
  status: BatchStatus;
  batch_date: string;
  created_at: string;
  updated_at: string;
  sold_out_at: string | null;
}

export interface BatchSource {
  id: string;
  batch_id: string;
  coffee_record_id: string;
  kilograms: number;
  supplier_name: string;
  purchase_date: string;
  created_at: string;
}

export interface BatchSale {
  id: string;
  batch_id: string;
  sale_transaction_id: string | null;
  kilograms_deducted: number;
  customer_name: string | null;
  sale_date: string;
  created_at: string;
}

export interface BatchWithDetails extends InventoryBatch {
  sources: BatchSource[];
  sales: BatchSale[];
}

export const useInventoryBatches = () => {
  const [batches, setBatches] = useState<BatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBatches = async () => {
    try {
      setLoading(true);
      
      // Fetch all batches including sold_out
      const { data: batchData, error: batchError } = await supabase
        .from('inventory_batches')
        .select('*')
        .order('status', { ascending: true }) // filling, active, selling, sold_out
        .order('batch_code', { ascending: true });

      if (batchError) throw batchError;
      
      console.log('Fetched batches:', batchData?.length, 'sold_out:', batchData?.filter(b => b.status === 'sold_out').length);

      // Fetch sources and sales for each batch
      const batchesWithDetails: BatchWithDetails[] = await Promise.all(
        (batchData || []).map(async (batch) => {
          const [sourcesRes, salesRes] = await Promise.all([
            supabase
              .from('inventory_batch_sources')
              .select('*')
              .eq('batch_id', batch.id)
              .order('purchase_date', { ascending: true }),
            supabase
              .from('inventory_batch_sales')
              .select('*')
              .eq('batch_id', batch.id)
              .order('sale_date', { ascending: true })
          ]);

          return {
            ...batch,
            status: batch.status as BatchStatus,
            sources: sourcesRes.data || [],
            sales: salesRes.data || []
          } as BatchWithDetails;
        })
      );

      setBatches(batchesWithDetails);
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory batches',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Create or get today's batch for a coffee type
  const getOrCreateBatch = async (coffeeType: string): Promise<InventoryBatch | null> => {
    const today = new Date().toISOString().split('T')[0];
    // Normalize coffee type to title case for consistent matching
    const normalizedType = coffeeType.charAt(0).toUpperCase() + coffeeType.slice(1).toLowerCase();
    
    // Check for existing filling batch for this coffee type (case-insensitive, any date with capacity)
    const { data: existingBatchData, error: fetchError } = await supabase
      .from('inventory_batches')
      .select('*')
      .ilike('coffee_type', normalizedType)
      .in('status', ['filling', 'active'])
      .lt('total_kilograms', 5000)
      .order('batch_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBatchData) {
      return { ...existingBatchData, status: existingBatchData.status as BatchStatus } as InventoryBatch;
    }

    // Create new batch with sequential numbering
    const prefix = normalizedType.substring(0, 3).toUpperCase();
    
    // Get next batch number
    const { data: existingBatches } = await supabase
      .from('inventory_batches')
      .select('batch_code')
      .like('batch_code', `${prefix}-B%`);
    
    let maxNum = 0;
    for (const row of existingBatches || []) {
      const match = String(row.batch_code || '').match(/-B(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n)) maxNum = Math.max(maxNum, n);
      }
    }
    
    const batchCode = `${prefix}-B${String(maxNum + 1).padStart(3, '0')}`;
    
    const { data: newBatchData, error: createError } = await supabase
      .from('inventory_batches')
      .insert({
        batch_code: batchCode,
        coffee_type: normalizedType,
        batch_date: today,
        status: 'filling'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating batch:', createError);
      return null;
    }

    return newBatchData ? { ...newBatchData, status: newBatchData.status as BatchStatus } as InventoryBatch : null;
  };

  // Add coffee purchase to a batch
  const addToBatch = async (
    coffeeRecordId: string,
    coffeeType: string,
    kilograms: number,
    supplierName: string,
    purchaseDate: string
  ): Promise<boolean> => {
    try {
      const batch = await getOrCreateBatch(coffeeType);
      if (!batch) return false;

      // Add source record
      const { error: sourceError } = await supabase
        .from('inventory_batch_sources')
        .insert({
          batch_id: batch.id,
          coffee_record_id: coffeeRecordId,
          kilograms,
          supplier_name: supplierName,
          purchase_date: purchaseDate
        });

      if (sourceError) throw sourceError;

      // Update batch totals
      const newTotal = batch.total_kilograms + kilograms;
      const newStatus = newTotal >= 5000 ? 'active' : 'filling';

      const { error: updateError } = await supabase
        .from('inventory_batches')
        .update({
          total_kilograms: newTotal,
          remaining_kilograms: batch.remaining_kilograms + kilograms,
          status: newStatus
        })
        .eq('id', batch.id);

      if (updateError) throw updateError;

      await fetchBatches();
      return true;
    } catch (error: any) {
      console.error('Error adding to batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to add coffee to batch',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Process a sale using FIFO
  const processSale = async (
    coffeeType: string,
    kilograms: number,
    customerName: string,
    saleTransactionId?: string
  ): Promise<boolean> => {
    try {
      // Get batches with remaining stock, oldest first (FIFO)
      const { data: availableBatches, error: fetchError } = await supabase
        .from('inventory_batches')
        .select('*')
        .eq('coffee_type', coffeeType)
        .gt('remaining_kilograms', 0)
        .in('status', ['filling', 'active', 'selling'])
        .order('batch_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      if (!availableBatches || availableBatches.length === 0) {
        toast({
          title: 'Insufficient Stock',
          description: `No available ${coffeeType} inventory`,
          variant: 'destructive'
        });
        return false;
      }

      // Check total available
      const totalAvailable = availableBatches.reduce((sum, b) => sum + b.remaining_kilograms, 0);
      if (totalAvailable < kilograms) {
        toast({
          title: 'Insufficient Stock',
          description: `Only ${totalAvailable.toLocaleString()}kg available, need ${kilograms.toLocaleString()}kg`,
          variant: 'destructive'
        });
        return false;
      }

      // Deduct from batches FIFO
      let remainingToDeduct = kilograms;
      const today = new Date().toISOString().split('T')[0];

      for (const batch of availableBatches) {
        if (remainingToDeduct <= 0) break;

        const deductFromThisBatch = Math.min(remainingToDeduct, batch.remaining_kilograms);
        const newRemaining = batch.remaining_kilograms - deductFromThisBatch;
        const newStatus = newRemaining === 0 ? 'sold_out' : 'selling';

        // Record the sale
        const { error: saleError } = await supabase
          .from('inventory_batch_sales')
          .insert({
            batch_id: batch.id,
            sale_transaction_id: saleTransactionId || null,
            kilograms_deducted: deductFromThisBatch,
            customer_name: customerName,
            sale_date: today
          });

        if (saleError) throw saleError;

        // Update batch
        const { error: updateError } = await supabase
          .from('inventory_batches')
          .update({
            remaining_kilograms: newRemaining,
            status: newStatus,
            sold_out_at: newRemaining === 0 ? new Date().toISOString() : null
          })
          .eq('id', batch.id);

        if (updateError) throw updateError;

        remainingToDeduct -= deductFromThisBatch;
      }

      await fetchBatches();
      toast({
        title: 'Sale Processed',
        description: `${kilograms.toLocaleString()}kg deducted from inventory`
      });
      return true;
    } catch (error: any) {
      console.error('Error processing sale:', error);
      toast({
        title: 'Error',
        description: 'Failed to process sale',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Get summary stats
  const getSummary = () => {
    const activeBatches = batches.filter(b => b.status !== 'sold_out');
    const soldOutBatches = batches.filter(b => b.status === 'sold_out');
    const totalRemaining = activeBatches.reduce((sum, b) => sum + b.remaining_kilograms, 0);
    const totalCapacity = activeBatches.reduce((sum, b) => sum + b.target_capacity, 0);

    return {
      activeBatches: activeBatches.length,
      soldOutBatches: soldOutBatches.length,
      totalRemaining,
      totalCapacity,
      utilizationPercent: totalCapacity > 0 ? (totalRemaining / totalCapacity) * 100 : 0
    };
  };

  useEffect(() => {
    fetchBatches();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('inventory-batches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, fetchBatches)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batch_sources' }, fetchBatches)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batch_sales' }, fetchBatches)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    batches,
    loading,
    fetchBatches,
    addToBatch,
    processSale,
    getSummary,
    getOrCreateBatch
  };
};
