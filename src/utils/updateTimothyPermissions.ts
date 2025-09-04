import { supabase } from '@/integrations/supabase/client';

export const updateTimothyPermissions = async () => {
  try {
    console.log('🔧 Adding Finance permissions to Timothy...');
    
    // Update Timothy's permissions directly in Supabase
    const { data, error } = await supabase
      .from('employees')
      .update({
        permissions: ['Human Resources', 'Reports', 'Finance'],
        department: 'Finance',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'tatwanzire@gmail.com')
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Timothy permissions updated in Supabase:', data);
    alert('✅ Finance permissions added to Timothy successfully! Please refresh the page.');
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error updating Timothy permissions:', error);
    alert('❌ Failed to update Timothy permissions. Check console for details.');
    throw error;
  }
};

// Execute the update immediately when this file is imported
console.log('🚀 Executing Timothy permissions update...');
updateTimothyPermissions().then(() => {
  console.log('Timothy update completed');
}).catch((error) => {
  console.error('Timothy update failed:', error);
});