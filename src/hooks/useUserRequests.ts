import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

    const q = query(
      collection(db, 'user_requests'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to strings
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || data.reviewedAt,
        };
      }) as UserRequest[];
      
      setRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
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

      const docData = {
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
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      console.log('Creating request with data:', docData);
      await addDoc(collection(db, 'user_requests'), docData);

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
      await updateDoc(doc(db, 'user_requests', requestId), {
        ...updates,
        updatedAt: Timestamp.now()
      });

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