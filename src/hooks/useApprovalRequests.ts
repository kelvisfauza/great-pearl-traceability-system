
import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useWorkflowTracking } from './useWorkflowTracking';
import { useNotifications } from './useNotifications';
import { toast } from '@/hooks/use-toast';

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
  phone?: string;
  finance_approved_at?: string | null;
  admin_approved_at?: string | null;
  finance_approved_by?: string | null;
  admin_approved_by?: string | null;
  approval_stage?: string;
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
    expenseType?: string;
    expenseCategory?: string;
    reason?: string;
    phoneNumber?: string;
    requestDate?: string;
    department?: string;
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

// Function to send expense approval notification
const sendExpenseApprovalNotification = async (request: ApprovalRequest) => {
  try {
    // Get user name from employees table
    const { data: employee } = await supabase
      .from('employees')
      .select('name, phone')
      .eq('email', request.requestedby)
      .single();

    const userName = employee?.name || request.requestedby.split('@')[0];
    const userPhone = employee?.phone;
    
    const message = `Dear ${userName}, your expense ${request.title} of UGX ${parseFloat(request.amount).toLocaleString()} has been approved and dispersed successfully. Great Pearl Coffee.`;
    
    // Log the message (could be enhanced to use SMS service)
    console.log('Sending approval notification:', {
      recipient: request.requestedby,
      userName,
      phone: userPhone,
      message
    });

    // Send SMS notification if phone number is available
    if (userPhone) {
      await supabase.functions.invoke('send-sms', {
        body: {
          phone: userPhone,
          message: message,
          userName: userName,
          messageType: 'approval',
          triggeredBy: 'Expense Approval System',
          requestId: request.id,
          department: request.department,
          recipientEmail: request.requestedby
        }
      });
      console.log('SMS notification sent successfully');
    }

    // Show success toast
    toast({
      title: "Approval Notification Sent",
      description: `Notification sent to ${userName} about expense approval`,
    });

  } catch (error) {
    console.error('Error sending expense approval notification:', error);
    toast({
      title: "Notification Error",
      description: "Failed to send approval notification to user",
      variant: "destructive"
    });
  }
};

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching approval requests from Supabase...');
      
      const { data: supabaseRequests, error } = await supabase
        .from('approval_requests')
        .select('*')
        .in('status', ['Pending', 'Finance Approved', 'Admin Approved'])
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
    rejectionComments?: string,
    approvalType?: 'finance' | 'admin',
    approverName?: string
  ) => {
    try {
      console.log('Updating approval request status:', id, status);
      
      const request = requests.find(req => req.id === id);
      if (!request) {
        console.error('Request not found:', id);
        return false;
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (status === 'Rejected') {
        updateData.status = 'Rejected';
        if (rejectionReason) {
          updateData.rejection_reason = rejectionReason;
          updateData.rejection_comments = rejectionComments || '';
        }
      } else if (status === 'Approved' && approvalType) {
        // Handle two-stage approval
        if (approvalType === 'finance') {
          updateData.finance_approved_at = new Date().toISOString();
          updateData.finance_approved_by = approverName || 'Finance Team';
          
          // Check if admin has already approved
          if (request.admin_approved_at) {
            updateData.status = 'Approved';
            updateData.approval_stage = 'fully_approved';
          } else {
            updateData.status = 'Finance Approved';
            updateData.approval_stage = 'finance_approved';
          }
        } else if (approvalType === 'admin') {
          updateData.admin_approved_at = new Date().toISOString();
          updateData.admin_approved_by = approverName || 'Admin Team';
          
          // Check if finance has already approved
          if (request.finance_approved_at) {
            updateData.status = 'Approved';
            updateData.approval_stage = 'fully_approved';
          } else {
            updateData.status = 'Admin Approved';
            updateData.approval_stage = 'admin_approved';
          }
        }
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

        // Handle different types of approved requests - only if fully approved
        if (updateData.status === 'Approved' && updateData.approval_stage === 'fully_approved') {
          
          // Send approval notification for Expense Requests
          if (request.type === 'Expense Request') {
            await sendExpenseApprovalNotification(request);
          }
          
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

      // Remove from local state only if fully approved or rejected
      if (updateData.status === 'Approved' || updateData.status === 'Rejected') {
        setRequests(prev => prev.filter(req => req.id !== id));
      } else {
        // Update the local state with the new approval status
        setRequests(prev => prev.map(req => 
          req.id === id ? { ...req, ...updateData } : req
        ));
      }
      
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
