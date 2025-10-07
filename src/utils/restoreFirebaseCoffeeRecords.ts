import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

export async function restoreFirebaseCoffeeRecords() {
  try {
    console.log('🔄 Starting restoration of Firebase coffee records...');
    
    // 1. Fetch all coffee records from Firebase
    const coffeeRecordsRef = collection(db, 'coffee_records');
    const snapshot = await getDocs(coffeeRecordsRef);
    
    console.log(`📦 Found ${snapshot.docs.length} coffee records in Firebase`);
    
    // Log sample record to see structure
    if (snapshot.docs.length > 0) {
      const sampleRecord = snapshot.docs[0].data();
      console.log('📋 Sample coffee record structure:', sampleRecord);
    }
    
    // 2. Fetch all inventory movements from Supabase
    const { data: movements, error } = await supabase
      .from('inventory_movements')
      .select('coffee_record_id, quantity_kg');
    
    if (error) throw error;
    
    console.log(`📊 Found ${movements?.length || 0} inventory movements in Supabase`);
    
    // 3. Calculate movements per record
    const movementsByRecord: Record<string, number> = {};
    movements?.forEach(m => {
      movementsByRecord[m.coffee_record_id] = 
        (movementsByRecord[m.coffee_record_id] || 0) + Number(m.quantity_kg);
    });
    
    console.log('📊 Movements by record:', movementsByRecord);
    console.log('📊 Total unique records with movements:', Object.keys(movementsByRecord).length);
    
    // 4. Restore original quantities
    let restoredCount = 0;
    const updates: Promise<void>[] = [];
    
    snapshot.docs.forEach(docSnapshot => {
      const record = docSnapshot.data();
      const recordId = docSnapshot.id;
      const currentKg = Number(record.kilograms || record.weight || 0);
      const totalMovements = movementsByRecord[recordId] || 0;
      
      console.log(`🔍 Checking record ${record.batch_number || recordId}: currentKg=${currentKg}, movements=${totalMovements}`);
      
      // If current is 0 and there are negative movements (sales), restore original
      if (currentKg === 0 && totalMovements < 0) {
        // Original = current - movements (movements are negative, so this adds back)
        const originalKg = currentKg - totalMovements;
        
        console.log(`✅ Restoring ${record.batch_number}: ${currentKg}kg -> ${originalKg}kg (movements: ${totalMovements}kg)`);
        
        // Update Firebase record
        updates.push(
          updateDoc(doc(db, 'coffee_records', recordId), {
            kilograms: originalKg,
            weight: originalKg,
            updated_at: new Date()
          })
        );
        
        restoredCount++;
      } else if (currentKg < 100 && totalMovements < 0) {
        // Also restore records with suspiciously low quantities
        const originalKg = currentKg - totalMovements;
        
        console.log(`✅ Restoring ${record.batch_number}: ${currentKg}kg -> ${originalKg}kg (movements: ${totalMovements}kg)`);
        
        updates.push(
          updateDoc(doc(db, 'coffee_records', recordId), {
            kilograms: originalKg,
            weight: originalKg,
            updated_at: new Date()
          })
        );
        
        restoredCount++;
      }
    });
    
    // Execute all updates
    await Promise.all(updates);
    
    console.log(`✅ Restoration complete! Updated ${restoredCount} records.`);
    return { success: true, restoredCount };
    
  } catch (error) {
    console.error('❌ Error restoring coffee records:', error);
    return { success: false, error };
  }
}
