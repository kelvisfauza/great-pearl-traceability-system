import { supabase } from "@/integrations/supabase/client";
import { syncInventoryToBatchesSince } from "@/utils/syncInventoryToBatches";

interface CoffeeRecordWithRemaining {
  id: string;
  coffee_type: string;
  original_kg: number;
  remaining_kg: number;
  supplier_name: string;
  date: string;
  batch_number: string;
}

export const migrateInventoryToBatches = async (): Promise<{
  success: boolean;
  message: string;
  batchesCreated: number;
  recordsProcessed: number;
  totalKgMigrated: number;
}> => {
  try {
    // If batches already exist, we still need to sync any NEW/UNLINKED inventory records
    // (the /inventory page reads inventory_batches, not coffee_records directly).
    const { data: existingBatches, error: checkError } = await supabase
      .from("inventory_batches")
      .select("id")
      .limit(1);

    if (checkError) throw checkError;

    if (existingBatches && existingBatches.length > 0) {
      const sync = await syncInventoryToBatchesSince("1970-01-01T00:00:00.000Z");
      return {
        success: true,
        message: sync.added > 0
          ? `Synced ${sync.totalKg.toLocaleString()} kg from ${sync.added} record(s) into existing batches`
          : "Inventory batches already up to date",
        batchesCreated: 0,
        recordsProcessed: sync.processed,
        totalKgMigrated: sync.totalKg,
      };
    }

    // Fetch inventory records with remaining stock after sales deduction
    // Using raw SQL via RPC would be ideal, but we'll do it in steps
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

    // Fetch all sales tracking to calculate remaining
    const { data: salesTracking, error: salesError } = await supabase
      .from('sales_inventory_tracking')
      .select('coffee_record_id, quantity_kg');

    if (salesError) throw salesError;

    // Calculate sold quantities per coffee record
    const soldByRecord: Record<string, number> = {};
    for (const sale of salesTracking || []) {
      if (sale.coffee_record_id) {
        soldByRecord[sale.coffee_record_id] = (soldByRecord[sale.coffee_record_id] || 0) + sale.quantity_kg;
      }
    }

    // Calculate remaining for each record
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
      .filter(record => record.remaining_kg > 1); // Only records with actual stock remaining (>1kg to avoid floating point issues)

    if (recordsWithRemaining.length === 0) {
      return {
        success: true,
        message: 'No remaining stock to migrate - all inventory has been sold',
        batchesCreated: 0,
        recordsProcessed: 0,
        totalKgMigrated: 0
      };
    }

    // Group by coffee type (normalize case)
    const groupedByType: Record<string, CoffeeRecordWithRemaining[]> = {};
    for (const record of recordsWithRemaining) {
      const normalizedType = record.coffee_type.toLowerCase();
      const displayType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
      if (!groupedByType[displayType]) {
        groupedByType[displayType] = [];
      }
      groupedByType[displayType].push(record);
    }

    let batchesCreated = 0;
    let recordsProcessed = 0;
    let totalKgMigrated = 0;

    // Process each coffee type
    for (const [coffeeType, records] of Object.entries(groupedByType)) {
      let currentBatchKg = 0;
      let currentBatchId: string | null = null;
      let batchNumber = 1;

      for (const record of records) {
        // Check if we need a new batch
        if (!currentBatchId || currentBatchKg >= 5000) {
          // Create new batch
          const batchCode = `${coffeeType.substring(0, 3).toUpperCase()}-LEGACY-${String(batchNumber).padStart(3, '0')}`;
          
          const { data: newBatch, error: batchError } = await supabase
            .from('inventory_batches')
            .insert({
              batch_code: batchCode,
              coffee_type: coffeeType,
              target_capacity: 5000,
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

        // Add record to current batch (using remaining kg, not original)
        const { error: sourceError } = await supabase
          .from('inventory_batch_sources')
          .insert({
            batch_id: currentBatchId,
            coffee_record_id: record.id,
            kilograms: record.remaining_kg, // Use remaining, not original
            supplier_name: record.supplier_name,
            purchase_date: record.date
          });

        if (sourceError) {
          console.warn('Error adding source:', sourceError);
          continue;
        }

        currentBatchKg += record.remaining_kg;
        totalKgMigrated += record.remaining_kg;
        recordsProcessed++;

        // Update batch totals
        await supabase
          .from('inventory_batches')
          .update({
            total_kilograms: currentBatchKg,
            remaining_kilograms: currentBatchKg,
            status: currentBatchKg >= 5000 ? 'active' : 'filling'
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
      message: `Migrated ${totalKgMigrated.toLocaleString()} kg from ${recordsProcessed} records into ${batchesCreated} batch(es)`,
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
