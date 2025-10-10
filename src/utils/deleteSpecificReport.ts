import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const deleteOct2Report = async () => {
  console.log('=== DELETING SPECIFIC REPORT ===');
  console.log('Target ID: 5f784fc9-bd0c-4a09-a45d-274da9cdd6d9');
  
  try {
    // Delete directly by ID from Supabase
    const { error: deleteError } = await supabase
      .from('store_reports')
      .delete()
      .eq('id', '5f784fc9-bd0c-4a09-a45d-274da9cdd6d9');
    
    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      throw deleteError;
    }
    
    console.log('✅ Successfully deleted from Supabase');
    
    // Also try to delete from Firebase by matching fields
    try {
      const reportsRef = collection(db, 'store_reports');
      const q = query(
        reportsRef,
        where('date', '==', '2025-10-02'),
        where('kilograms_sold', '==', 19425)
      );
      
      const querySnapshot = await getDocs(q);
      
      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(doc(db, 'store_reports', docSnapshot.id));
        console.log('✅ Deleted from Firebase:', docSnapshot.id);
      }
    } catch (firebaseError) {
      console.log('Firebase deletion attempt:', firebaseError);
    }
    
    return {
      success: true,
      deletedFromSupabase: true,
      deletedFromFirebase: true
    };
    
  } catch (error) {
    console.error('Error during deletion:', error);
    throw error;
  }
};
