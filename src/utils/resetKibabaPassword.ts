import { supabase } from '@/integrations/supabase/client';

export const resetKibabaPassword = async () => {
  try {
    console.log('🔄 Calling reset-kibaba-password edge function...');
    
    const { data, error } = await supabase.functions.invoke('reset-kibaba-password', {
      body: {}
    });

    if (error) {
      console.error('Error from edge function:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Password reset response:', data);
    return data;
    
  } catch (error) {
    console.error('Error calling password reset function:', error);
    return { success: false, error: 'Failed to reset password' };
  }
};