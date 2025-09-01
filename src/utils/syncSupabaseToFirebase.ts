import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs, query, where, updateDoc, doc, addDoc } from 'firebase/firestore';

export const syncSupabaseToFirebase = async () => {
  try {
    console.log('🔄 Starting Supabase to Firebase sync...');
    
    // Get all employees from Supabase
    const { data: supabaseEmployees, error } = await supabase
      .from('employees')
      .select('*');
    
    if (error) {
      console.error('Error fetching Supabase employees:', error);
      return { success: false, error: error.message };
    }
    
    if (!supabaseEmployees) {
      return { success: false, error: 'No employees found in Supabase' };
    }
    
    console.log(`📊 Found ${supabaseEmployees.length} employees in Supabase`);
    
    let syncedCount = 0;
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const supabaseEmp of supabaseEmployees) {
      try {
        // Check if employee exists in Firebase
        const firebaseQuery = query(
          collection(db, 'employees'),
          where('email', '==', supabaseEmp.email)
        );
        
        const firebaseSnapshot = await getDocs(firebaseQuery);
        
        const firebaseData = {
          name: supabaseEmp.name,
          email: supabaseEmp.email,
          phone: supabaseEmp.phone || '',
          position: supabaseEmp.position,
          department: supabaseEmp.department,
          salary: supabaseEmp.salary || 0,
          role: supabaseEmp.role,
          permissions: supabaseEmp.permissions || ['General Access'],
          status: supabaseEmp.status,
          join_date: supabaseEmp.join_date,
          address: supabaseEmp.address || '',
          emergency_contact: supabaseEmp.emergency_contact || '',
          employee_id: supabaseEmp.employee_id,
          authUserId: supabaseEmp.auth_user_id,
          disabled: supabaseEmp.disabled || false,
          updated_at: new Date().toISOString()
        };
        
        if (firebaseSnapshot.empty) {
          // Add new employee to Firebase
          console.log(`➕ Adding ${supabaseEmp.name} to Firebase`);
          await addDoc(collection(db, 'employees'), {
            ...firebaseData,
            created_at: supabaseEmp.created_at || new Date().toISOString()
          });
          addedCount++;
        } else {
          // Update existing employee in Firebase
          console.log(`🔄 Updating ${supabaseEmp.name} in Firebase`);
          const firebaseDocId = firebaseSnapshot.docs[0].id;
          await updateDoc(doc(db, 'employees', firebaseDocId), firebaseData);
          updatedCount++;
        }
        
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing employee ${supabaseEmp.name}:`, error);
      }
    }
    
    console.log(`✅ Sync completed: ${syncedCount} employees processed, ${addedCount} added, ${updatedCount} updated`);
    
    return {
      success: true,
      message: `Successfully synced ${syncedCount} employees`,
      stats: { total: syncedCount, added: addedCount, updated: updatedCount }
    };
    
  } catch (error) {
    console.error('Error syncing Supabase to Firebase:', error);
    return { success: false, error: 'Sync operation failed' };
  }
};