import { supabase } from '@/integrations/supabase/client';

export const fixAnnouncementStatus = async () => {
  try {
    console.log('Fixing stuck announcement...');
    
    // Call the edge function again for the stuck announcement
    const { data, error } = await supabase.functions.invoke('send-company-announcement', {
      body: { announcementId: 'ee913f9d-ccc0-49f3-aabf-61be45e4e365' }
    });
    
    if (error) {
      console.error('Error fixing announcement:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Announcement fixed successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to fix announcement:', error);
    return { success: false, error: (error as Error).message };
  }
};