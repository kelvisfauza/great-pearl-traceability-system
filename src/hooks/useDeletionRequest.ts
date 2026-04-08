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

    // Check role-based delete permission
    const allowedRoles = ['Administrator', 'Super Admin', 'Manager'];
    if (!allowedRoles.includes(employee.role)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete records",
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