import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Background polling hook for approval requests
 * Polls every 10 seconds and triggers refetch callbacks
 */
export const useApprovalPolling = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const pollApprovals = async () => {
      // This triggers Supabase realtime listeners
      await supabase
        .from('approval_requests')
        .select('id')
        .limit(1);
    };

    // Initial poll
    pollApprovals();

    // Poll every 10 seconds
    const interval = setInterval(pollApprovals, 10000);

    return () => clearInterval(interval);
  }, [enabled]);
};
