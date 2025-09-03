import { useCallback, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useActivityTracker = () => {
  const authContext = useContext(AuthContext);
  const { toast } = useToast();
  
  const user = authContext?.user;

  const trackActivity = useCallback(async (activityType: string, description?: string) => {
    if (!user?.id) {
      console.log('No user found for activity tracking');
      return;
    }

    console.log('Tracking activity:', activityType, 'for user:', user.id);

    try {
      // Record the activity
      const { error: activityError } = await supabase
        .from('user_activity')
        .insert([{
          user_id: user.id,
          activity_type: activityType,
          activity_date: new Date().toISOString().split('T')[0]
        }]);

      if (activityError) {
        console.error('Error recording activity:', activityError);
        return;
      }

      console.log('Activity recorded successfully, checking for reward...');

      // Temporarily disable reward system until function is implemented
      // const { data, error } = await supabase.rpc('award_activity_reward' as any, {
      //   user_uuid: user.id,
      //   activity_name: activityType
      // });

      // if (error) {
      //   console.error('Error awarding activity reward:', error);
      //   return;
      // }

      console.log('Activity tracked successfully for user:', user.email);
    } catch (error: any) {
      console.error('Error tracking activity:', error);
    }
  }, [user, toast]);

  // Specific activity trackers for common actions
  const trackDataEntry = useCallback(() => {
    trackActivity('data_entry', 'entering data');
  }, [trackActivity]);

  const trackFormSubmission = useCallback((formName: string) => {
    trackActivity('form_submission', `submitting ${formName}`);
  }, [trackActivity]);

  const trackReportGeneration = useCallback(() => {
    trackActivity('report_generation', 'generating a report');
  }, [trackActivity]);

  const trackTaskCompletion = useCallback((taskName: string) => {
    trackActivity('task_completion', `completing ${taskName}`);
  }, [trackActivity]);

  const trackDocumentUpload = useCallback(() => {
    trackActivity('document_upload', 'uploading a document');
  }, [trackActivity]);

  const trackTransaction = useCallback(() => {
    trackActivity('transaction', 'processing a transaction');
  }, [trackActivity]);

  return {
    trackActivity,
    trackDataEntry,
    trackFormSubmission,
    trackReportGeneration,
    trackTaskCompletion,
    trackDocumentUpload,
    trackTransaction
  };
};