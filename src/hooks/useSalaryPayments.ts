import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, query, orderBy, where, updateDoc, doc, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'

export interface SalaryPaymentRequest {
  id: string
  department: string
  type: string
  title: string
  description: string
  amount: string
  requestedby: string
  daterequested: string
  priority: string
  status: 'Pending' | 'Approved' | 'Rejected'
  details: any
  created_at: string
  updated_at: string
}

export const useSalaryPayments = () => {
  const [paymentRequests, setPaymentRequests] = useState<SalaryPaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchPaymentRequests = async () => {
    try {
      console.log('Fetching salary payment requests from Firebase...')
      
      // Simplified query to avoid index requirements
      const approvalRequestsQuery = query(
        collection(db, 'approval_requests'),
        where('type', '==', 'Salary Payment'),
        limit(50) // Add limit to reduce load
      )
      
      const snapshot = await getDocs(approvalRequestsQuery)
      const requests = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          department: data.department || 'HR',
          type: data.type || 'Salary Payment',
          title: data.title || '',
          description: data.description || '',
          amount: data.amount || '0',
          requestedby: data.requestedby || '',
          daterequested: data.daterequested || new Date().toISOString(),
          priority: data.priority || 'Medium',
          status: data.status as 'Pending' | 'Approved' | 'Rejected' || 'Pending',
          details: data.details || {},
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        } as SalaryPaymentRequest
      })
      
      // Sort in memory by created_at (most recent first) to avoid compound index requirement
      requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      console.log('Salary payment requests fetched successfully:', requests.length)
      setPaymentRequests(requests)
    } catch (error) {
      console.error('Error fetching salary payment requests:', error)
      toast({
        title: "Error",
        description: "Failed to fetch salary payment requests",
        variant: "destructive"
      })
      setPaymentRequests([])
    } finally {
      setLoading(false)
    }
  }

  const submitPaymentRequest = async (requestData: Omit<SalaryPaymentRequest, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Submitting salary payment request to Firebase:', requestData)
      
      const docRef = await addDoc(collection(db, 'approval_requests'), {
        ...requestData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      const newRequest: SalaryPaymentRequest = {
        id: docRef.id,
        ...requestData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setPaymentRequests(prev => [newRequest, ...prev])
      console.log('Salary payment request submitted successfully')
      toast({
        title: "Success", 
        description: "Salary payment request submitted to Finance for approval"
      })
      return newRequest
    } catch (error) {
      console.error('Error submitting salary payment request:', error)
      toast({
        title: "Error",
        description: "Failed to submit salary payment request",
        variant: "destructive"
      })
      throw error
    }
  }

  const updatePaymentRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      console.log('Updating payment request status:', id, status);
      
      await updateDoc(doc(db, 'approval_requests', id), {
        status,
        updated_at: new Date().toISOString()
      });

      setPaymentRequests(prev => 
        prev.map(req => 
          req.id === id ? { ...req, status, updated_at: new Date().toISOString() } : req
        )
      );

      toast({
        title: "Success",
        description: `Payment request ${status.toLowerCase()} successfully`
      });
    } catch (error) {
      console.error('Error updating payment request status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment request status",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPaymentRequests()
  }, [])

  return {
    paymentRequests,
    loading,
    submitPaymentRequest,
    updatePaymentRequestStatus,
    refetch: fetchPaymentRequests
  }
}
