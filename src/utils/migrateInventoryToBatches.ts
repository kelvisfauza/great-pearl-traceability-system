import { supabase } from "@/integrations/supabase/client";

interface CoffeeRecord {
  id: string;
  coffee_type: string;
  kilograms: number;
  supplier_name: string;
  date: string;
  batch_number: string;
  created_at: string;
}

export const migrateInventoryToBatches = async (): Promise<{
  success: boolean;
  message: string;
  batchesCreated: number;
  recordsProcessed: number;
}> => {
  try {
    // Check if migration has already been done
    const { data: existingBatches, error: checkError } = await supabase
      .from('inventory_batches')
      .select('id')
      .limit(1);

    if (existingBatches && existingBatches.length > 0) {
      return {
        success: true,
        message: 'Migration already completed - batches exist',
        batchesCreated: 0,
        recordsProcessed: 0
      };
    }

    // Fetch all inventory coffee records ordered by date (FIFO)
    const { data: coffeeRecords, error: fetchError } = await supabase
      .from('coffee_records')
      .select('id, coffee_type, kilograms, supplier_name, date, batch_number, created_at')
      .eq('status', 'inventory')
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;
    if (!coffeeRecords || coffeeRecords.length === 0) {
      return {
        success: true,
        message: 'No inventory records to migrate',
        batchesCreated: 0,
        recordsProcessed: 0
      };
    }

    // Group by coffee type (normalize case)
    const groupedByType: Record<string, CoffeeRecord[]> = {};
    for (const record of coffeeRecords) {
      const normalizedType = record.coffee_type.toLowerCase();
      const displayType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
      if (!groupedByType[displayType]) {
        groupedByType[displayType] = [];
      }
      groupedByType[displayType].push(record);
    }

    let batchesCreated = 0;
    let recordsProcessed = 0;

    // Process each coffee type
    for (const [coffeeType, records] of Object.entries(groupedByType)) {
      let currentBatchKg = 0;
      let currentBatchId: string | null = null;
      let batchNumber = 1;

      for (const record of records) {
        // Check if we need a new batch
        if (!currentBatchId || currentBatchKg >= 20000) {
          // Create new batch
          const batchCode = `${coffeeType.substring(0, 3).toUpperCase()}-LEGACY-${String(batchNumber).padStart(3, '0')}`;
          
          const { data: newBatch, error: batchError } = await supabase
            .from('inventory_batches')
            .insert({
              batch_code: batchCode,
              coffee_type: coffeeType,
              target_capacity: 20000,
              total_kilograms: 0,
              remaining_kilograms: 0,
              status: 'filling',
              batch_date: record.date
            })
            .select()
            .single();

          if (batchError) throw batchError;
          
          currentBatchId = newBatch.id;
          currentBatchKg = 0;
          batchNumber++;
          batchesCreated++;
        }

        // Add record to current batch
        const { error: sourceError } = await supabase
          .from('inventory_batch_sources')
          .insert({
            batch_id: currentBatchId,
            coffee_record_id: record.id,
            kilograms: record.kilograms,
            supplier_name: record.supplier_name,
            purchase_date: record.date
          });

        if (sourceError) {
          console.warn('Error adding source:', sourceError);
          continue;
        }

        currentBatchKg += record.kilograms;
        recordsProcessed++;

        // Update batch totals
        await supabase
          .from('inventory_batches')
          .update({
            total_kilograms: currentBatchKg,
            remaining_kilograms: currentBatchKg,
            status: currentBatchKg >= 20000 ? 'active' : 'filling'
          })
          .eq('id', currentBatchId);
      }

      // Mark last batch as active if it has content
      if (currentBatchId && currentBatchKg > 0) {
        await supabase
          .from('inventory_batches')
          .update({ status: 'active' })
          .eq('id', currentBatchId);
      }
    }

    return {
      success: true,
      message: `Successfully migrated ${recordsProcessed} records into ${batchesCreated} batches`,
      batchesCreated,
      recordsProcessed
    };
  } catch (error: any) {
    console.error('Migration error:', error);
    return {
      success: false,
      message: error.message || 'Migration failed',
      batchesCreated: 0,
      recordsProcessed: 0
    };
  }
};
