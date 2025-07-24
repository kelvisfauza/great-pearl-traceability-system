
import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

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
      await addDoc(collection(db, 'workflow_steps'), {
        ...stepData,
        timestamp: new Date().toISOString()
      });
      
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
      await addDoc(collection(db, 'modification_requests'), {
        ...requestData,
        createdAt: new Date().toISOString()
      });
      
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
      await updateDoc(doc(db, 'modification_requests', requestId), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      
      await fetchWorkflowData();
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
    return modificationRequests.filter(
      request => request.targetDepartment === department && request.status === 'pending'
    );
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
