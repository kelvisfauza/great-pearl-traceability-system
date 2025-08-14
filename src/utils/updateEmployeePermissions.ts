import { supabase } from '@/integrations/supabase/client';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const updateEmployeePermissions = async (email: string, updates: {
  role?: string;
  permissions?: string[];
  position?: string;
  department?: string;
}) => {
  const results = { supabase: false, firebase: false };
  
  try {
    console.log('Updating employee permissions for:', email);
    
    // Try updating in Supabase first
    try {
      const { data: employee, error: findError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (employee && !findError) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('email', email);
        
        if (!updateError) {
          results.supabase = true;
          console.log('Employee updated in Supabase successfully');
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase update failed:', supabaseError);
    }
    
    // Try updating in Firebase
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
        
        results.firebase = true;
        console.log('Employee updated in Firebase successfully');
      }
    } catch (firebaseError) {
      console.warn('Firebase update failed:', firebaseError);
    }
    
    if (results.supabase || results.firebase) {
      return { success: true, message: 'Employee permissions updated successfully', results };
    } else {
      throw new Error('Employee not found in either system');
    }
    
  } catch (error) {
    console.error('Error updating employee permissions:', error);
    throw error;
  }
};

// Predefined permission sets for different roles
export const PERMISSION_SETS = {
  ADMIN: ['*'], // All permissions
  MANAGER: [
    'Human Resources', 'Finance', 'Operations', 'Reports', 'Store Management',
    'Data Analysis', 'Procurement', 'Quality Control', 'Inventory', 'Processing',
    'Logistics', 'Sales Marketing'
  ],
  HR_MANAGER: ['Human Resources', 'Reports', 'Finance'],
  FINANCE_MANAGER: ['Finance', 'Reports', 'Human Resources'],
  OPERATIONS_MANAGER: [
    'Operations', 'Inventory', 'Quality Control', 'Store Management',
    'Processing', 'Procurement', 'Reports'
  ],
  DATA_ANALYST: ['Data Analysis', 'Reports'],
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