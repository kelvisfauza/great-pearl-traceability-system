import { supabase } from '@/integrations/supabase/client';

export const cleanupAllUsers = async () => {
  try {
    console.log('🧹 Starting user cleanup...');
    
    const { data, error } = await supabase.functions.invoke('cleanup-users');

    if (error) {
      console.error('❌ Error calling cleanup function:', error);
      throw error;
    }

    console.log('✅ User cleanup completed:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to cleanup users:', error);
    throw error;
  }
};