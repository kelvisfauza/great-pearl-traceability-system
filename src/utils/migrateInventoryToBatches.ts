import { supabase } from "@/integrations/supabase/client";

interface CoffeeRecordWithRemaining {
  id: string;
  coffee_type: string;
  original_kg: number;
  remaining_kg: number;
  supplier_name: string;
  date: string;
  batch_number: string;
}

/**
 * Migrate inventory into daily batches: one batch per coffee type per day.
 * Clears existing batches and re-imports from coffee_records.
 */
export const migrateInventoryToBatches = async (): Promise<{
  success: boolean;
  message: string;
  batchesCreated: number;
  recordsProcessed: number;
  totalKgMigrated: number;
}> => {
  try {
    // Step 1: Clear existing batch data to re-import
    // Delete sources first (FK), then sales, then batches
    await supabase.from('inventory_batch_sources').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('inventory_batch_sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('inventory_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Step 2: Fetch inventory records
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
        recordsProcessed: 0,
        totalKgMigrated: 0
      };
    }

    // Step 3: Fetch sales tracking to calculate remaining
    const { data: salesTracking, error: salesError } = await supabase
      .from('sales_inventory_tracking')
      .select('coffee_record_id, quantity_kg');

    if (salesError) throw salesError;

    const soldByRecord: Record<string, number> = {};
    for (const sale of salesTracking || []) {
      if (sale.coffee_record_id) {
        soldByRecord[sale.coffee_record_id] = (soldByRecord[sale.coffee_record_id] || 0) + sale.quantity_kg;
      }
    }

    // Step 4: Calculate remaining for each record
    const recordsWithRemaining: CoffeeRecordWithRemaining[] = coffeeRecords
      .map(record => {
        const sold = soldByRecord[record.id] || 0;
        const remaining = record.kilograms - sold;
        return {
          id: record.id,
          coffee_type: record.coffee_type,
          original_kg: record.kilograms,
          remaining_kg: remaining,
          supplier_name: record.supplier_name,
          date: record.date,
          batch_number: record.batch_number
        };
      })
      .filter(record => record.remaining_kg > 1);

    if (recordsWithRemaining.length === 0) {
      return {
        success: true,
        message: 'No remaining stock to migrate - all inventory has been sold',
        batchesCreated: 0,
        recordsProcessed: 0,
        totalKgMigrated: 0
      };
    }

    // Step 5: Group by coffee type + date
    // Key: "CoffeeType|YYYY-MM-DD"
    const groupedByTypeAndDate: Record<string, CoffeeRecordWithRemaining[]> = {};
    for (const record of recordsWithRemaining) {
      const normalizedType = record.coffee_type.charAt(0).toUpperCase() + record.coffee_type.slice(1).toLowerCase();
      const dateStr = record.date.slice(0, 10);
      const key = `${normalizedType}|${dateStr}`;
      if (!groupedByTypeAndDate[key]) {
        groupedByTypeAndDate[key] = [];
      }
      groupedByTypeAndDate[key].push({ ...record, coffee_type: normalizedType });
    }

    let batchesCreated = 0;
    let recordsProcessed = 0;
    let totalKgMigrated = 0;
    let globalBatchNum = 0;

    // Step 6: Create one batch per type+date group
    const sortedKeys = Object.keys(groupedByTypeAndDate).sort();
    
    for (const key of sortedKeys) {
      const records = groupedByTypeAndDate[key];
      const [coffeeType, dateStr] = key.split('|');
      const prefix = coffeeType.substring(0, 3).toUpperCase();
      
      globalBatchNum++;
      const batchCode = `B${String(globalBatchNum).padStart(3, '0')}-${dateStr}-${prefix}`;

      let batchTotalKg = 0;

      // Create the batch
      const { data: newBatch, error: batchError } = await supabase
        .from('inventory_batches')
        .insert({
          batch_code: batchCode,
          coffee_type: coffeeType,
          batch_date: dateStr,
          total_kilograms: 0,
          remaining_kilograms: 0,
          status: 'active'
        })
        .select()
        .single();

      if (batchError) throw batchError;
      batchesCreated++;

      // Add all records for this type+date to the batch
      for (const record of records) {
        const { error: sourceError } = await supabase
          .from('inventory_batch_sources')
          .insert({
            batch_id: newBatch.id,
            coffee_record_id: record.id,
            kilograms: record.remaining_kg,
            supplier_name: record.supplier_name,
            purchase_date: record.date
          });

        if (sourceError) {
          console.warn('Error adding source:', sourceError);
          continue;
        }

        batchTotalKg += record.remaining_kg;
        totalKgMigrated += record.remaining_kg;
        recordsProcessed++;
      }

      // Update batch totals
      const finalStatus = batchTotalKg === 0 ? 'sold_out' : 'active';
      await supabase
        .from('inventory_batches')
        .update({
          total_kilograms: batchTotalKg,
          remaining_kilograms: batchTotalKg,
          status: finalStatus
        })
        .eq('id', newBatch.id);
    }

    return {
      success: true,
      message: `Migrated ${totalKgMigrated.toLocaleString()} kg from ${recordsProcessed} records into ${batchesCreated} daily batch(es)`,
      batchesCreated,
      recordsProcessed,
      totalKgMigrated
    };
  } catch (error: any) {
    console.error('Migration error:', error);
    return {
      success: false,
      message: error.message || 'Migration failed',
      batchesCreated: 0,
      recordsProcessed: 0,
      totalKgMigrated: 0
    };
  }
};
