import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SalaryAdvanceApprovalData {
  employee_email: string;
  employee_name: string;
  department: string;
  position: string;
  amount: number;
  minimum_payment: number;
  reason: string;
  requested_by: string;
  requested_by_name: string;
}

export const useSalaryAdvanceApprovals = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Creates a salary advance approval request that goes through:
   * 1. Admin approval (Denis)
   * 2. Finance approval (Fauza) - Final
   * 
   * The advance is NOT activated until both approvals are complete.
   */
  const createAdvanceApprovalRequest = useCallback(async (data: SalaryAdvanceApprovalData) => {
    setLoading(true);
    try {
      // Create approval request in Supabase with 'Salary Advance' type
      const { data: approvalRequest, error } = await supabase
        .from('approval_requests')
        .insert({
          type: 'Salary Advance',
          title: `Salary Advance Request - ${data.employee_name}`,
          description: `${data.reason || 'Salary advance request'}\n\nMinimum Monthly Payment: UGX ${data.minimum_payment.toLocaleString()}`,
          amount: data.amount,
          requestedby: data.requested_by,
          requestedby_name: data.requested_by_name,
          requestedby_position: 'HR Administrator',
          department: data.department,
          daterequested: new Date().toISOString().split('T')[0],
          priority: 'High',
          status: 'Pending',
          approval_stage: 'pending_admin',
          details: JSON.stringify({
            advance_type: 'salary_advance',
            employee_email: data.employee_email,
            employee_name: data.employee_name,
            employee_department: data.department,
            employee_position: data.position,
            advance_amount: data.amount,
            minimum_payment: data.minimum_payment,
            reason: data.reason
          })
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Salary advance approval request created:', approvalRequest.id);

      toast({
        title: "Approval Request Submitted",
        description: `Salary advance of UGX ${data.amount.toLocaleString()} for ${data.employee_name} has been submitted for Admin approval.`
      });

      return approvalRequest;
    } catch (error) {
      console.error('Error creating salary advance approval request:', error);
      toast({
        title: "Error",
        description: "Failed to submit salary advance for approval",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Activates a salary advance after full approval
   * This is called after Finance (final) approval
   */
  const activateSalaryAdvance = useCallback(async (approvalRequestId: string) => {
    try {
      // Get the approval request details
      const { data: request, error: fetchError } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('id', approvalRequestId)
        .single();

      if (fetchError || !request) {
        console.error('Failed to fetch approval request:', fetchError);
        return false;
      }

      // Parse the details
      const details = typeof request.details === 'string' 
        ? JSON.parse(request.details) 
        : request.details;

      if (details?.advance_type !== 'salary_advance') {
        console.log('Not a salary advance request, skipping activation');
        return false;
      }

      // Create the actual salary advance record
      const { data: advance, error: advanceError } = await supabase
        .from('employee_salary_advances')
        .insert({
          employee_email: details.employee_email,
          employee_name: details.employee_name,
          original_amount: details.advance_amount,
          remaining_balance: details.advance_amount,
          minimum_payment: details.minimum_payment,
          reason: details.reason,
          created_by: request.requestedby,
          status: 'active'
        })
        .select()
        .single();

      if (advanceError) {
        console.error('Failed to create salary advance:', advanceError);
        return false;
      }

      console.log('✅ Salary advance activated:', advance.id);

      // Send SMS notification to the employee
      await sendAdvanceApprovalSMS(details.employee_email, details.employee_name, details.advance_amount);

      return true;
    } catch (error) {
      console.error('Error activating salary advance:', error);
      return false;
    }
  }, []);

  /**
   * Sends SMS notification when salary advance is fully approved
   */
  const sendAdvanceApprovalSMS = async (employeeEmail: string, employeeName: string, amount: number) => {
    try {
      // Get employee phone number
      const { data: employee } = await supabase
        .from('employees')
        .select('phone, name')
        .eq('email', employeeEmail)
        .single();

      if (employee?.phone) {
        const message = `Dear ${employee.name}, your salary advance of UGX ${amount.toLocaleString()} has been APPROVED and DISBURSED. The minimum payment will be deducted from your future salary requests. Great Pearl Coffee.`;

        await supabase.functions.invoke('send-sms', {
          body: {
            phone: employee.phone,
            message: message,
            userName: employee.name,
            messageType: 'approval',
            triggeredBy: 'Salary Advance System',
            department: 'HR',
            recipientEmail: employeeEmail
          }
        });

        console.log('✅ SMS notification sent to:', employee.name);
      }
    } catch (error) {
      console.error('Error sending SMS notification (non-blocking):', error);
    }
  };

  return {
    loading,
    createAdvanceApprovalRequest,
    activateSalaryAdvance
  };
};
