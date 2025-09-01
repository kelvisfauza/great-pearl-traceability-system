import { supabase } from '@/integrations/supabase/client';

export const forceRefreshUserSession = async (userEmail: string) => {
  try {
    // Force a refresh by invalidating cached data
    console.log('🔄 Force refreshing session for user:', userEmail);
    
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token');
    
    // Get fresh session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      return { success: false, error: error.message };
    }
    
    // Refresh the page to reload all contexts
    window.location.reload();
    
    return { success: true, message: 'Session refreshed successfully' };
  } catch (error) {
    console.error('Error refreshing user session:', error);
    return { success: false, error: 'Failed to refresh session' };
  }
};