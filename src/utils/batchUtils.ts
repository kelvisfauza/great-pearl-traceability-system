import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a new batch number in the format B00001
 * @returns Promise<string> - The generated batch number
 */
export const generateBatchNumber = async (): Promise<string> => {
  try {
    // Get the highest existing batch number from both store_records and coffee_records
    const { data: storeRecords } = await supabase
      .from('store_records')
      .select('batch_number')
      .not('batch_number', 'is', null)
      .order('batch_number', { ascending: false })
      .limit(1);
    
    const { data: coffeeRecords } = await supabase
      .from('coffee_records')
      .select('batch_number')
      .not('batch_number', 'is', null)
      .order('batch_number', { ascending: false })
      .limit(1);
    
    // Extract existing batch numbers and find the highest
    const allBatchNumbers = [
      ...(storeRecords || []).map(r => r.batch_number),
      ...(coffeeRecords || []).map(r => r.batch_number)
    ].filter(Boolean);
    
    let maxNumber = 0;
    
    allBatchNumbers.forEach(batchNumber => {
      if (typeof batchNumber === 'string' && batchNumber.startsWith('B')) {
        const numberPart = batchNumber.substring(1);
        const num = parseInt(numberPart, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    // Generate next batch number
    const nextNumber = maxNumber + 1;
    return `B${nextNumber.toString().padStart(5, '0')}`;
  } catch (error) {
    console.error('Error generating batch number:', error);
    // Fallback to timestamp-based batch number
    const timestamp = Date.now();
    return `B${timestamp.toString().slice(-5)}`;
  }
};

/**
 * Validates that a batch has at least 1000kg
 * @param kilograms - The weight in kilograms
 * @returns boolean - True if valid (>= 1000kg)
 */
export const validateBatchWeight = (kilograms: number): boolean => {
  return kilograms >= 1000;
};

/**
 * Gets the minimum batch weight requirement
 * @returns number - The minimum weight in kg
 */
export const getMinimumBatchWeight = (): number => {
  return 1000;
};

/**
 * Checks if deliveries for a supplier can be batched together
 * @param supplierName - The supplier name
 * @param newDeliveryWeight - Weight of the new delivery
 * @returns Promise<{shouldBatch: boolean, batchNumber?: string, totalWeight?: number}>
 */
export const checkBatchAccumulation = async (
  supplierName: string, 
  newDeliveryWeight: number
): Promise<{shouldBatch: boolean, batchNumber?: string, totalWeight?: number, pendingDeliveries?: any[]}> => {
  try {
    // Get pending deliveries for this supplier (deliveries without batch_number)
    const { data: pendingDeliveries } = await supabase
      .from('store_records')
      .select('*')
      .eq('supplier_name', supplierName)
      .is('batch_number', null)
      .eq('status', 'pending_batch');

    const currentPendingWeight = (pendingDeliveries || []).reduce((sum, delivery) => sum + delivery.quantity_kg, 0);
    const totalWeight = currentPendingWeight + newDeliveryWeight;

    if (totalWeight >= getMinimumBatchWeight()) {
      // Generate batch number for all accumulated deliveries
      const batchNumber = await generateBatchNumber();
      return {
        shouldBatch: true,
        batchNumber,
        totalWeight,
        pendingDeliveries: pendingDeliveries || []
      };
    }

    return {
      shouldBatch: false,
      totalWeight
    };
  } catch (error) {
    console.error('Error checking batch accumulation:', error);
    return { shouldBatch: false };
  }
};

/**
 * Batches accumulated deliveries together
 * @param supplierName - The supplier name
 * @param batchNumber - The batch number to assign
 * @param pendingDeliveries - Array of pending delivery records
 * @returns Promise<boolean> - Success status
 */
export const batchAccumulatedDeliveries = async (
  supplierName: string,
  batchNumber: string,
  pendingDeliveries: any[]
): Promise<boolean> => {
  try {
    // Update all pending deliveries with the batch number
    const deliveryIds = pendingDeliveries.map(d => d.id);
    
    const { error } = await supabase
      .from('store_records')
      .update({ 
        batch_number: batchNumber,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .in('id', deliveryIds);

    if (error) {
      console.error('Error batching deliveries:', error);
      return false;
    }

    console.log(`Successfully batched ${deliveryIds.length} deliveries for ${supplierName} into batch ${batchNumber}`);
    return true;
  } catch (error) {
    console.error('Error in batchAccumulatedDeliveries:', error);
    return false;
  }
};