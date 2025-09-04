import { updateEmployeePermissions } from './updateEmployeePermissions';

export const updateTimothyPermissions = async () => {
  try {
    console.log('🔧 Adding Finance permissions to Timothy...');
    
    // Update Timothy's permissions to include Finance
    const result = await updateEmployeePermissions('tatwanzire@gmail.com', {
      permissions: ['Human Resources', 'Reports', 'Finance'],
      department: 'Finance' // Also update department to Finance
    });
    
    console.log('✅ Timothy permissions updated:', result);
    alert('✅ Finance permissions added to Timothy successfully! Please refresh the page.');
    
    return result;
  } catch (error) {
    console.error('❌ Error updating Timothy permissions:', error);
    alert('❌ Failed to update Timothy permissions. Check console for details.');
    throw error;
  }
};

// Execute the update immediately
console.log('🚀 Executing Timothy permissions update...');
updateTimothyPermissions();