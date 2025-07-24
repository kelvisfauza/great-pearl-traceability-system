// Mock Firebase functionality - Firebase disabled

export const updateEmployeePermissions = async (email: string, updates: {
  role?: string;
  permissions?: string[];
  position?: string;
  department?: string;
}) => {
  try {
    console.log('Mock: updateEmployeePermissions called for', email, updates);
    return { success: true, message: 'Employee permissions updated successfully (mock)' };
  } catch (error) {
    console.error('Error updating employee permissions:', error);
    return { success: false, message: 'Failed to update employee permissions (mock)' };
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
  console.log('Mock: setEmployeeRole called for', email, roleType);
  return updateEmployeePermissions(email, {
    role: roleType,
    permissions: PERMISSION_SETS[roleType]
  });
};