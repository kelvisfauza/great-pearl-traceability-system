
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

      if (error) throw error
      
      // Convert the generic database records to typed payment requests
      const typedData: SalaryPaymentRequest[] = (data || []).map(item => ({
        ...item,
        status: (item.status as 'Pending' | 'Approved' | 'Rejected') || 'Pending'
      }))
      
      setPaymentRequests(typedData)
    } catch (error) {
      console.error('Error fetching salary payment requests:', error)
      toast({
        title: "Error",
        description: "Failed to fetch salary payment requests",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const submitPaymentRequest = async (requestData: Omit<SalaryPaymentRequest, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .insert([requestData])
        .select()
        .single()

      if (error) throw error

      // Convert the response to typed format
      const typedData: SalaryPaymentRequest = {
        ...data,
        status: (data.status as 'Pending' | 'Approved' | 'Rejected') || 'Pending'
      }

      setPaymentRequests(prev => [typedData, ...prev])
      toast({
        title: "Success", 
        description: "Salary payment request submitted to Finance for approval"
      })
      return typedData
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
