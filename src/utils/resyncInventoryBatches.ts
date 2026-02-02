import { supabase } from "@/integrations/supabase/client";

interface ResyncResult {
  success: boolean;
  message: string;
  totalAvailableKg: number;
  batchesUpdated: number;
  batchesCreated: number;
}

/**
 * Resync inventory batches to reflect actual coffee in store.
 * This recalculates based on coffee_records with status='inventory' 
 * minus any quantities already sold (tracked in sales_inventory_tracking).
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

    // Step 2: Get all sales tracking to calculate what's been sold
    const { data: salesTracking, error: salesError } = await supabase
      .from('sales_inventory_tracking')
      .select('coffee_record_id, quantity_kg');

    if (salesError) throw salesError;

    // Step 3: Calculate sold quantities per coffee record
    const soldByRecord: Record<string, number> = {};
    for (const sale of salesTracking || []) {
      if (sale.coffee_record_id) {
        soldByRecord[sale.coffee_record_id] = (soldByRecord[sale.coffee_record_id] || 0) + sale.quantity_kg;
      }
    }

    // Step 4: Get records already linked to batches
    const { data: existingSources, error: sourcesError } = await supabase
      .from('inventory_batch_sources')
      .select('coffee_record_id, kilograms');

    if (sourcesError) throw sourcesError;

    const linkedRecordIds = new Set((existingSources || []).map(s => s.coffee_record_id));

    // Step 5: Calculate remaining for each unlinked record
    const unlinkedRecords = (coffeeRecords || [])
      .filter(record => !linkedRecordIds.has(record.id))
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

    if (unlinkedRecords.length === 0) {
      // Calculate current totals
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

    // Step 6: Group unlinked records by coffee type (normalize case)
    const groupedByType: Record<string, typeof unlinkedRecords> = {};
    for (const record of unlinkedRecords) {
      const normalizedType = record.coffee_type.toLowerCase();
      const displayType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
      if (!groupedByType[displayType]) {
        groupedByType[displayType] = [];
      }
      groupedByType[displayType].push(record);
    }

    let batchesCreated = 0;
    let batchesUpdated = 0;
    let totalKgAdded = 0;

    // Step 7: Process each coffee type
    for (const [coffeeType, records] of Object.entries(groupedByType)) {
      // Find existing filling batch for this coffee type
      const { data: existingBatch } = await supabase
        .from('inventory_batches')
        .select('*')
        .eq('coffee_type', coffeeType)
        .in('status', ['filling', 'active'])
        .lt('total_kilograms', 5000)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let currentBatchId: string | null = existingBatch?.id || null;
      let currentBatchKg = existingBatch?.total_kilograms || 0;

      for (const record of records) {
        // Check if we need a new batch
        if (!currentBatchId || currentBatchKg >= 5000) {
          // Count existing batches for this type
          const { count } = await supabase
            .from('inventory_batches')
            .select('*', { count: 'exact', head: true })
            .ilike('coffee_type', coffeeType);

          const batchNum = (count || 0) + 1;
          const batchCode = `${coffeeType.substring(0, 3).toUpperCase()}-B${String(batchNum).padStart(3, '0')}`;
          
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
          batchesCreated++;
        }

        // Add record to current batch
        const { error: sourceError } = await supabase
          .from('inventory_batch_sources')
          .insert({
            batch_id: currentBatchId,
            coffee_record_id: record.id,
            kilograms: record.remaining_kg,
            supplier_name: record.supplier_name,
            purchase_date: record.date
          });

        if (sourceError) {
          console.warn('Error adding source:', sourceError);
          continue;
        }

        currentBatchKg += record.remaining_kg;
        totalKgAdded += record.remaining_kg;

        // Update batch totals
        const { error: updateError } = await supabase
          .from('inventory_batches')
          .update({
            total_kilograms: currentBatchKg,
            remaining_kilograms: currentBatchKg,
            status: currentBatchKg >= 5000 ? 'active' : 'filling'
          })
          .eq('id', currentBatchId);

        if (updateError) throw updateError;
        batchesUpdated++;
      }

      // Mark batch as active if it has content
      if (currentBatchId && currentBatchKg > 0) {
        await supabase
          .from('inventory_batches')
          .update({ status: 'active' })
          .eq('id', currentBatchId);
      }
    }

    // Calculate final totals
    const { data: finalBatches } = await supabase
      .from('inventory_batches')
      .select('remaining_kilograms')
      .neq('status', 'sold_out');
    
    const totalAvailable = (finalBatches || []).reduce((sum, b) => sum + b.remaining_kilograms, 0);

    return {
      success: true,
      message: `Added ${totalKgAdded.toLocaleString()} kg from ${unlinkedRecords.length} records into batches`,
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
