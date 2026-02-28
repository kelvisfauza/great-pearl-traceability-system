import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflowTracking } from './useWorkflowTracking';
import { useNotifications } from './useNotifications';
import { useGlobalErrorHandler } from './useGlobalErrorHandler';
import { useSeparationOfDuties } from './useSeparationOfDuties';

export interface UnifiedApprovalRequest {
  id: string;
  type: 'general' | 'modification' | 'deletion';
  source: 'supabase' | 'firebase';
  department: string;
  requestType: string;
  title: string;
  description: string;
  amount: string | number;
  requestedBy: string;
  dateRequested: string;
  priority: string;
  status: string;
  details?: any;
  createdAt: string;
  updatedAt: string;
  batchNumber?: string;
  targetDepartment?: string;
  reason?: string;
  comments?: string;
  originalPaymentId?: string;
  qualityAssessmentId?: string;
}

export const useUnifiedApprovalRequests = () => {
  const [requests, setRequests] = useState<UnifiedApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();
  const { trackWorkflowStep } = useWorkflowTracking();
  const { createAnnouncement } = useNotifications();
  const { reportDatabaseError, reportWorkflowError } = useGlobalErrorHandler();
  const { checkExpenseRequestEligibility } = useSeparationOfDuties();

  const fetchAllRequests = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      console.log('Fetching all approval requests...');
      
      const allRequests: UnifiedApprovalRequest[] = [];

      // 1. Fetch Supabase approval requests - ONLY pending for Admin approval
      // Requests with 'Pending Finance' status should NOT appear here - they go to Finance portal
      try {
        const { data: supabaseRequests, error } = await supabase
          .from('approval_requests')
          .select('*')
          // Fetch requests pending any Admin approval stage
          .in('status', [
            'Pending',
            'Pending Admin',
            'Pending Admin Approval',
            'Pending Admin 2',
          ])
          .order('created_at', { ascending: false });
        
        if (!error && supabaseRequests) {
          const transformedSupabase = supabaseRequests.map(req => ({
            id: req.id,
            type: 'general' as const,
            source: 'supabase' as const,
            department: req.department,
            requestType: req.type,
            title: req.title,
            description: req.description,
            amount: req.amount,
            requestedBy: req.requestedby,
            dateRequested: req.daterequested,
            priority: req.priority,
            status: req.status,
            details: {
              ...(req.details ? JSON.parse(JSON.stringify(req.details)) : {}),
              admin_approved_1_by: req.admin_approved_1_by,
              admin_approved_2_by: req.admin_approved_2_by,
              requires_three_approvals: req.requires_three_approvals,
            },
            createdAt: req.created_at,
            updatedAt: req.updated_at
          }));
          allRequests.push(...transformedSupabase);
          console.log('Fetched Supabase requests:', transformedSupabase.length);
        }
      } catch (error) {
        console.error('Error fetching Supabase requests:', error);
        reportDatabaseError(error, 'fetch approval_requests', 'approval_requests');
      }

      // 2.5. Fetch pending withdrawal requests for admin approval
      try {
        const { data: withdrawalRequests, error: withdrawalError } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .in('status', ['pending_approval', 'pending_admin_2', 'pending_admin_3'])
          .order('created_at', { ascending: false });

        if (!withdrawalError && withdrawalRequests) {
          // Enrich with employee names
          const enrichedWithdrawals = await Promise.all(
            (withdrawalRequests || []).map(async (req) => {
              let empName = req.requester_name || req.user_id;
              let empEmail = req.requester_email || req.user_id;
              
              if (!req.requester_name) {
                const { data: empData } = await supabase
                  .from('employees')
                  .select('name, email')
                  .or(`auth_user_id.eq.${req.user_id},email.eq.${req.user_id}`)
                  .maybeSingle();
                if (empData) {
                  empName = empData.name;
                  empEmail = empData.email;
                }
              }

              const adminCount = req.requires_three_approvals ? 3 : 1;
              const approvedAdmins = [req.admin_approved_1_at, req.admin_approved_2_at, req.admin_approved_3_at].filter(Boolean).length;
              
              return {
                id: req.id,
                type: 'general' as const,
                source: 'supabase' as const,
                department: 'Wallet',
                requestType: 'Withdrawal Request',
                title: `Withdrawal - UGX ${req.amount.toLocaleString()}`,
                description: `${empName} requests withdrawal of UGX ${req.amount.toLocaleString()} via ${req.channel === 'CASH' ? 'Cash' : 'Mobile Money'}`,
                amount: req.amount,
                requestedBy: empEmail,
                dateRequested: new Date(req.created_at).toLocaleDateString(),
                priority: req.amount > 100000 ? 'High' : 'Medium',
                status: req.status === 'pending_admin_2' ? 'Pending Admin 2' : req.status === 'pending_admin_3' ? 'Pending Admin 3' : 'Pending',
                details: {
                  withdrawal_id: req.id,
                  phone_number: req.phone_number,
                  channel: req.channel,
                  request_ref: req.request_ref,
                  requester_name: empName,
                  requester_email: empEmail,
                  requires_three_approvals: req.requires_three_approvals,
                  admin_approved_1_by: req.admin_approved_1_by,
                  admin_approved_2_by: req.admin_approved_2_by,
                  admin_approved_3_by: req.admin_approved_3_by,
                  admin_approved_1_at: req.admin_approved_1_at,
                  admin_approved_2_at: req.admin_approved_2_at,
                  admin_approved_3_at: req.admin_approved_3_at,
                  approved_admins: approvedAdmins,
                  required_admins: adminCount,
                  is_withdrawal: true,
                },
                createdAt: req.created_at,
                updatedAt: req.updated_at,
              };
            })
          );
          allRequests.push(...enrichedWithdrawals);
          console.log('Fetched withdrawal requests for admin approval:', enrichedWithdrawals.length);
        }
      } catch (error) {
        console.error('Error fetching withdrawal requests:', error);
      }

      // 3. Fetch Supabase deletion requests (original numbering continues)
      try {
        const { data: deletionRequests, error: deletionError } = await supabase
          .from('deletion_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (!deletionError && deletionRequests) {
          const transformedDeletion = deletionRequests.map(req => ({
            id: req.id,
            type: 'deletion' as const,
            source: 'supabase' as const,
            department: req.requested_by_department,
            requestType: 'Deletion Request',
            title: `Delete ${req.table_name} Record`,
            description: req.reason,
            amount: '0',
            requestedBy: req.requested_by,
            dateRequested: new Date(req.created_at).toLocaleDateString(),
            priority: 'High',
            status: 'Pending',
            details: {
              table_name: req.table_name,
              record_id: req.record_id,
              record_data: req.record_data
            },
            createdAt: req.created_at,
            updatedAt: req.updated_at
          }));
          allRequests.push(...transformedDeletion);
          console.log('Fetched Supabase deletion requests:', transformedDeletion.length);
        }
      } catch (error) {
        console.error('Error fetching deletion requests:', error);
        reportDatabaseError(error, 'fetch deletion_requests', 'deletion_requests');
      }

      // 3. Fetch Supabase edit requests
      try {
        const { data: editRequests, error: editError } = await supabase
          .from('edit_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (!editError && editRequests) {
          const transformedEdit = editRequests.map(req => ({
            id: req.id,
            type: 'modification' as const,
            source: 'supabase' as const,
            department: req.requested_by_department,
            requestType: 'Edit Request',
            title: `Edit ${req.table_name} Record`,
            description: req.reason,
            amount: '0',
            requestedBy: req.requested_by,
            dateRequested: new Date(req.created_at).toLocaleDateString(),
            priority: 'Medium',
            status: 'Pending',
            details: {
              table_name: req.table_name,
              record_id: req.record_id,
              original_data: req.original_data,
              proposed_changes: req.proposed_changes
            },
            createdAt: req.created_at,
            updatedAt: req.updated_at
          }));
          allRequests.push(...transformedEdit);
          console.log('Fetched Supabase edit requests:', transformedEdit.length);
        }
      } catch (error) {
        console.error('Error fetching edit requests:', error);
        reportDatabaseError(error, 'fetch edit_requests', 'edit_requests');
      }

      // 4. Fetch Firebase modification requests
      try {
        const modQuery = query(collection(db, 'modification_requests'), orderBy('createdAt', 'desc'));
        const modSnapshot = await getDocs(modQuery);
        const modRequests = modSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];

        const pendingModRequests = modRequests.filter(req => req.status === 'pending');
        const transformedMod = pendingModRequests.map(req => ({
          id: req.id,
          type: 'modification' as const,
          source: 'firebase' as const,
          department: req.targetDepartment || 'Finance',
          requestType: 'Modification Request',
          title: `Modification Request - Batch ${req.batchNumber || 'N/A'}`,
          description: `${req.reason || 'No reason provided'}: ${req.comments || 'No comments'}`,
          amount: '0',
          requestedBy: req.requestedBy || 'Unknown',
          dateRequested: req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Unknown',
          priority: 'Medium',
          status: 'Pending',
          details: req,
          createdAt: req.createdAt || new Date().toISOString(),
          updatedAt: req.updatedAt || req.createdAt || new Date().toISOString(),
          batchNumber: req.batchNumber,
          targetDepartment: req.targetDepartment,
          reason: req.reason,
          comments: req.comments,
          originalPaymentId: req.originalPaymentId,
          qualityAssessmentId: req.qualityAssessmentId
        }));
        allRequests.push(...transformedMod);
        console.log('Fetched Firebase modification requests:', transformedMod.length);
      } catch (error) {
        console.error('Error fetching modification requests:', error);
        reportDatabaseError(error, 'fetch modification_requests', 'modification_requests');
      }

      // Sort all requests by creation date (newest first)
      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log('Total unified requests:', allRequests.length);
      setRequests(allRequests);
    } catch (error) {
      console.error('Error fetching unified approval requests:', error);
      setRequests([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [reportDatabaseError]);

  const updateRequestStatus = async (
    request: UnifiedApprovalRequest,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string,
    rejectionComments?: string
  ): Promise<boolean | { blocked: true; reason: string }> => {
    try {
      console.log('Updating unified request status:', request.id, status);

      // POLICY: Check self-approval and SoD for approvals on supabase requests
      if (status === 'Approved' && request.source === 'supabase') {
        const sodCheck = await checkExpenseRequestEligibility(request.id);
        if (!sodCheck.canApprove) {
          return { blocked: true, reason: sodCheck.reason || 'Approval blocked by policy' };
        }
      }

      // Handle withdrawal request approvals separately
      if (request.details?.is_withdrawal) {
        const withdrawalId = request.details.withdrawal_id || request.id;
        const adminName = employee?.name || employee?.email || 'Admin';
        
        // Fetch current withdrawal state
        const { data: currentWithdrawal, error: wFetchError } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('id', withdrawalId)
          .single();

        if (wFetchError || !currentWithdrawal) {
          console.error('Failed to fetch withdrawal request:', wFetchError);
          return false;
        }

        const reqThreeApprovals = currentWithdrawal.requires_three_approvals;
        const wUpdateData: any = { updated_at: new Date().toISOString() };

        if (status === 'Approved') {
          if (reqThreeApprovals) {
            // 3 admin approvals needed
            if (!currentWithdrawal.admin_approved_1_at) {
              wUpdateData.admin_approved_1_at = new Date().toISOString();
              wUpdateData.admin_approved_1_by = adminName;
              wUpdateData.status = 'pending_admin_2';
              console.log('✅ Withdrawal: Admin 1 approved');
            } else if (!currentWithdrawal.admin_approved_2_at) {
              if (currentWithdrawal.admin_approved_1_by === adminName) {
                return { blocked: true, reason: 'You already approved this withdrawal as Admin 1. A different administrator must provide the second approval.' };
              }
              wUpdateData.admin_approved_2_at = new Date().toISOString();
              wUpdateData.admin_approved_2_by = adminName;
              wUpdateData.status = 'pending_admin_3';
              console.log('✅ Withdrawal: Admin 2 approved');
            } else if (!currentWithdrawal.admin_approved_3_at) {
              if (currentWithdrawal.admin_approved_1_by === adminName || currentWithdrawal.admin_approved_2_by === adminName) {
                return { blocked: true, reason: 'You already approved this withdrawal. A different administrator must provide the third approval.' };
              }
              wUpdateData.admin_approved_3_at = new Date().toISOString();
              wUpdateData.admin_approved_3_by = adminName;
              wUpdateData.status = 'pending_finance';
              console.log('✅ Withdrawal: Admin 3 approved, moving to Finance');
            }
          } else {
            // 1 admin approval needed
            wUpdateData.admin_approved_1_at = new Date().toISOString();
            wUpdateData.admin_approved_1_by = adminName;
            wUpdateData.status = 'pending_finance';
            console.log('✅ Withdrawal: Admin approved, moving to Finance');
          }
        } else {
          wUpdateData.status = 'rejected';
          wUpdateData.rejection_reason = rejectionReason || 'Rejected by Administrator';
          wUpdateData.rejected_by = adminName;
          wUpdateData.rejected_at = new Date().toISOString();
        }

        const { error: wError } = await supabase
          .from('withdrawal_requests')
          .update(wUpdateData)
          .eq('id', withdrawalId);

        if (wError) {
          console.error('Withdrawal update error:', wError);
          return false;
        }

        // Send SMS to requester
        try {
          const recipientEmail = request.details?.requester_email || request.requestedBy;
          const { data: recipientEmp } = await supabase
            .from('employees')
            .select('phone, name')
            .eq('email', recipientEmail)
            .single();

          if (recipientEmp?.phone) {
            const msg = status === 'Approved'
              ? `Dear ${recipientEmp.name}, your withdrawal request for UGX ${currentWithdrawal.amount.toLocaleString()} has received admin approval from ${adminName}. ${wUpdateData.status === 'pending_finance' ? 'It is now pending final Finance approval.' : 'Awaiting more admin approvals.'} Ref: ${currentWithdrawal.request_ref}. Great Pearl Coffee.`
              : `Dear ${recipientEmp.name}, your withdrawal request for UGX ${currentWithdrawal.amount.toLocaleString()} has been REJECTED by ${adminName}. Reason: ${rejectionReason || 'Not specified'}. Ref: ${currentWithdrawal.request_ref}. Great Pearl Coffee.`;

            await supabase.functions.invoke('send-sms', {
              body: { phone: recipientEmp.phone, message: msg, userName: recipientEmp.name, messageType: 'withdrawal_approval' }
            });
          }
        } catch (smsErr) {
          console.error('SMS notification error (non-blocking):', smsErr);
        }

        await fetchAllRequests(true);
        return true;
      }

      if (request.source === 'supabase') {
        // First fetch the current request to check approval state and amount
        const { data: currentReq, error: fetchError } = await supabase
          .from('approval_requests')
          .select('*')
          .eq('id', request.id)
          .single();

        if (fetchError || !currentReq) {
          console.error('Failed to fetch current request:', fetchError);
          return false;
        }

        const requiresThreeApprovals = currentReq.amount > 50000;
        const adminName = employee?.name || employee?.email || 'Admin';
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        if (status === 'Approved') {
          if (requiresThreeApprovals) {
            // 3-tier flow: need 2 admin approvals before finance
            if (!currentReq.admin_approved_1) {
              // First admin approval
              updateData.admin_approved_1 = true;
              updateData.admin_approved_1_at = new Date().toISOString();
              updateData.admin_approved_1_by = adminName;
              updateData.requires_three_approvals = true;
              updateData.status = 'Pending Admin 2';
              updateData.approval_stage = 'pending_admin_2';
              console.log('✅ 3-tier: Admin 1 approved, waiting for Admin 2');
            } else if (!currentReq.admin_approved_2) {
              // Prevent same admin from approving twice
              if (currentReq.admin_approved_1_by === adminName) {
                return { blocked: true, reason: 'You already approved this request as Admin 1. A different administrator must provide the second approval.' };
              }
              // Second admin approval
              updateData.admin_approved_2 = true;
              updateData.admin_approved_2_at = new Date().toISOString();
              updateData.admin_approved_2_by = adminName;
              updateData.admin_approved = true;
              updateData.admin_approved_by = adminName;
              updateData.admin_approved_at = new Date().toISOString();
              updateData.status = 'Pending Finance';
              updateData.approval_stage = 'pending_finance';
              console.log('✅ 3-tier: Admin 2 approved, moving to Finance');
            }
          } else {
            // Standard 2-tier: single admin approval then finance
            updateData.admin_approved = true;
            updateData.admin_approved_by = adminName;
            updateData.admin_approved_at = new Date().toISOString();
            updateData.status = 'Pending Finance';
            updateData.approval_stage = 'pending_finance';
            console.log('✅ 2-tier: Admin approved, moving to Finance');
          }
        } else {
          // Rejected by admin
          updateData.status = 'Rejected';
          updateData.rejection_reason = rejectionReason || 'Rejected by Administrator';
          if (rejectionComments) {
            updateData.rejection_comments = rejectionComments;
          }
        }

        const { error } = await supabase
          .from('approval_requests')
          .update(updateData)
          .eq('id', request.id);

        if (error) {
          console.error('Supabase update error:', error);
          return false;
        }

        // Send SMS notification to the requester about admin approval/rejection
        try {
          const details = request.details || {};
          const recipientEmail = details.employee_email || request.requestedBy;
          
          const { data: recipientEmployee } = await supabase
            .from('employees')
            .select('phone, name')
            .eq('email', recipientEmail)
            .single();

          if (recipientEmployee?.phone) {
            const adminName = employee?.name || 'Admin';
            let message = '';
            
            if (status === 'Approved') {
              message = `Dear ${recipientEmployee.name}, your ${request.requestType} request for UGX ${typeof request.amount === 'number' ? request.amount.toLocaleString() : request.amount} has been approved by ${adminName}. Awaiting final Finance approval. Great Pearl Coffee.`;
            } else {
              message = `Dear ${recipientEmployee.name}, your ${request.requestType} request for UGX ${typeof request.amount === 'number' ? request.amount.toLocaleString() : request.amount} has been REJECTED by ${adminName}. Reason: ${rejectionReason || 'Not specified'}. Great Pearl Coffee.`;
            }

            await supabase.functions.invoke('send-sms', {
              body: {
                phone: recipientEmployee.phone,
                message: message,
                userName: recipientEmployee.name,
                messageType: status === 'Approved' ? 'admin_approval' : 'rejection',
                triggeredBy: 'Admin Approval System',
                requestId: request.id,
                department: request.department,
                recipientEmail: recipientEmail
              }
            });
            console.log('✅ SMS notification sent to:', recipientEmployee.name);
          }
        } catch (smsError) {
          console.error('SMS notification error (non-blocking):', smsError);
        }

        // Only handle deletions/edits for non-financial requests
        // Financial requests and salary advances will be handled after Finance approval
        if (status === 'Approved' && !['Money Request', 'Salary Payment', 'Requisition', 'Expense', 'Salary Advance', 'Salary Request'].includes(request.requestType)) {
          // Handle deletion requests
          if (request.type === 'deletion' && request.details?.table_name && request.details?.record_id) {
            try {
              const { error: deleteError } = await supabase
                .from(request.details.table_name)
                .delete()
                .eq('id', request.details.record_id);
              
              if (!deleteError) {
                console.log(`${request.details.table_name} record deleted successfully`);
              }
            } catch (error) {
              console.error(`Error deleting ${request.details.table_name} record:`, error);
            }
          }
          
          // Handle edit requests
          else if (request.requestType === 'Edit Request' && request.details?.table_name && request.details?.record_id) {
            try {
              const { error: updateError } = await supabase
                .from(request.details.table_name)
                .update(request.details.proposed_changes)
                .eq('id', request.details.record_id);
              
              if (!updateError) {
                console.log(`${request.details.table_name} record updated successfully`);
              }
            } catch (error) {
              console.error(`Error updating ${request.details.table_name} record:`, error);
            }
          }

          else if (request.requestType === 'Store Report Deletion' && request.details?.action === 'delete_store_report' && request.details?.reportId) {
            try {
              await deleteDoc(doc(db, 'store_reports', request.details.reportId));
              console.log('Store report deleted successfully');
            } catch (error) {
              console.error('Error deleting store report:', error);
            }
          }
          
          else if (request.requestType === 'Store Report Edit' && request.details?.action === 'edit_store_report' && request.details?.reportId) {
            try {
              const { updatedData } = request.details;
              await updateDoc(doc(db, 'store_reports', request.details.reportId), {
                ...updatedData,
                updated_at: new Date().toISOString()
              });
              console.log('Store report updated successfully');
            } catch (error) {
              console.error('Error updating store report:', error);
            }
          }
          
          else if (request.requestType === 'Salary Payment' && request.details?.employee_details) {
            try {
              await addDoc(collection(db, 'salary_payments'), {
                month: request.details.month,
                employee_count: request.details.employee_count,
                total_pay: request.details.total_amount,
                bonuses: request.details.bonuses || 0,
                deductions: request.details.deductions || 0,
                payment_method: request.details.payment_method,
                employee_details: request.details.employee_details,
                status: 'Approved',
                processed_by: 'Admin',
                processed_date: new Date().toISOString(),
                notes: request.details.notes || '',
                created_at: new Date().toISOString()
              });
              console.log('Salary payment record created');
            } catch (error) {
              console.error('Error creating salary payment record:', error);
            }
          }
          
          else if (request.requestType === 'Bank Transfer' && request.details?.paymentId) {
            try {
              await updateDoc(doc(db, 'payment_records', request.details.paymentId), {
                status: 'Paid',
                method: 'Bank Transfer',
                updated_at: new Date().toISOString()
              });
              
              await addDoc(collection(db, 'daily_tasks'), {
                task_type: 'Payment Approved',
                description: `Bank transfer approved: ${request.details?.supplier} - UGX ${request.details?.amount?.toLocaleString()}`,
                amount: request.details?.amount,
                batch_number: request.details?.batchNumber,
                completed_by: 'Operations Manager',
                completed_at: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                department: 'Finance',
                created_at: new Date().toISOString()
              });
            } catch (error) {
              console.error('Error updating payment record:', error);
            }
          }
        }

      } else if (request.source === 'firebase') {
        // Handle Firebase modification requests
        const updateData: any = {
          status: status === 'Approved' ? 'completed' : 'rejected',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (status === 'Rejected' && rejectionReason) {
          updateData.rejectionReason = rejectionReason;
          updateData.rejectionComments = rejectionComments || '';
        }

        await updateDoc(doc(db, 'modification_requests', request.id), updateData);

        if (status === 'Approved') {
          // Create announcement for completion
          await createAnnouncement(
            'Modification Request Completed',
            `Modification request for batch ${request.batchNumber} has been completed`,
            'Admin',
            [request.targetDepartment || 'Finance'],
            'Medium'
          );
        }
      }

      // Track workflow step with error handling - only for non-store-report requests
      if (!request.requestType.includes('Store Report')) {
        try {
          await trackWorkflowStep({
            paymentId: request.originalPaymentId || request.details?.paymentId || request.id,
            qualityAssessmentId: request.qualityAssessmentId || request.details?.qualityAssessmentId,
            fromDepartment: 'Admin',
            toDepartment: status === 'Approved' ? 'Operations' : request.department,
            action: status === 'Approved' ? 'approved' : 'rejected',
            reason: rejectionReason,
            comments: rejectionComments,
            processedBy: 'Operations Manager',
            status: 'completed'
          });
          console.log('Workflow step tracked successfully');
        } catch (error) {
          console.error('Warning: Failed to track workflow step:', error);
          reportWorkflowError(error, 'track approval workflow step');
          // Don't fail the approval process if workflow tracking fails
        }
      } else {
        console.log('Skipping workflow tracking for store report request');
      }

      // Remove from local state
      // Refetch to ensure UI is in sync with database
      await fetchAllRequests(true);
      
      return true;
    } catch (error) {
      console.error('Error updating unified request:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchAllRequests();
  }, []);

  return {
    requests,
    loading,
    updateRequestStatus,
    refetch: fetchAllRequests,
    fetchRequests: fetchAllRequests
  };
};