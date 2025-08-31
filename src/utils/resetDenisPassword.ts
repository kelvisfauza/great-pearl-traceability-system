import { supabase } from '@/integrations/supabase/client';

export const resetDenisPassword = async () => {
  try {
    console.log('Calling reset-denis-password edge function...');
    
    const { data, error } = await supabase.functions.invoke('reset-denis-password');

    if (error) {
      console.error('Error calling reset-denis-password function:', error);
      throw error;
    }

    console.log('✅ Denis password reset result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error resetting Denis password:', error);
    throw error;
  }
};

// Auto-execute to reset Denis's password
resetDenisPassword().then((result) => {
  console.log('Denis password reset completed:', result);
}).catch(error => {
  console.error('Failed to reset Denis password:', error);
});