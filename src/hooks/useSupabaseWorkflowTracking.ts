import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

export interface WorkflowStep {
  id: string;
  payment_id: string;
  quality_assessment_id?: string;
  from_department: string;
  to_department: string;
  action: 'submitted' | 'approved' | 'rejected' | 'modification_requested' | 'modified';
  reason?: string;
  comments?: string;
  timestamp: string;
  processed_by: string;
  status: 'pending' | 'completed';
}

export interface ModificationRequest {
  id: string;
  original_payment_id: string;
  quality_assessment_id?: string;
  batch_number?: string;
  requested_by: string;
  requested_by_department: string;
  target_department: string;
  reason: string;
  comments?: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string;
}

export const useSupabaseWorkflowTracking = () => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [modificationRequests, setModificationRequests] = useState<ModificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { createAnnouncement } = useNotifications();

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      
      // Fetch workflow steps
      const { data: steps, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('*')
        .order('timestamp', { ascending: false });

      if (stepsError) {
        console.error('Error fetching workflow steps:', stepsError);
      }
      
      // Fetch modification requests
      const { data: requests, error: requestsError } = await supabase
        .from('modification_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching modification requests:', requestsError);
      }
      
      setWorkflowSteps(steps || []);
      setModificationRequests(requests || []);
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
      
      const { data, error } = await supabase
        .from('workflow_steps')
        .insert([{
          ...stepData,
          timestamp: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      console.log('Workflow step tracked with ID:', data.id);
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

  const createModificationRequest = async (requestData: Omit<ModificationRequest, 'id' | 'created_at'>) => {
    try {
      console.log('Creating modification request:', requestData);
      
      const modificationRequestData = {
        ...requestData,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('modification_requests')
        .insert([modificationRequestData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Modification request created with ID:', data.id);

      // Notify target department
      await createAnnouncement(
        'Modification Request Pending',
        `Batch ${modificationRequestData.batch_number || ''} requires action: ${modificationRequestData.reason}`,
        modificationRequestData.requested_by_department,
        [modificationRequestData.target_department],
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
      
      const { error } = await supabase
        .from('modification_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        throw error;
      }
      
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
    return workflowSteps.filter(step => step.payment_id === paymentId);
  };

  const getPendingModificationRequests = (department: string) => {
    const pending = modificationRequests.filter(
      request => request.target_department === department && request.status === 'pending'
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