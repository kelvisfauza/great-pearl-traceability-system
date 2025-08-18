import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useWorkflowTracking } from './useWorkflowTracking';
import { useNotifications } from './useNotifications';
import { useGlobalErrorHandler } from './useGlobalErrorHandler';

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
  const { trackWorkflowStep } = useWorkflowTracking();
  const { createAnnouncement } = useNotifications();
  const { reportDatabaseError, reportWorkflowError } = useGlobalErrorHandler();

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching all approval requests...');
      
      const allRequests: UnifiedApprovalRequest[] = [];

      // 1. Fetch Supabase approval requests
      try {
        const { data: supabaseRequests, error } = await supabase
          .from('approval_requests')
          .select('*')
          .eq('status', 'Pending')
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
            details: req.details ? JSON.parse(JSON.stringify(req.details)) : undefined,
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

      // 2. Fetch Supabase deletion requests
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
      setLoading(false);
    }
  };

  const updateRequestStatus = async (
    request: UnifiedApprovalRequest,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string,
    rejectionComments?: string
  ) => {
    try {
      console.log('Updating unified request status:', request.id, status);

      if (request.source === 'supabase') {
        // Handle Supabase approval requests
        const updateData: any = {
          status,
          updated_at: new Date().toISOString()
        };

        if (status === 'Rejected' && rejectionReason) {
          updateData.rejection_reason = rejectionReason;
          updateData.rejection_comments = rejectionComments || '';
        }

        const { error } = await supabase
          .from('approval_requests')
          .update(updateData)
          .eq('id', request.id);

        if (error) {
          console.error('Supabase update error:', error);
          return false;
        }

        // Handle specific Supabase request types
        if (status === 'Approved') {
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
      setRequests(prev => prev.filter(req => req.id !== request.id));
      
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