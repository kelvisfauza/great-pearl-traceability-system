import { updateEmployeePermissions } from './updateEmployeePermissions';

export const fixDenisPermissions = async () => {
  try {
    console.log('Normalizing Denis account to regular user...');
    
    // Give Denis meaningful permissions so he can actually use the system
    await updateEmployeePermissions('bwambaledenis8@gmail.com', {
      role: 'User',
      permissions: ['Reports', 'Store Management', 'Data Analysis'], // Give him access to basic modules
      position: 'Staff',
      department: 'General'
    });
    
    console.log('✅ Denis account normalized successfully');
    return { success: true, message: 'Denis account is now a regular user account' };
  } catch (error) {
    console.error('❌ Error normalizing Denis account:', error);
    throw error;
  }
};

// Auto-execute to normalize Denis account immediately
fixDenisPermissions().then(() => {
  console.log('Denis account has been normalized and can now be managed through admin interface');
}).catch(error => {
  console.error('Failed to normalize Denis account:', error);
});