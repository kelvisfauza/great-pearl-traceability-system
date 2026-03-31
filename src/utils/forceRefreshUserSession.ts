import { supabase } from '@/integrations/supabase/client';

export const forceRefreshUserSession = async (userEmail: string) => {
  try {
    console.log('🔄 Force refreshing session for user:', userEmail);
    
    // Use Supabase's built-in token refresh instead of deleting tokens
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      // If refresh fails, sign out so user can re-authenticate cleanly
      await supabase.auth.signOut();
      window.location.reload();
      return { success: false, error: error.message };
    }
    
    if (data.session) {
      console.log('✅ Session refreshed successfully');
      window.location.reload();
      return { success: true, message: 'Session refreshed successfully' };
    }
    
    // No session available, redirect to login
    await supabase.auth.signOut();
    window.location.reload();
    return { success: false, error: 'No active session' };
  } catch (error) {
    console.error('Error refreshing user session:', error);
    return { success: false, error: 'Failed to refresh session' };
  }
};