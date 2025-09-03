import { updateEmployeePermissions } from './updateEmployeePermissions';

export const updateTimothyPermissions = async () => {
  try {
    console.log('🔧 Adding Finance permissions to Timothy...');
    
    // Get Timothy's current permissions and add Finance
    const result = await updateEmployeePermissions('tatwanzire@gmail.com', {
      permissions: ['Human Resources', 'Reports', 'Finance']
    });
    
    console.log('✅ Timothy permissions updated:', result);
    alert('✅ Finance permissions added to Timothy successfully!');
    
    return result;
  } catch (error) {
    console.error('❌ Error updating Timothy permissions:', error);
    alert('❌ Failed to update Timothy permissions. Check console for details.');
    throw error;
  }
};

// Auto-execute the update
updateTimothyPermissions();