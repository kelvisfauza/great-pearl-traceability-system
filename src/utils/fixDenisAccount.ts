import { supabase } from '@/integrations/supabase/client';

export const fixDenisAccount = async () => {
  try {
    console.log('Calling edge function to fix Denis account...');
    
    const { data, error } = await supabase.functions.invoke('create-denis-account');

    if (error) {
      console.error('Error calling create-denis-account function:', error);
      throw error;
    }

    console.log('✅ Denis account fixed:', data);
    return data;
  } catch (error) {
    console.error('❌ Error fixing Denis account:', error);
    throw error;
  }
};

// Auto-execute to fix Denis's account
fixDenisAccount().then((result) => {
  console.log('Denis account fix result:', result);
}).catch(error => {
  console.error('Failed to fix Denis account:', error);
});