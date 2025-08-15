import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useDeletionRequest = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { employee } = useAuth();
  const { toast } = useToast();

  const submitDeletionRequest = async (
    tableName: string,
    recordId: string,
    recordData: any,
    reason: string,
    recordSummary?: string
  ) => {
    if (!employee) {
      toast({
        title: "Authentication Error",
        description: "Employee information not found",
        variant: "destructive"
      });
      return false;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('deletion_requests')
        .insert({
          table_name: tableName,
          record_id: recordId,
          record_data: recordData,
          reason: reason.trim(),
          requested_by: employee.name,
          requested_by_department: employee.department
        });

      if (error) throw error;

      toast({
        title: "Deletion Request Submitted",
        description: `Request to delete ${recordSummary || 'record'} has been sent to administrators for review`,
      });

      return true;
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast({
        title: "Error",
        description: "Failed to submit deletion request",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkAdminPermission = () => {
    return employee?.role === 'Administrator';
  };

  return {
    submitDeletionRequest,
    checkAdminPermission,
    isSubmitting
  };
};