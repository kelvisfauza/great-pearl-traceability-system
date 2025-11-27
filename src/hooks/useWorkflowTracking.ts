// Supabase-based workflow tracking hook
import { useState, useEffect } from 'react';
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
      // Fetch workflow steps from Supabase
      const { data: stepsData, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (stepsError) {
        console.error('Error fetching workflow steps:', stepsError);
      }
      
      // Map Supabase data to match interface
      const steps: WorkflowStep[] = (stepsData || []).map(step => ({
        id: step.id,
        paymentId: step.payment_id,
        qualityAssessmentId: step.quality_assessment_id,
        fromDepartment: step.from_department,
        toDepartment: step.to_department,
        action: step.action as WorkflowStep['action'],
        reason: step.reason,
        comments: step.comments,
        timestamp: step.timestamp,
        processedBy: step.processed_by,
        status: step.status as WorkflowStep['status']
      }));
      
      // Fetch modification requests from Supabase (if table exists)
      // For now, set empty array as modification_requests table may not exist
      const requests: ModificationRequest[] = [];
      
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
      
      const now = new Date().toISOString();
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
          timestamp: now,
          created_at: now,
          updated_at: now
        })
        .select();
      
      if (error) {
        console.warn('Failed to save workflow step to Supabase:', error);
      } else {
        console.log('Workflow step saved to Supabase');
      }
      
      await fetchWorkflowData();
    } catch (error) {
      // Log error silently - workflow tracking is non-critical and shouldn't show error toast
      // The main approval operation has already succeeded at this point
      console.warn('⚠️ Workflow step tracking failed (non-critical):', error);
    }
  };

  const createModificationRequest = async (requestData: Omit<ModificationRequest, 'id' | 'createdAt'>) => {
    try {
      console.log('Creating modification request:', requestData);
      
      // Modification requests disabled - Firebase has been migrated to Supabase
      console.log('Modification requests feature disabled (Firebase migration)');
      
      toast({
        title: "Feature Unavailable",
        description: "Modification requests are currently unavailable",
        variant: "destructive"
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
      
      // Modification requests disabled - Firebase has been migrated to Supabase
      console.log('Modification requests feature disabled (Firebase migration)');
      
      toast({
        title: "Feature Unavailable",
        description: "Modification requests are currently unavailable"
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