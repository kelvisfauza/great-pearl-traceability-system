import { supabase } from '@/integrations/supabase/client';

export const updateEmployeePermissions = async (email: string, updates: {
  role?: string;
  permissions?: string[];
  position?: string;
  department?: string;
}) => {
  try {
    console.log('Updating employee permissions for:', email);
    
    // Find employee by email
    const { data: employee, error: findError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .single();
    
    if (findError || !employee) {
      throw new Error('Employee not found');
    }
    
    // Update the employee record
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    if (updateError) {
      throw updateError;
    }
    
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