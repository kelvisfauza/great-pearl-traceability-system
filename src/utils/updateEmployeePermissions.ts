import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

export const updateEmployeePermissions = async (email: string, updates: {
  role?: string;
  permissions?: string[];
  position?: string;
  department?: string;
}) => {
  console.log('Updating employee permissions for:', email, updates);
  
  // Primary: Use Firebase for role updates (more reliable)
  try {
    const employeesQuery = query(collection(db, 'employees'), where('email', '==', email));
    const employeeSnapshot = await getDocs(employeesQuery);
    
    if (!employeeSnapshot.empty) {
      const employeeDoc = employeeSnapshot.docs[0];
      const employeeRef = doc(db, 'employees', employeeDoc.id);
      
      await updateDoc(employeeRef, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      
      console.log('✅ Employee updated in Firebase successfully');
      
      // Secondary: Try to sync with Supabase (optional)
      try {
        const { data: employee } = await supabase
          .from('employees')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (employee) {
          await supabase
            .from('employees')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('email', email);
          
          console.log('✅ Employee synced to Supabase successfully');
        } else {
          console.log('ℹ️ Employee not found in Supabase, skipping sync');
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase sync failed (non-critical):', supabaseError);
      }
      
      return { 
        success: true, 
        message: 'Employee permissions updated successfully',
        primary: 'firebase'
      };
    } else {
      throw new Error('Employee not found in Firebase');
    }
    
  } catch (error) {
    console.error('❌ Error updating employee permissions:', error);
    throw error;
  }
};

// Predefined permission sets for different roles
export const PERMISSION_SETS = {
  ADMIN: ['*'], // All permissions
  MANAGER: [
    'Human Resources', 'Finance', 'Operations', 'Reports', 'Store Management',
    'Data Analysis', 'Procurement', 'Quality Control', 'Inventory', 'Processing',
    'Logistics', 'Sales Marketing', 'Administration'
  ],
  HR_MANAGER: ['Human Resources', 'Reports', 'Finance'],
  FINANCE_MANAGER: ['Finance', 'Reports', 'Human Resources'],
  OPERATIONS_MANAGER: [
    'Operations', 'Inventory', 'Quality Control', 'Store Management',
    'Processing', 'Procurement', 'Reports'
  ],
  DATA_ANALYST: ['Data Analysis', 'Reports', 'Finance'],
  SUPERVISOR: ['Operations', 'Quality Control', 'Reports'],
  USER: ['General Access']
};

// Quick function to set employee role with predefined permissions
export const setEmployeeRole = async (email: string, roleType: keyof typeof PERMISSION_SETS) => {
  const permissions = PERMISSION_SETS[roleType];
  const role = roleType === 'ADMIN' ? 'Administrator' : 
               roleType.includes('MANAGER') ? 'Manager' :
               roleType === 'SUPERVISOR' ? 'Supervisor' :
               roleType === 'DATA_ANALYST' ? 'Data Analyst' : 'User';
  
  return updateEmployeePermissions(email, {
    role,
    permissions
  });
};