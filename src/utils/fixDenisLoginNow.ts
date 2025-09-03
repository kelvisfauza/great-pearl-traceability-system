import { supabase } from '@/integrations/supabase/client';

export const fixDenisLoginNow = async () => {
  try {
    console.log('🔧 Running final Denis login fix...');
    
    const { data, error } = await supabase.functions.invoke('fix-denis-final');

    if (error) {
      console.error('❌ Error calling fix-denis-final function:', error);
      throw error;
    }

    console.log('✅ Denis login fix completed:', data);
    
    if (data?.success) {
      alert(`✅ Denis login fixed!\n\nEmail: ${data.email}\nPassword: ${data.password}\n\nDenis can now log in with these credentials.`);
    } else {
      alert('❌ Failed to fix Denis login. Check console for details.');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error fixing Denis login:', error);
    alert('❌ Error fixing Denis login. Check console for details.');
    throw error;
  }
};

// Auto-execute the fix
fixDenisLoginNow();