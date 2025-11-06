import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { supabase } from '@/integrations/supabase/client';

export const updateSeerunkumasPhone = async () => {
  try {
    const phone = '0754121793';
    
    // Update in Firebase
    const employeesQuery = query(
      collection(db, 'employees'), 
      where('email', '>=', 'seerunkumas'),
      where('email', '<=', 'seerunkumas\uf8ff')
    );
    const employeeSnapshot = await getDocs(employeesQuery);
    
    if (!employeeSnapshot.empty) {
      const employeeDoc = employeeSnapshot.docs[0];
      const employeeRef = doc(db, 'employees', employeeDoc.id);
      
      await updateDoc(employeeRef, {
        phone,
        updated_at: new Date().toISOString()
      });
      
      console.log('✅ Phone updated in Firebase');
      
      // Update in Supabase
      const email = employeeDoc.data().email;
      const { error: supabaseError } = await supabase
        .from('employees')
        .update({ 
          phone,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);
      
      if (supabaseError) {
        console.warn('⚠️ Supabase update warning:', supabaseError);
      } else {
        console.log('✅ Phone updated in Supabase');
      }
      
      return { success: true, message: 'Phone number updated successfully' };
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('❌ Error updating phone:', error);
    throw error;
  }
};
