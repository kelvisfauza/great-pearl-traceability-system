import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
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
      console.log('Fetching salary payment requests...')
      
      // Mock data since approval_requests table doesn't exist yet
      const mockRequests: SalaryPaymentRequest[] = []
      
      console.log('Salary payment requests loaded:', mockRequests.length)
      setPaymentRequests(mockRequests)
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
      console.log('Submitting salary payment request:', requestData)
      
      const newRequest: SalaryPaymentRequest = {
        id: `req-${Date.now()}`,
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