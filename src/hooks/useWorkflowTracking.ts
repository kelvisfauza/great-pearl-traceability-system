// Firebase-based workflow tracking hook
import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

export interface WorkflowStep {
  id: string;
  paymentId: string;
  qualityAssessmentId?: string;
  fromDepartment: string;
  toDepartment: string;
  action: 'submitted' | 'approved' | 'rejected' | 'modification_requested' | 'modified';
  reason?: string;
  comments?: string;
  timestamp: string;
  processedBy: string;
  status: 'pending' | 'completed';
}

export interface ModificationRequest {
  id: string;
  originalPaymentId: string;
  qualityAssessmentId?: string;
  batchNumber?: string;
  requestedBy: string;
  requestedByDepartment: string;
  targetDepartment: string;
  reason: string;
  comments?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export const useWorkflowTracking = () => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [modificationRequests, setModificationRequests] = useState<ModificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { createAnnouncement } = useNotifications();

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      // Fetch workflow steps
      const workflowQuery = query(
        collection(db, 'workflow_steps'),
        orderBy('timestamp', 'desc')
      );
      const workflowSnapshot = await getDocs(workflowQuery);
      const steps = workflowSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkflowStep[];
      
      // Fetch modification requests
      const modificationQuery = query(
        collection(db, 'modification_requests'),
        orderBy('createdAt', 'desc')
      );
      const modificationSnapshot = await getDocs(modificationQuery);
      const requests = modificationSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ModificationRequest[];
      
      
      setWorkflowSteps(steps);
      setModificationRequests(requests);
    } catch (error) {
      console.error('Error fetching workflow data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch workflow data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const trackWorkflowStep = async (stepData: Omit<WorkflowStep, 'id' | 'timestamp'>) => {
    try {
      console.log('Tracking workflow step:', stepData);
      
      const docRef = await addDoc(collection(db, 'workflow_steps'), {
        ...stepData,
        timestamp: new Date().toISOString()
      });
      
      console.log('Workflow step tracked with ID:', docRef.id);
      
      // Also try to save to Supabase workflow_steps table
      try {
        const { data, error } = await supabase
          .from('workflow_steps')
          .insert({
            payment_id: stepData.paymentId,
            quality_assessment_id: stepData.qualityAssessmentId,
            from_department: stepData.fromDepartment,
            to_department: stepData.toDepartment,
            action: stepData.action,
            reason: stepData.reason,
            comments: stepData.comments,
            processed_by: stepData.processedBy,
            status: stepData.status,
            timestamp: new Date().toISOString()
          });
        
        if (error) {
          console.warn('Failed to save workflow step to Supabase:', error);
        } else {
          console.log('Workflow step also saved to Supabase');
        }
      } catch (supabaseError) {
        console.warn('Supabase workflow tracking error:', supabaseError);
      }
      
      await fetchWorkflowData();
    } catch (error) {
      console.error('Error tracking workflow step:', error);
      toast({
        title: "Error",
        description: "Failed to track workflow step",
        variant: "destructive"
      });
    }
  };

  const createModificationRequest = async (requestData: Omit<ModificationRequest, 'id' | 'createdAt'>) => {
    try {
      console.log('Creating modification request:', requestData);
      
      // Try to get batch number from store records if not provided
      let batchNumber = requestData.batchNumber;
      if (!batchNumber) {
        const storeQuery = query(
          collection(db, 'store_records'),
          where('id', '==', requestData.originalPaymentId)
        );
        const storeSnapshot = await getDocs(storeQuery);
        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data();
          batchNumber = storeData.batch_number;
        }
      }

      const modificationRequestData = {
        ...requestData,
        batchNumber,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'modification_requests'), modificationRequestData);
      console.log('Modification request created with ID:', docRef.id);

      // Notify target department
      await createAnnouncement(
        'Modification Request Pending',
        `Batch ${modificationRequestData.batchNumber || ''} requires action: ${modificationRequestData.reason}`,
        modificationRequestData.requestedByDepartment,
        [modificationRequestData.targetDepartment],
        'High'
      );
      
      await fetchWorkflowData();
      
      toast({
        title: "Success",
        description: "Modification request created successfully"
      });
    } catch (error) {
      console.error('Error creating modification request:', error);
      toast({
        title: "Error",
        description: "Failed to create modification request",
        variant: "destructive"
      });
    }
  };

  const completeModificationRequest = async (requestId: string) => {
    try {
      console.log('Completing modification request:', requestId);
      
      await updateDoc(doc(db, 'modification_requests', requestId), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      
      await fetchWorkflowData();
      
      toast({
        title: "Success",
        description: "Modification request completed"
      });
    } catch (error) {
      console.error('Error completing modification request:', error);
      toast({
        title: "Error",
        description: "Failed to complete modification request",
        variant: "destructive"
      });
    }
  };

  const getPaymentWorkflow = (paymentId: string) => {
    return workflowSteps.filter(step => step.paymentId === paymentId);
  };

  const getPendingModificationRequests = (department: string) => {
    const pending = modificationRequests.filter(
      request => request.targetDepartment === department && request.status === 'pending'
    );
    console.log(`Pending modification requests for ${department}:`, pending);
    return pending;
  };

  useEffect(() => {
    fetchWorkflowData();
  }, []);

  return {
    workflowSteps,
    modificationRequests,
    loading,
    trackWorkflowStep,
    createModificationRequest,
    completeModificationRequest,
    getPaymentWorkflow,
    getPendingModificationRequests,
    refetch: fetchWorkflowData
  };
};