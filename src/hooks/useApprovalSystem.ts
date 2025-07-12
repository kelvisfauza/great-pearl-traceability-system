
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useApprovalSystem = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();

  const createApprovalRequest = async (
    type: string,
    title: string,
    description: string,
    amount: number,
    details: any
  ) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('approval_requests')
        .insert({
          type,
          title,
          description,
          amount: amount.toString(),
          department: 'Finance',
          requestedby: employee?.name || 'Unknown',
          daterequested: new Date().toLocaleDateString(),
          priority: 'High',
          status: 'Pending',
          details
        });

      if (error) throw error;

      toast({
        title: "Approval Request Created",
        description: "Bank transfer has been submitted for manager approval"
      });

      return true;
    } catch (error) {
      console.error('Error creating approval request:', error);
      toast({
        title: "Error",
        description: "Failed to create approval request",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createApprovalRequest,
    loading
  };
};
