import { supabase } from '@/integrations/supabase/client';

const APP_URL = 'https://greatpearlfinance.com';

interface ApprovalEmailParams {
  requestId: string;
  requestTitle: string;
  requestType: string;
  requestedBy: string;
  requestedByName: string;
  department: string;
  amount: number;
  priority: string;
  description: string;
  dateRequested: string;
}

/**
 * Generate approval tokens and send emails with approve/reject buttons
 * to the appropriate approvers based on the current approval stage.
 */
export const sendApprovalActionEmails = async (params: ApprovalEmailParams, stage: 'finance' | 'admin') => {
  try {
    // Determine who to send to based on stage
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('name, email, phone, role, department')
      .eq('status', 'Active');

    if (empError || !employees) {
      console.error('Failed to fetch approvers:', empError);
      return;
    }

    let approvers: typeof employees;
    if (stage === 'finance') {
      approvers = employees.filter(e => e.department === 'Finance');
    } else {
      approvers = employees.filter(e => 
        e.role === 'Administrator' || e.role === 'Super Admin'
      );
    }

    // Filter out self-approval
    approvers = approvers.filter(a => a.email !== params.requestedBy);

    if (approvers.length === 0) {
      console.warn('No approvers found for stage:', stage);
      return;
    }

    console.log(`📧 Sending approval action emails to ${approvers.length} ${stage} approvers`);

    for (const approver of approvers) {
      if (!approver.email) continue;

      try {
        // Create approve token
        const { data: approveToken, error: approveErr } = await (supabase as any)
          .from('approval_action_tokens')
          .insert({
            request_id: params.requestId,
            approver_email: approver.email,
            approver_name: approver.name,
            action_type: 'approve',
            approval_stage: stage,
          })
          .select('token')
          .single();

        // Create reject token
        const { data: rejectToken, error: rejectErr } = await (supabase as any)
          .from('approval_action_tokens')
          .insert({
            request_id: params.requestId,
            approver_email: approver.email,
            approver_name: approver.name,
            action_type: 'reject',
            approval_stage: stage,
          })
          .select('token')
          .single();

        if (approveErr || rejectErr || !approveToken || !rejectToken) {
          console.error('Failed to create tokens for', approver.email, approveErr, rejectErr);
          continue;
        }

        const approveUrl = `${APP_URL}/approve-action?token=${approveToken.token}&action=approve`;
        const rejectUrl = `${APP_URL}/approve-action?token=${rejectToken.token}&action=reject`;

        // Send email with action buttons
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'approval-action',
            recipientEmail: approver.email,
            idempotencyKey: `approval-action-${params.requestId}-${approver.email}-${stage}`,
            templateData: {
              approverName: approver.name,
              requestTitle: params.requestTitle,
              requestType: params.requestType,
              requestedBy: params.requestedByName || params.requestedBy,
              department: params.department,
              amount: String(params.amount),
              priority: params.priority,
              description: params.description,
              dateRequested: params.dateRequested,
              approvalStage: stage === 'finance' ? 'Finance Review' : 'Admin Approval',
              approveUrl,
              rejectUrl,
            },
          },
        });

        console.log(`✅ Approval action email sent to ${approver.name} (${approver.email})`);
      } catch (err) {
        console.error(`Failed to send approval email to ${approver.email}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in sendApprovalActionEmails:', err);
  }
};
