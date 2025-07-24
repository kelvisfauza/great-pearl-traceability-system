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
  serverTimestamp 
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
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Completed';
  requestedDate: string;
  reviewedBy?: string;
  reviewedAt?: string;
  responseMessage?: string;
  attachments?: string[];
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
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRequest[];
      
      setRequests(requestsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, employee]);

  const createRequest = async (requestData: Omit<UserRequest, 'id' | 'userId' | 'employeeId' | 'status' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !employee) {
      toast({
        title: "Error",
        description: "You must be logged in to create a request",
        variant: "destructive"
      });
      return false;
    }

    try {
      await addDoc(collection(db, 'user_requests'), {
        ...requestData,
        userId: user.uid,
        employeeId: employee.id,
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

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
        updatedAt: serverTimestamp()
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