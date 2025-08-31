import { supabase } from '@/integrations/supabase/client';

export const fixDenisAuthManually = async () => {
  try {
    console.log('🔧 Manually fixing Denis auth account...');
    
    // Call the reset-denis-password edge function
    const { data, error } = await supabase.functions.invoke('reset-denis-password');

    if (error) {
      console.error('❌ Edge function error:', error);
      throw error;
    }

    console.log('✅ Denis auth fix result:', data);
    
    if (data?.success) {
      // Verify the employee record was updated
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('auth_user_id, email')
        .eq('email', 'bwambaledenis8@gmail.com')
        .single();

      if (employeeError) {
        console.error('❌ Error verifying employee:', employeeError);
      } else {
        console.log('✅ Employee verification:', employee);
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Manual fix failed:', error);
    throw error;
  }
};

// Execute immediately
console.log('🚀 Starting Denis auth fix...');
fixDenisAuthManually().then((result) => {
  console.log('🎉 Denis auth fix completed:', result);
  alert('Denis auth fix completed! Check console for details. Try logging in now.');
}).catch((error) => {
  console.error('💥 Denis auth fix failed:', error);
  alert('Denis auth fix failed. Check console for details.');
});