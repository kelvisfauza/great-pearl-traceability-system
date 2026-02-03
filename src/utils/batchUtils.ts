import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a new batch number in the format YYYYMMDD001
 * The sequence (001, 002, etc.) resets daily
 * @param dateStr - Optional date string in YYYY-MM-DD format (defaults to today)
 * @returns Promise<string> - The generated batch number (e.g., 20250203001)
 */
export const generateBatchNumber = async (dateStr?: string): Promise<string> => {
  try {
    // Use provided date or today
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const datePrefix = targetDate.replace(/-/g, ''); // YYYYMMDD
    
    // Get batch numbers from both tables that start with today's date prefix
    const { data: coffeeRecords } = await supabase
      .from('coffee_records')
      .select('batch_number')
      .like('batch_number', `${datePrefix}%`)
      .not('batch_number', 'is', null);
    
    const { data: storeRecords } = await supabase
      .from('store_records')
      .select('batch_number')
      .like('batch_number', `${datePrefix}%`)
      .not('batch_number', 'is', null);
    
    // Extract existing batch numbers for today
    const allBatchNumbers = [
      ...(coffeeRecords || []).map(r => r.batch_number),
      ...(storeRecords || []).map(r => r.batch_number)
    ].filter(Boolean);
    
    let maxSequence = 0;
    
    // Find the highest sequence number for today
    allBatchNumbers.forEach(batchNumber => {
      if (typeof batchNumber === 'string' && batchNumber.startsWith(datePrefix)) {
        // Extract the sequence part (last 3 digits)
        const sequencePart = batchNumber.substring(8); // After YYYYMMDD
        const num = parseInt(sequencePart, 10);
        if (!isNaN(num) && num > maxSequence) {
          maxSequence = num;
        }
      }
    });
    
    // Generate next sequence number
    const nextSequence = maxSequence + 1;
    return `${datePrefix}${nextSequence.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating batch number:', error);
    // Fallback: use date + random 3-digit number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 900) + 100;
    return `${today}${random}`;
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

/**
 * Migrates existing batch numbers to the new format YYYYMMDD001
 * Uses the record's created_at date to determine the date portion
 * @returns Promise<{migrated: number, failed: number}>
 */
export const migrateBatchNumbersToNewFormat = async (): Promise<{migrated: number, failed: number, details: string[]}> => {
  const details: string[] = [];
  let migrated = 0;
  let failed = 0;

  try {
    // Get all coffee_records with batch numbers that don't match the new format
    const { data: coffeeRecords, error: coffeeError } = await supabase
      .from('coffee_records')
      .select('id, batch_number, created_at, date')
      .not('batch_number', 'is', null);
    
    if (coffeeError) {
      details.push(`Error fetching coffee_records: ${coffeeError.message}`);
      return { migrated, failed, details };
    }

    // Get all store_records with batch numbers
    const { data: storeRecords, error: storeError } = await supabase
      .from('store_records')
      .select('id, batch_number, created_at, transaction_date')
      .not('batch_number', 'is', null);

    if (storeError) {
      details.push(`Error fetching store_records: ${storeError.message}`);
      return { migrated, failed, details };
    }

    // Track sequence numbers per date to avoid duplicates
    const sequenceByDate: Record<string, number> = {};

    // Helper to get next sequence for a date
    const getNextSequence = (dateStr: string): string => {
      const datePrefix = dateStr.replace(/-/g, '');
      sequenceByDate[datePrefix] = (sequenceByDate[datePrefix] || 0) + 1;
      return `${datePrefix}${sequenceByDate[datePrefix].toString().padStart(3, '0')}`;
    };

    // Helper to check if batch number is already in new format
    const isNewFormat = (batchNumber: string): boolean => {
      return /^\d{11}$/.test(batchNumber); // YYYYMMDD + 3 digits = 11 chars
    };

    // Migrate coffee_records
    for (const record of coffeeRecords || []) {
      if (!record.batch_number || isNewFormat(record.batch_number)) {
        continue; // Skip if already in new format
      }

      const recordDate = record.date || record.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      const newBatchNumber = getNextSequence(recordDate);

      const { error: updateError } = await supabase
        .from('coffee_records')
        .update({ batch_number: newBatchNumber })
        .eq('id', record.id);

      if (updateError) {
        failed++;
        details.push(`Failed to update coffee_record ${record.id}: ${updateError.message}`);
      } else {
        migrated++;
        details.push(`coffee_records: ${record.batch_number} → ${newBatchNumber}`);
      }
    }

    // Migrate store_records
    for (const record of storeRecords || []) {
      if (!record.batch_number || isNewFormat(record.batch_number)) {
        continue; // Skip if already in new format
      }

      const recordDate = record.transaction_date || record.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      const newBatchNumber = getNextSequence(recordDate);

      const { error: updateError } = await supabase
        .from('store_records')
        .update({ batch_number: newBatchNumber })
        .eq('id', record.id);

      if (updateError) {
        failed++;
        details.push(`Failed to update store_record ${record.id}: ${updateError.message}`);
      } else {
        migrated++;
        details.push(`store_records: ${record.batch_number} → ${newBatchNumber}`);
      }
    }

    return { migrated, failed, details };
  } catch (error) {
    details.push(`Migration error: ${error}`);
    return { migrated, failed, details };
  }
};
