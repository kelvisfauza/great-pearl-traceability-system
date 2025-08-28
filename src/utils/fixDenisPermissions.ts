import { updateEmployeePermissions } from './updateEmployeePermissions';

export const fixDenisPermissions = async () => {
  try {
    console.log('Fixing Denis permissions with meaningful access...');
    
    // Give Denis meaningful permissions so he can actually use the system
    await updateEmployeePermissions('bwambaledenis8@gmail.com', {
      role: 'User',
      permissions: ['Reports', 'Store Management', 'Data Analysis'], // Give him access to basic modules
      position: 'Staff',
      department: 'General'
    });
    
    console.log('✅ Denis account fixed with proper permissions');
    return { success: true, message: 'Denis now has Reports, Store Management, and Data Analysis access' };
  } catch (error) {
    console.error('❌ Error fixing Denis permissions:', error);
    throw error;
  }
};

// Auto-execute to fix Denis permissions immediately
fixDenisPermissions().then(() => {
  console.log('Denis account has been fixed with proper permissions');
}).catch(error => {
  console.error('Failed to fix Denis account:', error);
});