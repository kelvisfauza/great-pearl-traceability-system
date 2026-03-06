import { supabase } from "@/integrations/supabase/client";

interface ResyncResult {
  success: boolean;
  message: string;
  totalAvailableKg: number;
  batchesUpdated: number;
  batchesCreated: number;
}

/**
 * Resync inventory batches (daily batching model).
 * Finds unlinked coffee_records and adds them to the correct daily batch.
 */
export const resyncInventoryBatches = async (): Promise<ResyncResult> => {
  try {
    // Step 1: Get all inventory coffee records
    const { data: coffeeRecords, error: fetchError } = await supabase
      .from('coffee_records')
      .select('id, coffee_type, kilograms, supplier_name, date, batch_number, created_at')
      .eq('status', 'inventory')
      .gt('kilograms', 0)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    // Step 2: Get sales tracking
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

    // Step 3: Get already-linked records
    const { data: existingSources, error: sourcesError } = await supabase
      .from('inventory_batch_sources')
      .select('coffee_record_id');

    if (sourcesError) throw sourcesError;

    const linkedRecordIds = new Set((existingSources || []).map(s => s.coffee_record_id));

    // Step 4: Find unlinked records with remaining stock
    const unlinkedRecords = (coffeeRecords || [])
      .filter(record => !linkedRecordIds.has(record.id))
      .map(record => {
        const sold = soldByRecord[record.id] || 0;
        const remaining = record.kilograms - sold;
        return {
          id: record.id,
          coffee_type: record.coffee_type,
          remaining_kg: remaining,
          supplier_name: record.supplier_name,
          date: record.date
        };
      })
      .filter(record => record.remaining_kg > 1);

    if (unlinkedRecords.length === 0) {
      const { data: batches } = await supabase
        .from('inventory_batches')
        .select('remaining_kilograms')
        .neq('status', 'sold_out');
      
      const totalAvailable = (batches || []).reduce((sum, b) => sum + b.remaining_kilograms, 0);
      
      return {
        success: true,
        message: 'Inventory batches are already in sync with actual stock',
        totalAvailableKg: totalAvailable,
        batchesUpdated: 0,
        batchesCreated: 0
      };
    }

    // Step 5: Group by type + date and add to daily batches
    let batchesCreated = 0;
    let batchesUpdated = 0;
    let totalKgAdded = 0;

    // Helper to get next batch number
    const getNextBatchNum = async (): Promise<number> => {
      const { data } = await supabase
        .from('inventory_batches')
        .select('batch_code')
        .like('batch_code', 'B%');
      let max = 0;
      for (const row of data || []) {
        const match = String(row.batch_code || '').match(/^B(\d+)/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n)) max = Math.max(max, n);
        }
      }
      return max + 1;
    };

    for (const record of unlinkedRecords) {
      const normalizedType = record.coffee_type.charAt(0).toUpperCase() + record.coffee_type.slice(1).toLowerCase();
      const dateStr = record.date.slice(0, 10);

      // Find or create daily batch
      let { data: batch } = await supabase
        .from('inventory_batches')
        .select('*')
        .ilike('coffee_type', normalizedType)
        .eq('batch_date', dateStr)
        .limit(1)
        .maybeSingle();

      if (!batch) {
        const prefix = normalizedType.substring(0, 3).toUpperCase();
        const nextNum = await getNextBatchNum();
        const batchCode = `B${String(nextNum).padStart(3, '0')}-${dateStr}-${prefix}`;

        const { data: newBatch, error: createError } = await supabase
          .from('inventory_batches')
          .insert({
            batch_code: batchCode,
            coffee_type: normalizedType,
            batch_date: dateStr,
            total_kilograms: 0,
            remaining_kilograms: 0,
            status: 'active'
          })
          .select()
          .single();

        if (createError) throw createError;
        batch = newBatch;
        batchesCreated++;
      }

      // Add source
      const { error: sourceError } = await supabase
        .from('inventory_batch_sources')
        .insert({
          batch_id: batch.id,
          coffee_record_id: record.id,
          kilograms: record.remaining_kg,
          supplier_name: record.supplier_name,
          purchase_date: record.date
        });

      if (sourceError) {
        console.warn('Error adding source:', sourceError);
        continue;
      }

      // Update batch totals
      const newTotal = (batch.total_kilograms || 0) + record.remaining_kg;
      const newRemaining = (batch.remaining_kilograms || 0) + record.remaining_kg;

      await supabase
        .from('inventory_batches')
        .update({
          total_kilograms: newTotal,
          remaining_kilograms: newRemaining
        })
        .eq('id', batch.id);

      totalKgAdded += record.remaining_kg;
      batchesUpdated++;
    }

    // Calculate final totals
    const { data: finalBatches } = await supabase
      .from('inventory_batches')
      .select('remaining_kilograms')
      .neq('status', 'sold_out');
    
    const totalAvailable = (finalBatches || []).reduce((sum, b) => sum + b.remaining_kilograms, 0);

    return {
      success: true,
      message: `Added ${totalKgAdded.toLocaleString()} kg from ${unlinkedRecords.length} records into daily batches`,
      totalAvailableKg: totalAvailable,
      batchesUpdated,
      batchesCreated
    };
  } catch (error: any) {
    console.error('Resync error:', error);
    return {
      success: false,
      message: error.message || 'Resync failed',
      totalAvailableKg: 0,
      batchesUpdated: 0,
      batchesCreated: 0
    };
  }
};
