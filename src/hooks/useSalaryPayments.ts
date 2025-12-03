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
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Salary Payment')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const requests = (data || []).map(item => ({
        id: item.id,
        department: item.department || 'HR',
        type: item.type || 'Salary Payment',
        title: item.title || '',
        description: item.description || '',
        amount: String(item.amount || '0'),
        requestedby: item.requestedby || '',
        daterequested: item.daterequested || new Date().toISOString(),
        priority: item.priority || 'Medium',
        status: (item.status === 'Approved' ? 'Approved' : item.status === 'Rejected' ? 'Rejected' : 'Pending') as 'Pending' | 'Approved' | 'Rejected',
        details: item.details || {},
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      }))

      setPaymentRequests(requests)
    } catch (error) {
      console.error('Error fetching salary payment requests:', error)
      setPaymentRequests([])
    } finally {
      setLoading(false)
    }
  }

  const submitPaymentRequest = async (requestData: Omit<SalaryPaymentRequest, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          department: requestData.department,
          type: requestData.type,
          title: requestData.title,
          description: requestData.description,
          amount: parseFloat(requestData.amount) || 0,
          requestedby: requestData.requestedby,
          daterequested: requestData.daterequested,
          priority: requestData.priority,
          status: 'Pending Admin',
          details: requestData.details
        })
        .select()
        .single()

      if (error) throw error

      const newRequest: SalaryPaymentRequest = {
        id: data.id,
        ...requestData,
        created_at: data.created_at,
        updated_at: data.updated_at
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

  const updatePaymentRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setPaymentRequests(prev => 
        prev.map(req => 
          req.id === id ? { ...req, status, updated_at: new Date().toISOString() } : req
        )
      )

      toast({
        title: "Success",
        description: `Payment request ${status.toLowerCase()} successfully`
      })
    } catch (error) {
      console.error('Error updating payment request status:', error)
      toast({
        title: "Error",
        description: "Failed to update payment request status",
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
    updatePaymentRequestStatus,
    refetch: fetchPaymentRequests
  }
}
