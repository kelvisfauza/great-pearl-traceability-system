import { supabase } from '@/integrations/supabase/client';

export const updateKibabaPermissions = async () => {
  try {
    // Update Kibaba's permissions to include Milling
    const { data, error } = await supabase
      .from('employees')
      .update({
        permissions: ['Quality Control', 'Milling', 'Reports', 'Store Management', 'Inventory', 'General Access']
      })
      .eq('email', 'nicholusscottlangz@gmail.com')
      .select();

    if (error) {
      console.error('Error updating Kibaba permissions:', error);
      return { success: false, error };
    }

    console.log('✅ Kibaba permissions updated successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating Kibaba permissions:', error);
    return { success: false, error };
  }
};