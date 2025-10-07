import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function backfillSalesTracking() {
  try {
    console.log('🔄 Backfilling sales tracking from existing sales transactions...');
    
    // 1. Get all existing sales transactions
    const { data: salesTransactions, error: salesError } = await supabase
      .from('sales_transactions')
      .select('id, coffee_type, weight, customer, date')
      .order('created_at', { ascending: true });
    
    if (salesError) throw salesError;
    
    console.log(`📊 Found ${salesTransactions?.length || 0} existing sales transactions`);
    
    if (!salesTransactions || salesTransactions.length === 0) {
      return { success: true, message: 'No sales to backfill', backfilledCount: 0 };
    }
    
    // 2. Get all coffee records from Firebase
    const coffeeRecordsRef = collection(db, 'coffee_records');
    const snapshot = await getDocs(coffeeRecordsRef);
    
    const coffeeRecordsByType: Record<string, Array<{ id: string; batch: string; kg: number; created: string }>> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const type = (data.coffee_type || '').toLowerCase().trim();
      const kg = Number(data.kilograms || 0);
      
      if (kg > 0 && type) {
        if (!coffeeRecordsByType[type]) {
          coffeeRecordsByType[type] = [];
        }
        coffeeRecordsByType[type].push({
          id: doc.id,
          batch: data.batch_number || '',
          kg: kg,
          created: data.created_at || new Date().toISOString()
        });
      }
    });
    
    // Sort by creation date (FIFO)
    Object.keys(coffeeRecordsByType).forEach(type => {
      coffeeRecordsByType[type].sort((a, b) => 
        new Date(a.created).getTime() - new Date(b.created).getTime()
      );
    });
    
    console.log('📦 Coffee records grouped by type:', Object.keys(coffeeRecordsByType));
    
    // 3. Create tracking records for each sale (FIFO allocation)
    let totalBackfilled = 0;
    const trackingRecords: any[] = [];
    
    // Track what's been allocated so far
    const allocatedByRecord: Record<string, number> = {};
    
    for (const sale of salesTransactions) {
      const saleType = (sale.coffee_type || '').toLowerCase().trim();
      const saleKg = Number(sale.weight || 0);
      
      if (!saleType || saleKg <= 0) continue;
      
      const records = coffeeRecordsByType[saleType] || [];
      let remainingToAllocate = saleKg;
      
      console.log(`🛒 Processing sale ${sale.id}: ${saleKg}kg of ${saleType}`);
      
      for (const record of records) {
        if (remainingToAllocate <= 0) break;
        
        const alreadyAllocated = allocatedByRecord[record.id] || 0;
        const available = record.kg - alreadyAllocated;
        
        if (available <= 0) continue;
        
        const toAllocate = Math.min(available, remainingToAllocate);
        
        trackingRecords.push({
          sale_id: sale.id,
          coffee_record_id: record.id,
          batch_number: record.batch,
          coffee_type: sale.coffee_type,
          quantity_kg: toAllocate,
          customer_name: sale.customer,
          sale_date: sale.date,
          created_by: 'System Backfill'
        });
        
        allocatedByRecord[record.id] = alreadyAllocated + toAllocate;
        remainingToAllocate -= toAllocate;
        
        console.log(`  ✅ Allocated ${toAllocate}kg from batch ${record.batch}`);
      }
      
      if (remainingToAllocate > 0) {
        console.warn(`  ⚠️ Could not fully allocate sale ${sale.id}: ${remainingToAllocate}kg remaining`);
      }
      
      totalBackfilled++;
    }
    
    // 4. Insert all tracking records
    if (trackingRecords.length > 0) {
      console.log(`📤 Inserting ${trackingRecords.length} tracking records...`);
      
      const { error: insertError } = await supabase
        .from('sales_inventory_tracking')
        .insert(trackingRecords);
      
      if (insertError) throw insertError;
    }
    
    console.log(`✅ Backfill complete! Created ${trackingRecords.length} tracking records for ${totalBackfilled} sales`);
    
    return {
      success: true,
      message: `Backfilled ${trackingRecords.length} tracking records for ${totalBackfilled} sales`,
      backfilledCount: trackingRecords.length,
      salesProcessed: totalBackfilled
    };
    
  } catch (error) {
    console.error('❌ Error backfilling sales tracking:', error);
    return { success: false, error };
  }
}
