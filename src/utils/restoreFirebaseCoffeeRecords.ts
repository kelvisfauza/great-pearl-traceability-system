import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

export async function restoreFirebaseCoffeeRecords() {
  try {
    console.log('🔄 Starting sync from Supabase to Firebase...');
    
    // 1. Fetch all coffee records from Supabase (source of truth)
    const { data: supabaseRecords, error: supabaseError } = await supabase
      .from('coffee_records')
      .select('batch_number, kilograms, bags, coffee_type, supplier_name, date, status');
    
    if (supabaseError) throw supabaseError;
    
    console.log(`📊 Found ${supabaseRecords?.length || 0} records in Supabase`);
    
    if (!supabaseRecords || supabaseRecords.length === 0) {
      console.log('⚠️ No records found in Supabase');
      return { success: true, restoredCount: 0 };
    }
    
    // 2. For each Supabase record, find and update the corresponding Firebase record by batch_number
    let restoredCount = 0;
    const updates: Promise<void>[] = [];
    
    for (const supabaseRecord of supabaseRecords) {
      if (!supabaseRecord.batch_number) continue;
      
      // Find matching Firebase record by batch_number
      const firebaseQuery = query(
        collection(db, 'coffee_records'),
        where('batch_number', '==', supabaseRecord.batch_number)
      );
      
      const firebaseSnapshot = await getDocs(firebaseQuery);
      
      if (firebaseSnapshot.empty) {
        console.log(`⚠️ No Firebase record found for batch ${supabaseRecord.batch_number}`);
        continue;
      }
      
      // Update each matching Firebase record
      firebaseSnapshot.docs.forEach(firebaseDoc => {
        const firebaseData = firebaseDoc.data();
        const currentFirebaseKg = Number(firebaseData.kilograms || 0);
        const supabaseKg = Number(supabaseRecord.kilograms || 0);
        
        // Only update if values differ
        if (currentFirebaseKg !== supabaseKg) {
          console.log(`🔄 Syncing ${supabaseRecord.batch_number}: ${currentFirebaseKg}kg → ${supabaseKg}kg`);
          
          updates.push(
            updateDoc(doc(db, 'coffee_records', firebaseDoc.id), {
              kilograms: supabaseKg,
              bags: supabaseRecord.bags || firebaseData.bags,
              coffee_type: supabaseRecord.coffee_type || firebaseData.coffee_type,
              supplier_name: supabaseRecord.supplier_name || firebaseData.supplier_name,
              status: supabaseRecord.status || firebaseData.status,
              updated_at: new Date().toISOString()
            })
          );
          
          restoredCount++;
        }
      });
    }
    
    // Execute all updates in parallel
    await Promise.all(updates);
    
    console.log(`✅ Sync complete! Updated ${restoredCount} records.`);
    return { success: true, restoredCount };
    
  } catch (error) {
    console.error('❌ Error syncing coffee records:', error);
    return { success: false, error };
  }
}
