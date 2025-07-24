import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CallData {
  id: string;
  caller_id: string;
  caller_name: string;
  recipient_id: string;
  recipient_name: string;
  status: 'ringing' | 'answered' | 'declined' | 'missed' | 'ended';
  started_at: string;
  duration?: number;
}

interface UseCallNotificationsProps {
  currentUserId?: string;
  onIncomingCall: (callData: CallData) => void;
  onCallStatusChange: (callData: CallData) => void;
}

export const useCallNotifications = ({
  currentUserId,
  onIncomingCall,
  onCallStatusChange
}: UseCallNotificationsProps) => {
  const { toast } = useToast();

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('call-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `recipient_id=eq.${currentUserId}`
        },
        (payload) => {
          const callData = payload.new as CallData;
          console.log('Incoming call:', callData);
          
          if (callData.status === 'ringing') {
            onIncomingCall(callData);
            toast({
              title: "Incoming Call",
              description: `${callData.caller_name} is calling you`,
              duration: 10000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `recipient_id=eq.${currentUserId}`
        },
        (payload) => {
          const callData = payload.new as CallData;
          console.log('Call status updated:', callData);
          onCallStatusChange(callData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, onIncomingCall, onCallStatusChange, toast]);

  const createCall = useCallback(async (
    callerId: string,
    callerName: string,
    recipientId: string,
    recipientName: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('calls')
        .insert([{
          caller_id: callerId,
          caller_name: callerName,
          recipient_id: recipientId,
          recipient_name: recipientName,
          status: 'ringing'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating call:', error);
      throw error;
    }
  }, []);

  const updateCallStatus = useCallback(async (
    callId: string,
    status: 'answered' | 'declined' | 'missed' | 'ended',
    duration?: number
  ) => {
    try {
      const updateData: any = { status };
      
      if (status === 'ended' && duration !== undefined) {
        updateData.duration = duration;
        updateData.ended_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }, []);

  return {
    createCall,
    updateCallStatus
  };
};