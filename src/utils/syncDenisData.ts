import { supabase } from '@/integrations/supabase/client';
import { updateEmployeePermissions } from './updateEmployeePermissions';

export const syncDenisDataBetweenDatabases = async () => {
  try {
    console.log('Syncing Denis data between Supabase and Firebase...');
    
    // Get Denis's current data from Supabase (source of truth)
    const { data: supabaseEmployee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'bwambaledenis8@gmail.com')
      .single();

    if (error || !supabaseEmployee) {
      console.error('Could not find Denis in Supabase:', error);
      return;
    }

    console.log('Denis data from Supabase:', supabaseEmployee);

    // Update Firebase with the Supabase data to ensure consistency
    await updateEmployeePermissions('bwambaledenis8@gmail.com', {
      role: supabaseEmployee.role,
      permissions: supabaseEmployee.permissions,
      position: supabaseEmployee.position,
      department: supabaseEmployee.department
    });

    console.log('✅ Denis data synchronized successfully between databases');
    return { 
      success: true, 
      message: 'Denis data is now consistent between Supabase and Firebase',
      permissions: supabaseEmployee.permissions
    };
  } catch (error) {
    console.error('❌ Error syncing Denis data:', error);
    throw error;
  }
};

// Auto-execute to sync Denis data immediately
syncDenisDataBetweenDatabases().then((result) => {
  if (result) {
    console.log('Denis permissions synchronized:', result.permissions);
  }
}).catch(error => {
  console.error('Failed to sync Denis data:', error);
});