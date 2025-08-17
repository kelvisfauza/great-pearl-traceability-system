import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useActivityTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const trackActivity = useCallback(async (activityType: string, description?: string) => {
    if (!user?.uid) return;

    try {
      // Record the activity
      await supabase
        .from('user_activity')
        .insert([{
          user_id: user.uid,
          activity_type: activityType,
          activity_date: new Date().toISOString().split('T')[0]
        }]);

      // Check if user should get reward for this activity
      const { data, error } = await supabase.rpc('award_activity_reward', {
        user_uuid: user.uid,
        activity_name: activityType
      });

      if (error) {
        console.error('Error awarding activity reward:', error);
        return;
      }

      // Type guard for the response data
      const rewardData = data as { rewarded?: boolean; amount?: number; reason?: string } | null;

      if (rewardData?.rewarded) {
        toast({
          title: "Activity Reward! 🎉",
          description: `You've earned UGX ${rewardData.amount?.toLocaleString()} for ${description || activityType}!`,
          duration: 5000,
        });
      }
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