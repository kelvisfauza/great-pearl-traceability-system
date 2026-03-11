import { updateEmployeePermissions } from './updateEmployeePermissions';

/**
 * Restore Denis's Super Admin access
 * Run this in the browser console: import('./utils/restoreDenisAdminAccess').then(m => m.restoreDenisAdminAccess())
 */
export const restoreDenisAdminAccess = async () => {
  console.log('🔄 Restoring Denis admin access...');
  
  try {
    await updateEmployeePermissions('bwambaledenis@greatagrocoffee.com', {
      role: 'Super Admin',
      permissions: ['*'],
      department: 'Administration'
    });
    
    console.log('✅ Denis admin access restored successfully!');
    console.log('📋 Role: Super Admin');
    console.log('📋 Permissions: All (*)');
    
    // Reload page to reflect changes
    setTimeout(() => {
      console.log('🔄 Reloading page...');
      window.location.reload();
    }, 1500);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error restoring Denis admin access:', error);
    return { success: false, error };
  }
};
