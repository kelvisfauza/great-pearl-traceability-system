
import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useWorkflowTracking } from './useWorkflowTracking';
import { useNotifications } from './useNotifications';

export interface ApprovalRequest {
  id: string;
  department: string;
  type: string;
  title: string;
  description: string;
  amount: string;
  requestedby: string;
  daterequested: string;
  priority: string;
  status: string;
  details?: {
    paymentId?: string;
    method?: string;
    supplier?: string;
    amount?: number;
    batchNumber?: string;
    qualityAssessmentId?: string;
    action?: string;
    reportId?: string;
    employee_details?: any[];
    month?: string;
    employee_count?: number;
    total_amount?: number;
    bonuses?: number;
    deductions?: number;
    payment_method?: string;
    notes?: string;
    reportDate?: string;
    coffeeType?: string;
    inputBy?: string;
    deleteReason?: string;
    originalModificationId?: string;
    modificationReason?: string;
    financeNotes?: string;
    updatedData?: any;
    originalData?: any;
    editReason?: string;
  };
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  rejection_comments?: string;
}

export const useApprovalRequests = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { trackWorkflowStep } = useWorkflowTracking();
  const { createAnnouncement } = useNotifications();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching approval requests from Supabase...');
      
      const { data: supabaseRequests, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        setRequests([]);
        return;
      }
      
      console.log('Raw Supabase approval requests:', supabaseRequests);
      console.log('Number of requests fetched:', supabaseRequests?.length || 0);
      
      // Transform Supabase data to match our interface
      const transformedRequests = supabaseRequests?.map(req => {
        console.log('Transforming request:', req.id, req.title);
        return {
          ...req,
          details: req.details ? JSON.parse(JSON.stringify(req.details)) : undefined
        };
      }) as ApprovalRequest[];
      
      console.log('Final transformed requests:', transformedRequests);
      setRequests(transformedRequests || []);
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (
    id: string, 
    status: 'Approved' | 'Rejected',
    rejectionReason?: string,
    rejectionComments?: string
  ) => {
    try {
      console.log('Updating approval request status:', id, status);
      
      const request = requests.find(req => req.id === id);
      if (!request) {
        console.error('Request not found:', id);
        return false;
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'Rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
        updateData.rejection_comments = rejectionComments || '';
      }

      console.log('Updating Supabase approval request...');
      const { error } = await supabase
        .from('approval_requests')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Supabase update error:', error);
        return false;
      }
      
      console.log('Supabase approval request updated');

      // Track workflow step
      await trackWorkflowStep({
        paymentId: request.details?.paymentId || id,
        qualityAssessmentId: request.details?.qualityAssessmentId,
        fromDepartment: 'Admin',
        toDepartment: status === 'Approved' ? 'Operations' : 'Finance',
        action: status === 'Approved' ? 'approved' : 'rejected',
        reason: rejectionReason,
        comments: rejectionComments,
        processedBy: 'Operations Manager',
        status: 'completed'
      });

        // Handle different types of approved requests
        if (status === 'Approved') {
           // Handle Modification Request Approval
           if (request.type === 'Modification Request Approval' && request.details?.originalModificationId) {
             console.log('Processing approved modification request:', request.details.originalModificationId);
             try {
               // Update payment records if paymentId exists
               if (request.details.paymentId) {
                 let newStatus = 'Approved';
                 if (request.details.modificationReason === 'payment_rejected') {
                   newStatus = 'Rejected';
                 } else if (request.details.modificationReason === 'price_adjustment') {
                   newStatus = 'Price Adjusted';
                 } else if (request.details.modificationReason === 'quality_issues') {
                   newStatus = 'Quality Review Required';
                 }
                 
                 await updateDoc(doc(db, 'payment_records', request.details.paymentId), {
                   status: newStatus,
                   updated_at: new Date().toISOString(),
                   modification_approved: true,
                   modification_reason: request.details.modificationReason
                 });
                 console.log('Payment record updated after modification approval');
               }
               
               // Update store records if this is a store modification
               if (request.details.batchNumber && request.details.modificationReason) {
                 console.log('Updating store records for batch:', request.details.batchNumber);
                 try {
                   // Update store_records in Supabase based on modification reason
                   if (request.details.modificationReason === 'price_adjustment') {
                     // For price adjustments, update the price_per_kg if available
                     const { error: storeError } = await supabase
                       .from('store_records')
                       .update({
                         notes: `Price adjustment approved via modification request. Original reason: ${request.details.modificationReason}`,
                         updated_at: new Date().toISOString()
                       })
                       .eq('batch_number', request.details.batchNumber);
                     
                     if (storeError) {
                       console.error('Error updating store records:', storeError);
                     } else {
                       console.log('Store records updated in Supabase');
                     }
                   } else if (request.details.modificationReason === 'quantity_adjustment') {
                     // Mark records as modified for quantity adjustments
                     const { error: storeError } = await supabase
                       .from('store_records')
                       .update({
                         notes: `Quantity adjustment approved via modification request. Manual review required.`,
                         updated_at: new Date().toISOString()
                       })
                       .eq('batch_number', request.details.batchNumber);
                     
                     if (storeError) {
                       console.error('Error updating store records:', storeError);
                     } else {
                       console.log('Store records marked for quantity adjustment');
                     }
                   }
                 } catch (supabaseError) {
                   console.error('Error updating store records in Supabase:', supabaseError);
                 }
               }
             } catch (error) {
               console.error('Error processing modification request approval:', error);
             }
           }
          
           // Handle Store Report Edit
           else if (request.type === 'Store Report Edit' && request.details?.action === 'edit_store_report' && request.details?.reportId) {
             console.log('Updating store report:', request.details.reportId);
             try {
               const updatedData = typeof request.details.updatedData === 'string' 
                 ? JSON.parse(request.details.updatedData) 
                 : request.details.updatedData;

               await updateDoc(doc(db, 'store_reports', request.details.reportId), {
                 ...updatedData,
                 updated_at: new Date().toISOString()
               });
               console.log('Store report updated successfully');

               // Track the edit action
               await addDoc(collection(db, 'daily_tasks'), {
                 task_type: 'Store Report Edit Approved',
                 description: `Store report for ${updatedData.coffee_type} on ${updatedData.date} has been updated`,
                 completed_by: 'Operations Manager',
                 completed_at: new Date().toISOString(),
                 date: new Date().toISOString().split('T')[0],
                 department: 'Store',
                 created_at: new Date().toISOString()
               });
             } catch (error) {
               console.error('Error updating store report:', error);
             }
           }
           
           // Handle Store Report Deletion
           else if (request.type === 'Store Report Deletion' && request.details?.action === 'delete_store_report' && request.details?.reportId) {
          console.log('Deleting store report:', request.details.reportId);
          try {
            await deleteDoc(doc(db, 'store_reports', request.details.reportId));
            console.log('Store report deleted successfully');
          } catch (error) {
            console.error('Error deleting store report:', error);
          }
        }
        
        // Handle Salary Payment
        else if (request.type === 'Salary Payment' && request.details?.employee_details) {
          console.log('Creating salary payment record...');
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
        
        // Handle Bank Transfer and Payment Approval
        else if ((request.type === 'Bank Transfer' || request.type === 'Payment Approval') && request.details?.paymentId) {
          console.log('Updating payment record status for approved bank transfer...');
          
          try {
            // Try to update Firebase first
            try {
              await updateDoc(doc(db, 'payment_records', request.details.paymentId), {
                status: 'Paid',
                method: 'Bank Transfer',
                updated_at: new Date().toISOString()
              });
              console.log('Payment record updated to Paid in Firebase');
            } catch (firebaseError) {
              console.log('Payment record not found in Firebase, updating Supabase only');
            }

            // Always update the Supabase payment record
            const { error: supabaseError } = await supabase
              .from('payment_records')
              .update({
                status: 'Paid',
                method: 'Bank Transfer',
                updated_at: new Date().toISOString()
              })
              .eq('id', request.details.paymentId);
            
            if (supabaseError) {
              console.error('Error updating Supabase payment record:', supabaseError);
              throw supabaseError;
            } else {
              console.log('Payment record updated to Paid in Supabase');
            }
          } catch (error) {
            console.error('Error updating payment record:', error);
          }

          // Record daily task
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
        }
      }

      // If rejected, create modification request to route back to Finance for further action
      if (status === 'Rejected' && request.details?.paymentId) {
        console.log('Creating modification request for rejected approval...');
        
        try {
          // Create modification request to route to Finance department
          const modRef = await addDoc(collection(db, 'modification_requests'), {
            originalPaymentId: request.details.paymentId,
            qualityAssessmentId: request.details.qualityAssessmentId,
            batchNumber: request.details.batchNumber,
            requestedBy: 'Operations Manager',
            requestedByDepartment: 'Admin',
            targetDepartment: 'Finance',
            reason: rejectionReason || 'payment_rejected',
            comments: rejectionComments || 'Payment approval was rejected by admin. Finance should review and determine next steps.',
            status: 'pending',
            createdAt: new Date().toISOString()
          });

          // Notify target department
          await createAnnouncement(
            'Modification Request Pending',
            `Payment ${request.details.paymentId} for batch ${request.details.batchNumber} requires modification: ${rejectionReason}`,
            'Admin',
            ['Finance'],
            'High'
          );
          
          // Update payment record status to indicate it needs review
          await updateDoc(doc(db, 'payment_records', request.details.paymentId), {
            status: 'needs_review',
            updated_at: new Date().toISOString(),
            rejection_reason: rejectionReason,
            rejection_comments: rejectionComments
          });
          console.log('Modification request created and payment record updated');
        } catch (error) {
          console.error('Error creating modification request:', error);
        }
      }

      // Remove from local state since it's no longer pending
      setRequests(prev => prev.filter(req => req.id !== id));
      
      return true;
    } catch (error) {
      console.error('Error updating approval request:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return {
    requests,
    loading,
    updateRequestStatus,
    refetch: fetchRequests,
    fetchRequests
  };
};
