import { supabase } from '@/integrations/supabase/client';

export const grantTimothyUserManagement = async () => {
  try {
    console.log('🔧 Granting User Management permissions to Timothy...');
    
    const { data: current, error: fetchError } = await supabase
      .from('employees')
      .select('permissions')
      .eq('email', 'tatwanzire@gmail.com')
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentPermissions = current?.permissions || [];
    const newPermissions = [
      'User Management:view',
      'User Management:create',
      'User Management:edit',
      'User Management:manage'
    ];
    
    const updatedPermissions = [...new Set([...currentPermissions, ...newPermissions])];
    
    const { data, error } = await supabase
      .from('employees')
      .update({
        permissions: updatedPermissions,
        updated_at: new Date().toISOString()
      })
      .eq('email', 'tatwanzire@gmail.com')
      .select();
    
    if (error) throw error;
    
    console.log('✅ User Management permissions granted:', data);
    alert('✅ Timothy can now create and manage users!');
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error granting permissions:', error);
    alert('❌ Failed to grant permissions. Check console for details.');
    throw error;
  }
};

console.log('🚀 Granting Timothy User Management permissions...');
grantTimothyUserManagement().then(() => {
  console.log('Permissions granted successfully');
}).catch((error) => {
  console.error('Permission grant failed:', error);
});
