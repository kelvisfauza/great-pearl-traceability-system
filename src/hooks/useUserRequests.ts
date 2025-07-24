import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserRequest {
  id: string;
  userId: string;
  employeeId: string;
  requestType: 'payment_advance' | 'supplier_motivation' | 'complaint' | 'feedback' | 'leave_request' | 'expense_reimbursement';
  title: string;
  description: string;
  amount?: number;
  supplierDetails?: any;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'With HR' | 'With Finance' | 'Awaiting Management Approval' | 'Approved - Awaiting Payment' | 'Completed' | 'Rejected' | 'Reviewing' | 'Resolved';
  requestedDate: string;
  expectedDate?: string;
  department?: string;
  justification?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  responseMessage?: string;
  attachments?: string[];
  currentStep: 'hr' | 'finance' | 'finance_payment' | 'management' | 'admin' | 'completed';
  workflowHistory?: {
    step: string;
    timestamp: string;
    reviewedBy?: string;
    action: 'submitted' | 'approved' | 'rejected' | 'forwarded' | 'payment_processed';
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export const useUserRequests = () => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !employee) {
      setLoading(false);
      return;
    }

    // Mock subscription - in real implementation would use Supabase realtime
    console.log('Loading user requests for:', user.id);
    setRequests([]);
    setLoading(false);

    return () => {
      console.log('Unsubscribing from user requests');
    };
  }, [user, employee]);

  const createRequest = async (requestData: Omit<UserRequest, 'id' | 'userId' | 'employeeId' | 'status' | 'createdAt' | 'updatedAt' | 'currentStep' | 'workflowHistory'>) => {
    if (!user || !employee) {
      toast({
        title: "Error",
        description: "You must be logged in to create a request",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Determine initial status and workflow step based on request type
      const isComplaint = requestData.requestType === 'complaint';
      const initialStatus = isComplaint ? 'Reviewing' : 'With HR';
      const initialStep = isComplaint ? 'admin' : 'hr';

      const newRequest: UserRequest = {
        id: `req-${Date.now()}`,
        ...requestData,
        userId: user.id,
        employeeId: employee.id,
        status: initialStatus,
        currentStep: initialStep,
        workflowHistory: [{
          step: initialStep,
          timestamp: new Date().toISOString(),
          action: 'submitted' as const,
          notes: `Request submitted by ${employee.name || 'user'}`
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Creating request with data:', newRequest);
      
      // Mock request creation - in real implementation would use Supabase
      setRequests(prev => [newRequest, ...prev]);

      toast({
        title: "Success",
        description: "Your request has been submitted successfully"
      });
      
      return true;
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateRequest = async (requestId: string, updates: Partial<UserRequest>) => {
    try {
      console.log('Updating request:', requestId, updates);
      
      // Mock request update - in real implementation would use Supabase
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, ...updates, updatedAt: new Date().toISOString() } 
            : req
        )
      );

      toast({
        title: "Success",
        description: "Request updated successfully"
      });
      
      return true;
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "Failed to update request. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    requests,
    loading,
    createRequest,
    updateRequest
  };
};