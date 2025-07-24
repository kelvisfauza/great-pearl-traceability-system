import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const updateEmployeePermissions = async (email: string, updates: {
  role?: string;
  permissions?: string[];
  position?: string;
  department?: string;
}) => {
  try {
    console.log('Updating employee permissions for:', email);
    
    // Find employee by email
    const employeesQuery = query(collection(db, 'employees'), where('email', '==', email));
    const employeeSnapshot = await getDocs(employeesQuery);
    
    if (employeeSnapshot.empty) {
      throw new Error('Employee not found');
    }
    
    const employeeDoc = employeeSnapshot.docs[0];
    const employeeRef = doc(db, 'employees', employeeDoc.id);
    
    // Update the employee record
    await updateDoc(employeeRef, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    console.log('Employee permissions updated successfully');
    return { success: true, message: 'Employee permissions updated successfully' };
    
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
  SUPERVISOR: ['Operations', 'Quality Control', 'Reports'],
  USER: ['General Access']
};

// Quick function to set employee role with predefined permissions
export const setEmployeeRole = async (email: string, roleType: keyof typeof PERMISSION_SETS) => {
  const permissions = PERMISSION_SETS[roleType];
  const role = roleType === 'ADMIN' ? 'Administrator' : 
               roleType.includes('MANAGER') ? 'Manager' :
               roleType === 'SUPERVISOR' ? 'Supervisor' : 'User';
  
  return updateEmployeePermissions(email, {
    role,
    permissions
  });
};