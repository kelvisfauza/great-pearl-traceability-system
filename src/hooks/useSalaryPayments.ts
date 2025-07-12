
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Tables } from '@/integrations/supabase/types'

export interface SalaryPayment {
  id: string
  month: string
  total_pay: number
  bonuses: number
  deductions: number
  employee_count: number
  status: string
  processed_by: string
  processed_date: string
  payment_method: string
  notes?: string | null
  employee_details: any
  created_at: string
}

export const useSalaryPayments = () => {
  const [payments, setPayments] = useState<SalaryPayment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('salary_payments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(payment => ({
        ...payment,
        employee_details: payment.employee_details || []
      }))
      
      setPayments(transformedData)
    } catch (error) {
      console.error('Error fetching salary payments:', error)
      toast({
        title: "Error",
        description: "Failed to fetch salary payments",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addPayment = async (paymentData: Omit<SalaryPayment, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('salary_payments')
        .insert([paymentData])
        .select()
        .single()

      if (error) throw error

      const transformedPayment = {
        ...data,
        employee_details: data.employee_details || []
      }

      setPayments(prev => [transformedPayment, ...prev])
      toast({
        title: "Success",
        description: "Salary payment processed successfully"
      })
      return transformedPayment
    } catch (error) {
      console.error('Error processing salary payment:', error)
      toast({
        title: "Error",
        description: "Failed to process salary payment",
        variant: "destructive"
      })
      throw error
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  return {
    payments,
    loading,
    addPayment,
    refetch: fetchPayments
  }
}
