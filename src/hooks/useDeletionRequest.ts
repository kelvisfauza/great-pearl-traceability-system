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

    // Only administrators can delete
    if (employee.role !== 'Administrator') {
      toast({
        title: "Permission Denied",
        description: "Only administrators can delete records",
        variant: "destructive"
      });
      return false;
    }

    setIsSubmitting(true);

    try {
      // Delete directly from the table
      const { error } = await (supabase as any)
        .from(tableName)
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Record Deleted",
        description: `Successfully deleted ${recordSummary || 'record'}`,
      });

      return true;
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete record",
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