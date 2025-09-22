import { setEmployeeRole } from './updateEmployeePermissions';

export const fixTumwinePermissions = async () => {
  try {
    console.log('🔧 Fixing Tumwine permissions...');
    
    // Update Tumwine Alex to Manager role with full permissions
    const result = await setEmployeeRole('keizyeda@gmail.com', 'MANAGER');
    
    console.log('✅ Tumwine permissions updated:', result);
    return result;
  } catch (error) {
    console.error('❌ Error updating Tumwine permissions:', error);
    throw error;
  }
};