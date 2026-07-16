import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

export const updateEmployeePermissions = async (email: string, updates: {
  role?: string;
  permissions?: string[];
  position?: string;
  department?: string;
  disabled?: boolean;
}) => {
  console.log('Updating employee permissions for:', email, updates);

  // Primary: Supabase (source of truth)
  const { data: employee, error: findError } = await supabase
    .from('employees')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (findError) {
    console.error('❌ Error looking up employee in Supabase:', findError);
    throw findError;
  }
  if (!employee) {
    throw new Error(`Employee not found in Supabase for email: ${email}`);
  }

  const { error: updateError } = await supabase
    .from('employees')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('email', email);

  if (updateError) {
    console.error('❌ Supabase update failed:', updateError);
    throw updateError;
  }

  console.log('✅ Employee updated in Supabase successfully');

  // Best-effort Firebase mirror (non-critical)
  try {
    const employeesQuery = query(collection(db, 'employees'), where('email', '==', email));
    const employeeSnapshot = await getDocs(employeesQuery);
    if (!employeeSnapshot.empty) {
      const employeeDoc = employeeSnapshot.docs[0];
      await updateDoc(doc(db, 'employees', employeeDoc.id), {
        ...updates,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (firebaseError) {
    console.warn('⚠️ Firebase mirror failed (non-critical):', firebaseError);
  }

  return {
    success: true,
    message: 'Employee permissions updated successfully',
    primary: 'supabase',
  };
};

// Predefined permission sets for different roles
export const PERMISSION_SETS = {
  ADMIN: ['*'], // All permissions
  MANAGER: [
    'Human Resources', 'Finance', 'Operations', 'Reports', 'Store Management',
    'Data Analysis', 'Procurement', 'Quality Control', 'Inventory', 'Processing',
    'Logistics', 'Sales Marketing', 'Administration', 'Milling', 'Field Operations'
  ],
  HR_MANAGER: ['Human Resources', 'Reports', 'Finance'],
  FINANCE_MANAGER: ['Finance', 'Reports', 'Human Resources'],
  OPERATIONS_MANAGER: [
    'Operations', 'Inventory', 'Quality Control', 'Store Management',
    'Processing', 'Procurement', 'Reports', 'Milling'
  ],
  DATA_ANALYST: ['Data Analysis', 'Reports', 'Finance', 'Store Management'],
  SUPERVISOR: ['Operations', 'Quality Control', 'Reports', 'Store Management'],
  USER: ['Reports', 'Store Management'] // Basic permissions for regular users
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