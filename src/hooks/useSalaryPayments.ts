
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, query, orderBy, where } from 'firebase/firestore'
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
      
      const approvalRequestsQuery = query(
        collection(db, 'approval_requests'),
        where('type', '==', 'Salary Payment'),
        orderBy('created_at', 'desc')
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
      
      console.log('Salary payment requests fetched:', requests.length)
      setPaymentRequests(requests)
    } catch (error) {
      console.error('Error fetching salary payment requests:', error)
      toast({
        title: "Error",
        description: "Failed to fetch salary payment requests",
        variant: "destructive"
      })
      // Set empty array on error to prevent UI issues
      setPaymentRequests([])
    } finally {
      setLoading(false)
    }
  }

  const submitPaymentRequest = async (requestData: Omit<SalaryPaymentRequest, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Submitting salary payment request:', requestData)
      
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

  useEffect(() => {
    fetchPaymentRequests()
  }, [])

  return {
    paymentRequests,
    loading,
    submitPaymentRequest,
    refetch: fetchPaymentRequests
  }
}
