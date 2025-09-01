import { supabase } from '@/integrations/supabase/client';

export const fixDenisAccountFinal = async () => {
  try {
    console.log('🔧 Calling final Denis account fix...');
    
    const { data, error } = await supabase.functions.invoke('fix-denis-final');

    if (error) {
      console.error('❌ Error calling fix-denis-final function:', error);
      throw error;
    }

    console.log('✅ Denis account fix completed:', data);
    
    if (data?.success) {
      alert(`✅ Denis account fixed!\n\nEmail: ${data.email}\nPassword: ${data.password}\n\nDenis can now log in normally.`);
    } else {
      alert('❌ Failed to fix Denis account. Check console for details.');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error fixing Denis account:', error);
    alert('❌ Error fixing Denis account. Check console for details.');
    throw error;
  }
};