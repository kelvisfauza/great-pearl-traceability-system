import { updateEmployeePermissions } from './updateEmployeePermissions';

export const fixDenisPermissions = async () => {
  try {
    console.log('Fixing Denis permissions...');
    
    // Update Denis to have only basic user permissions
    await updateEmployeePermissions('bwambaledenis8@gmail.com', {
      role: 'User',
      permissions: ['General Access'],
      position: 'Staff',
      department: 'General'
    });
    
    console.log('✅ Denis permissions fixed successfully');
    return { success: true, message: 'Denis permissions updated to User level' };
  } catch (error) {
    console.error('❌ Error fixing Denis permissions:', error);
    throw error;
  }
};

// Auto-execute to fix Denis permissions immediately
fixDenisPermissions().then(() => {
  console.log('Denis permissions have been reduced to basic user level');
}).catch(error => {
  console.error('Failed to fix Denis permissions:', error);
});