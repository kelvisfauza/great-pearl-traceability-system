import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const deleteOct2Report = async () => {
  console.log('=== DELETING SPECIFIC REPORT ===');
  console.log('Date: 2025-10-02');
  console.log('Coffee Type: Arabica');
  console.log('Kilograms Bought: 6049');
  
  let deletedFromSupabase = false;
  let deletedFromFirebase = false;
  
  try {
    // Delete from Supabase
    const { data: supabaseRecords, error: fetchError } = await supabase
      .from('store_reports')
      .select('*')
      .eq('date', '2025-10-02')
      .eq('coffee_type', 'Arabica')
      .eq('kilograms_bought', 6049);
    
    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
    } else if (supabaseRecords && supabaseRecords.length > 0) {
      console.log('Found in Supabase:', supabaseRecords);
      
      for (const record of supabaseRecords) {
        const { error: deleteError } = await supabase
          .from('store_reports')
          .delete()
          .eq('id', record.id);
        
        if (deleteError) {
          console.error('Supabase delete error:', deleteError);
        } else {
          console.log('✅ Deleted from Supabase:', record.id);
          deletedFromSupabase = true;
        }
      }
    } else {
      console.log('❌ Not found in Supabase');
    }
    
    // Delete from Firebase
    const reportsRef = collection(db, 'store_reports');
    const q = query(
      reportsRef,
      where('date', '==', '2025-10-02'),
      where('coffee_type', '==', 'Arabica'),
      where('kilograms_bought', '==', 6049)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log('Found in Firebase:', querySnapshot.size, 'records');
      
      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(doc(db, 'store_reports', docSnapshot.id));
        console.log('✅ Deleted from Firebase:', docSnapshot.id);
        deletedFromFirebase = true;
      }
    } else {
      console.log('❌ Not found in Firebase');
    }
    
    console.log('=== DELETION SUMMARY ===');
    console.log('Deleted from Supabase:', deletedFromSupabase);
    console.log('Deleted from Firebase:', deletedFromFirebase);
    
    return {
      success: deletedFromSupabase || deletedFromFirebase,
      deletedFromSupabase,
      deletedFromFirebase
    };
    
  } catch (error) {
    console.error('Error during deletion:', error);
    throw error;
  }
};
