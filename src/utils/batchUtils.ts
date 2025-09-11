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