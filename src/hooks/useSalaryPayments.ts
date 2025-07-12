
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

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
  notes?: string
  employee_details: any[]
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
      setPayments(data || [])
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

      setPayments(prev => [data, ...prev])
      toast({
        title: "Success",
        description: "Salary payment processed successfully"
      })
      return data
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
