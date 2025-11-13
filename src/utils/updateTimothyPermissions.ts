import { supabase } from '@/integrations/supabase/client';

export const updateTimothyPermissions = async () => {
  try {
    console.log('🔧 Granting full Quality Control access to Timothy...');
    
    // First get current permissions
    const { data: current, error: fetchError } = await supabase
      .from('employees')
      .select('permissions')
      .eq('email', 'tatwanzire@gmail.com')
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentPermissions = current?.permissions || [];
    const updatedPermissions = [...currentPermissions];
    
    // Add all Quality Control permissions for full access
    const qualityPermissions = [
      'Quality Control:view',
      'Quality Control:create',
      'Quality Control:edit',
      'Quality Control:delete',
      'Quality Control:manage',
      'Quality Control:approve',
      'Quality Control:export',
      'Quality Control:print'
    ];
    
    qualityPermissions.forEach(permission => {
      if (!updatedPermissions.includes(permission)) {
        updatedPermissions.push(permission);
      }
    });
    
    // Update Timothy's permissions directly in Supabase
    const { data, error } = await supabase
      .from('employees')
      .update({
        permissions: updatedPermissions,
        updated_at: new Date().toISOString()
      })
      .eq('email', 'tatwanzire@gmail.com')
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Timothy permissions updated in Supabase:', data);
    alert('✅ Full Quality Control access granted to Timothy successfully! He now has complete access to the quality section.');
    
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