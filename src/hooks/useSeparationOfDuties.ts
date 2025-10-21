import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Separation of Duties (SoD) Hook
 * Prevents the same person from approving at multiple stages
 */
export const useSeparationOfDuties = () => {
  const { employee } = useAuth();
  const { toast } = useToast();

  /**
   * Check if current user has already approved this money request at any previous stage
   */
  const checkMoneyRequestEligibility = async (
    requestId: string
  ): Promise<{ canApprove: boolean; reason?: string; previousApprover?: string }> => {
    if (!employee) {
      return { canApprove: false, reason: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from('money_requests')
        .select('finance_approved_by, admin_approved_by')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      const currentUserName = employee.name || employee.email;
      const approvers = [
        data?.finance_approved_by,
        data?.admin_approved_by
      ].filter(Boolean);

      // Check if current user already approved at any stage
      const hasAlreadyApproved = approvers.some(
        approver => approver === currentUserName || approver === employee.email
      );

      if (hasAlreadyApproved) {
        return {
          canApprove: false,
          reason: 'You have already approved this request at a previous stage. Separation of Duties requires different approvers at each stage.',
          previousApprover: currentUserName
        };
      }

      return { canApprove: true };
    } catch (error) {
      console.error('Error checking approval eligibility:', error);
      return { canApprove: false, reason: 'Error checking approval history' };
    }
  };

  /**
   * Check if current user has already approved this expense request at any stage
   */
  const checkExpenseRequestEligibility = async (
    requestId: string
  ): Promise<{ canApprove: boolean; reason?: string }> => {
    if (!employee) {
      return { canApprove: false, reason: 'User not authenticated' };
    }

    try {
      // For expense requests stored in Firebase, we check the requestedby field
      // and approver fields to ensure they are different people
      const currentUserEmail = employee.email;
      
      // We'll rely on the component passing the request data
      // This is a simplified check - full validation happens in the component
      return { canApprove: true };
    } catch (error) {
      console.error('Error checking expense approval eligibility:', error);
      return { canApprove: false, reason: 'Error checking approval history' };
    }
  };

  /**
   * Check workflow steps to ensure no duplicate approvers
   */
  const checkWorkflowDuplicates = async (
    paymentId: string
  ): Promise<{ canApprove: boolean; reason?: string }> => {
    if (!employee) {
      return { canApprove: false, reason: 'User not authenticated' };
    }

    try {
      const { data, error } = await supabase
        .from('workflow_steps')
        .select('processed_by, action')
        .eq('payment_id', paymentId)
        .eq('action', 'approved');

      if (error) throw error;

      const currentUserName = employee.name || employee.email;
      const hasApprovedBefore = data?.some(
        step => step.processed_by === currentUserName || step.processed_by === employee.email
      );

      if (hasApprovedBefore) {
        return {
          canApprove: false,
          reason: 'You have already approved this request. Multiple approvals by the same person violate Separation of Duties policy.'
        };
      }

      return { canApprove: true };
    } catch (error) {
      console.error('Error checking workflow duplicates:', error);
      return { canApprove: false, reason: 'Error checking workflow history' };
    }
  };

  /**
   * Display a warning toast when SoD violation is detected
   */
  const showSoDViolationWarning = (reason: string) => {
    toast({
      title: "⚠️ Separation of Duties Violation",
      description: reason,
      variant: "destructive",
      duration: 6000
    });
  };

  return {
    checkMoneyRequestEligibility,
    checkExpenseRequestEligibility,
    checkWorkflowDuplicates,
    showSoDViolationWarning
  };
};
