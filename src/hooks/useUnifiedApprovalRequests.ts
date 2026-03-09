// @ts-nocheck - withdrawal_requests table has columns not yet in generated types
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

      // 1. Fetch Supabase approval requests - ONLY pending for Admin approval (final step)
      // Requests with 'Pending Finance' status should NOT appear here - they go to Finance portal first
      try {
        const { data: supabaseRequests, error } = await supabase
          .from('approval_requests')
          .select('*')
          // Fetch requests pending any Admin approval stage (after Finance has approved)
          .in('status', [
            'Finance Approved',
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
              disbursement_method: req.disbursement_method,
              disbursement_phone: req.disbursement_phone,
              disbursement_bank_name: req.disbursement_bank_name,
              disbursement_account_number: req.disbursement_account_number,
              disbursement_account_name: req.disbursement_account_name,
              payment_method: req.payment_method,
              expense_type: req.type,
              requestedby_name: req.requestedby_name,
              requestedby_position: req.requestedby_position,
              rejection_reason: req.rejection_reason,
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

      // 2.5. Fetch pending withdrawal requests for admin approval (after Finance has approved)
      // Also fetch approved withdrawals with failed payout status for retry
      try {
        const { data: withdrawalRequests, error: withdrawalError } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .or('status.in.(pending_approval,pending_admin_2,pending_admin_3,Finance Approved),and(status.eq.approved,payout_status.eq.failed)')
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

              const isFailedPayout = req.status === 'approved' && req.payout_status === 'failed';
              const adminCount = req.requires_three_approvals ? 3 : 1;
              const approvedAdmins = [req.admin_approved_1_at, req.admin_approved_2_at, req.admin_approved_3_at].filter(Boolean).length;
              
              return {
                id: req.id,
                type: 'general' as const,
                source: 'supabase' as const,
                department: 'Wallet',
                requestType: isFailedPayout ? 'Failed Payout - Retry' : 'Withdrawal Request',
                title: isFailedPayout 
                  ? `⚠️ Failed Payout - UGX ${req.amount.toLocaleString()}`
                  : `Withdrawal - UGX ${req.amount.toLocaleString()}`,
                description: isFailedPayout
                  ? `Payout to ${empName} FAILED: ${req.payout_error || 'Unknown error'}. Tap Retry to re-attempt disbursement.`
                  : `${empName} requests withdrawal of UGX ${req.amount.toLocaleString()} via ${req.channel === 'CASH' ? 'Cash' : 'Mobile Money'}`,
                amount: req.amount,
                requestedBy: empEmail,
                dateRequested: new Date(req.created_at).toLocaleDateString(),
                priority: isFailedPayout ? 'High' : (req.amount > 100000 ? 'High' : 'Medium'),
                status: isFailedPayout ? 'Payout Failed' : (req.status === 'pending_admin_2' ? 'Pending Admin 2' : req.status === 'pending_admin_3' ? 'Pending Admin 3' : 'Pending'),
                details: {
                  withdrawal_id: req.id,
                  phone_number: req.disbursement_phone || req.phone_number,
                  disbursement_phone: req.disbursement_phone,
                  channel: req.channel || req.disbursement_method,
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
                  is_failed_payout: isFailedPayout,
                  payout_error: req.payout_error,
                  payout_attempted_at: req.payout_attempted_at,
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
      // Skip for withdrawal requests – they have their own SoD checks below
      if (status === 'Approved' && request.source === 'supabase' && !request.details?.is_withdrawal) {
        const sodCheck = await checkExpenseRequestEligibility(request.id);
        if (!sodCheck.canApprove) {
          return { blocked: true, reason: sodCheck.reason || 'Approval blocked by policy' };
        }
      }

      // For withdrawal requests, check self-approval (can't approve own withdrawal)
      if (status === 'Approved' && request.details?.is_withdrawal) {
        const currentUserName = employee?.name || employee?.email;
        const currentUserEmail = employee?.email;
        const requestedBy = request.requestedBy || request.details?.requested_by;
        if (requestedBy === currentUserName || requestedBy === currentUserEmail) {
          return { blocked: true, reason: 'You cannot approve your own withdrawal request. Policy requires a different person to review and approve your submissions.' };
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

        // GUARD: Block double-trigger — if payout is already processing/sent, abort
        if (status === 'Approved' && currentWithdrawal.payout_status && ['processing', 'sent'].includes(currentWithdrawal.payout_status)) {
          console.warn('⛔ Payout already in progress or sent for withdrawal:', withdrawalId);
          return { blocked: true, reason: 'This withdrawal has already been submitted for disbursement. It cannot be approved again.' };
        }

        // Handle RETRY for failed payouts — skip approval logic, go straight to payout
        if (status === 'Approved' && currentWithdrawal.status === 'approved' && currentWithdrawal.payout_status === 'failed') {
          console.log('🔄 Retrying failed payout for withdrawal:', withdrawalId);
          const isMoMo = currentWithdrawal.channel === 'MOBILE_MONEY' || (currentWithdrawal.channel !== 'CASH' && currentWithdrawal.channel !== 'BANK');
          
          if (!isMoMo) {
            return { blocked: true, reason: 'This is not a Mobile Money withdrawal. Manual disbursement is required.' };
          }

          // Set to processing
          await supabase.from('money_requests').update({
            payout_status: 'processing',
            payout_attempted_at: new Date().toISOString(),
            payout_error: null,
            updated_at: new Date().toISOString()
          }).eq('id', withdrawalId);

          const phoneToNotify = currentWithdrawal.disbursement_phone || currentWithdrawal.phone_number;
          let payoutPhone = (phoneToNotify || '').replace(/\D/g, '');
          if (payoutPhone.startsWith('0')) payoutPhone = '256' + payoutPhone.slice(1);
          if (!payoutPhone.startsWith('256')) payoutPhone = '256' + payoutPhone;

          try {
            const { data: payoutData, error: payoutErr } = await supabase.functions.invoke('gosentepay-payout', {
              body: {
                phone: payoutPhone,
                amount: currentWithdrawal.amount,
                ref: currentWithdrawal.request_ref || `WD-${currentWithdrawal.id.slice(0, 8)}`,
                employeeName: currentWithdrawal.requester_name || request.requestedBy || 'Employee'
              }
            });

            if (payoutErr) {
              await supabase.from('money_requests').update({
                payout_status: 'failed',
                payout_error: payoutErr.message || 'Retry failed',
                payout_attempted_at: new Date().toISOString()
              }).eq('id', withdrawalId);
              return { blocked: true, reason: `Payout retry failed: ${payoutErr.message || 'Unknown error'}. Check GosentePay account settings.` };
            }

            if (payoutData?.status === 'success') {
              await supabase.from('withdrawal_requests').update({
                payout_status: 'sent',
                payout_ref: payoutData.ref,
                payout_attempted_at: new Date().toISOString(),
                payout_error: null
              }).eq('id', withdrawalId);

              // Deduct from tracked GosentePay balance
              const adminName = employee?.name || employee?.email || 'Admin';
              const { data: currentBal } = await supabase
                .from('gosentepay_balance')
                .select('balance')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (currentBal) {
                const newBal = currentBal.balance - currentWithdrawal.amount;
                await supabase.from('gosentepay_balance').update({
                  balance: newBal,
                  last_updated_by: adminName,
                  last_transaction_ref: payoutData.ref,
                  last_transaction_type: 'payout_deduction',
                  updated_at: new Date().toISOString()
                }).order('updated_at', { ascending: false }).limit(1);

                await supabase.from('gosentepay_balance_log').insert({
                  previous_balance: currentBal.balance,
                  new_balance: newBal,
                  change_amount: -currentWithdrawal.amount,
                  change_type: 'payout_deduction',
                  reference: payoutData.ref,
                  notes: `Retry payout to ${phoneToNotify}`,
                  created_by: adminName
                });
              }

              await fetchAllRequests(true);
              return true;
            } else {
              const errMsg = payoutData?.message || 'Transfer rejected';
              await supabase.from('withdrawal_requests').update({
                payout_status: 'failed',
                payout_error: errMsg,
                payout_attempted_at: new Date().toISOString()
              }).eq('id', withdrawalId);
              return { blocked: true, reason: `Payout retry failed: ${errMsg}. Please check GosentePay dashboard.` };
            }
          } catch (err: any) {
            await supabase.from('withdrawal_requests').update({
              payout_status: 'failed',
              payout_error: err?.message || 'Exception during retry',
              payout_attempted_at: new Date().toISOString()
            }).eq('id', withdrawalId);
            return { blocked: true, reason: `Payout retry error: ${err?.message || 'Unknown'}` };
          }
        }

        // GUARD: Block if already fully approved (non-failed)
        if (status === 'Approved' && currentWithdrawal.status === 'approved') {
          console.warn('⛔ Withdrawal already approved:', withdrawalId);
          return { blocked: true, reason: 'This withdrawal has already been approved. Refresh to see the latest status.' };
        }

        const reqThreeApprovals = currentWithdrawal.requires_three_approvals;
        const wUpdateData: any = { updated_at: new Date().toISOString() };

        if (status === 'Approved') {
          // CRITICAL: Enforce Finance-First approval order
          if (!currentWithdrawal.finance_approved_at) {
            return { blocked: true, reason: 'This withdrawal has not yet been approved by Finance. Finance must review and approve first before Admin can approve.' };
          }
          if (reqThreeApprovals) {
            // 2 admin approvals needed for high-value withdrawals (Admin is final step)
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
              wUpdateData.approved_at = new Date().toISOString();
              wUpdateData.approved_by = adminName;
              wUpdateData.status = 'approved';
              wUpdateData.payout_status = 'pending';
              console.log('✅ Withdrawal: Admin 2 approved (final), ready for payout');
            }
          } else {
            // 1 admin approval needed (Admin is final step)
            wUpdateData.admin_approved_1_at = new Date().toISOString();
            wUpdateData.admin_approved_1_by = adminName;
            wUpdateData.approved_at = new Date().toISOString();
            wUpdateData.approved_by = adminName;
            wUpdateData.status = 'approved';
            wUpdateData.payout_status = 'pending';
            console.log('✅ Withdrawal: Admin approved (final), ready for payout');
          }
        } else {
          wUpdateData.status = 'rejected';
          wUpdateData.rejection_reason = rejectionReason || 'Rejected by Administrator';
          wUpdateData.rejected_by = adminName;
          wUpdateData.rejected_at = new Date().toISOString();
        }

        // Lock for payout immediately if this is the final approval
        const isFinalApproval = wUpdateData.status === 'approved';
        const isMoMo = currentWithdrawal.channel === 'MOBILE_MONEY' || (currentWithdrawal.channel !== 'CASH' && currentWithdrawal.channel !== 'BANK');
        
        if (isFinalApproval && isMoMo) {
          wUpdateData.payout_status = 'processing';
          wUpdateData.payout_attempted_at = new Date().toISOString();
        }

        const { error: wError } = await supabase
          .from('withdrawal_requests')
          .update(wUpdateData)
          .eq('id', withdrawalId);

        if (wError) {
          console.error('Withdrawal update error:', wError);
          return false;
        }

        // Trigger GosentePay payout immediately on final admin approval
        let payoutSuccess = false;
        let payoutRef = '';
        let payoutError = '';
        
        if (isFinalApproval && isMoMo) {
          const phoneToNotify = currentWithdrawal.disbursement_phone || currentWithdrawal.phone_number || (currentWithdrawal as any).employee_phone;
          if (phoneToNotify) {
            let payoutPhone = phoneToNotify.replace(/\D/g, '');
            if (payoutPhone.startsWith('0')) payoutPhone = '256' + payoutPhone.slice(1);
            if (!payoutPhone.startsWith('256')) payoutPhone = '256' + payoutPhone;

            // Single attempt only — no retries to avoid rate limiting and duplicate charges
            // If it fails, Finance can manually retry from the Withdrawals page
            try {
              console.log(`GosentePay payout: ${payoutPhone}, UGX ${currentWithdrawal.amount}`);
              const { data: payoutData, error: payoutErr } = await supabase.functions.invoke('gosentepay-payout', {
                body: {
                  phone: payoutPhone,
                  amount: currentWithdrawal.amount,
                  ref: currentWithdrawal.request_ref || `WD-${currentWithdrawal.id.slice(0, 8)}`,
                  employeeName: (currentWithdrawal as any).employee_name || request.requestedBy || 'Employee'
                }
              });

              if (payoutErr) {
                console.error('Payout error:', payoutErr);
                payoutError = payoutErr.message || 'Edge function error';
              } else if (payoutData?.status === 'success') {
                payoutSuccess = true;
                payoutRef = payoutData.ref || currentWithdrawal.request_ref;
              } else {
                payoutError = payoutData?.message || payoutData?.details?.data?.message || 'Transfer rejected by provider';
              }
            } catch (err: any) {
              console.error('Payout exception:', err);
              payoutError = err.message || 'Unknown error';
            }

            // Update payout status based on result
            if (payoutSuccess) {
              await supabase.from('withdrawal_requests').update({
                payout_status: 'sent',
                payout_ref: payoutRef,
                payout_attempted_at: new Date().toISOString(),
                payout_error: null
              }).eq('id', withdrawalId);

              // Deduct from tracked GosentePay balance
              const { data: currentBal } = await supabase
                .from('gosentepay_balance')
                .select('balance')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (currentBal) {
                const newBal = currentBal.balance - currentWithdrawal.amount;
                await supabase.from('gosentepay_balance').update({
                  balance: newBal,
                  last_updated_by: adminName,
                  last_transaction_ref: payoutRef,
                  last_transaction_type: 'payout_deduction',
                  updated_at: new Date().toISOString()
                }).order('updated_at', { ascending: false }).limit(1);

                await supabase.from('gosentepay_balance_log').insert({
                  previous_balance: currentBal.balance,
                  new_balance: newBal,
                  change_amount: -currentWithdrawal.amount,
                  change_type: 'payout_deduction',
                  reference: payoutRef,
                  notes: `Admin-approved payout to ${phoneToNotify}`,
                  created_by: adminName
                });
              }
            } else {
              await supabase.from('withdrawal_requests').update({
                payout_status: 'failed',
                payout_error: payoutError,
                payout_attempted_at: new Date().toISOString()
              }).eq('id', withdrawalId);
            }
          }
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
            let msg = '';
            if (status === 'Approved') {
              if (isFinalApproval && isMoMo && payoutSuccess) {
                msg = `Dear ${recipientEmp.name}, your withdrawal of UGX ${currentWithdrawal.amount.toLocaleString()} has been APPROVED and sent to your Mobile Money. Ref: ${payoutRef}. Great Pearl Coffee.`;
              } else if (isFinalApproval) {
                msg = `Dear ${recipientEmp.name}, your withdrawal of UGX ${currentWithdrawal.amount.toLocaleString()} has been FULLY APPROVED by ${adminName}. Your funds will be disbursed shortly. Ref: ${currentWithdrawal.request_ref}. Great Pearl Coffee.`;
              } else {
                msg = `Dear ${recipientEmp.name}, your withdrawal request for UGX ${currentWithdrawal.amount.toLocaleString()} has received admin approval from ${adminName}. Awaiting more admin approvals. Ref: ${currentWithdrawal.request_ref}. Great Pearl Coffee.`;
              }
            } else {
              msg = `Dear ${recipientEmp.name}, your withdrawal request for UGX ${currentWithdrawal.amount.toLocaleString()} has been REJECTED by ${adminName}. Reason: ${rejectionReason || 'Not specified'}. Ref: ${currentWithdrawal.request_ref}. Great Pearl Coffee.`;
            }

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
            // 3-tier flow: need 2 admin approvals (Admin is final step after Finance)
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
              // Second admin approval - FINAL step
              updateData.admin_approved_2 = true;
              updateData.admin_approved_2_at = new Date().toISOString();
              updateData.admin_approved_2_by = adminName;
              updateData.admin_approved = true;
              updateData.admin_approved_by = adminName;
              updateData.admin_approved_at = new Date().toISOString();
              // New columns
              updateData.admin_final_approval = true;
              updateData.admin_final_approval_at = new Date().toISOString();
              updateData.admin_final_approval_by = adminName;
              updateData.status = 'Approved';
              updateData.approval_stage = 'approved';
              console.log('✅ 3-tier: Admin 2 approved - FULLY APPROVED');
            }
          } else {
            // Standard 2-tier: single admin approval (FINAL step after Finance)
            updateData.admin_approved = true;
            updateData.admin_approved_by = adminName;
            updateData.admin_approved_at = new Date().toISOString();
            // New columns
            updateData.admin_final_approval = true;
            updateData.admin_final_approval_at = new Date().toISOString();
            updateData.admin_final_approval_by = adminName;
            updateData.status = 'Approved';
            updateData.approval_stage = 'approved';
            console.log('✅ 2-tier: Admin approved - FULLY APPROVED');
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
              message = `Dear ${recipientEmployee.name}, your ${request.requestType} request for UGX ${typeof request.amount === 'number' ? request.amount.toLocaleString() : request.amount} has been FULLY APPROVED by ${adminName}. Great Pearl Coffee.`;
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