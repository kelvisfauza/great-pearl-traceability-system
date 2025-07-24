
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      
      // Using mock data for now since workflow tables don't exist yet
      const mockWorkflowSteps: WorkflowStep[] = [];
      const mockModificationRequests: ModificationRequest[] = [];
      
      console.log('Mock workflow data loaded');
      
      setWorkflowSteps(mockWorkflowSteps);
      setModificationRequests(mockModificationRequests);
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
      
      // Mock implementation - would use Supabase table when ready
      const newStep: WorkflowStep = {
        id: `step_${Date.now()}`,
        ...stepData,
        timestamp: new Date().toISOString()
      };
      
      setWorkflowSteps(prev => [newStep, ...prev]);
      
      console.log('Workflow step tracked with ID:', newStep.id);
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
      
      const newRequest: ModificationRequest = {
        id: `mod_${Date.now()}`,
        ...requestData,
        createdAt: new Date().toISOString()
      };

      setModificationRequests(prev => [newRequest, ...prev]);
      
      console.log('Modification request created with ID:', newRequest.id);
      
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
      
      setModificationRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'completed' as const, completedAt: new Date().toISOString() }
            : req
        )
      );
      
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
