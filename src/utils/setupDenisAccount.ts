import { supabase } from '@/integrations/supabase/client';

export const setupDenisAccount = async () => {
  try {
    console.log('🔧 Setting up Denis account properly...');
    
    const { data, error } = await supabase.functions.invoke('reset-denis-final');

    if (error) {
      console.error('❌ Error setting up Denis account:', error);
      throw error;
    }

    console.log('✅ Denis account setup completed:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to setup Denis account:', error);
    throw error;
  }
};