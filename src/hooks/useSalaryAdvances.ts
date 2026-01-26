import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SalaryAdvance {
  id: string;
  employee_email: string;
  employee_name: string;
  original_amount: number;
  remaining_balance: number;
  minimum_payment: number;
  reason: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdvancePayment {
  id: string;
  advance_id: string;
  employee_email: string;
  amount_paid: number;
  salary_request_id: string | null;
  payment_date: string;
  approved_by: string | null;
  status: string;
  created_at: string;
}

export const useSalaryAdvances = () => {
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [payments, setPayments] = useState<AdvancePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch active advances for an employee
  const fetchEmployeeAdvance = useCallback(async (email: string): Promise<SalaryAdvance | null> => {
    try {
      const { data, error } = await supabase
        .from('employee_salary_advances')
        .select('*')
        .eq('employee_email', email)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching advance:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching advance:', error);
      return null;
    }
  }, []);

  // Fetch all active advances (for admin)
  const fetchAllAdvances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_salary_advances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvances(data || []);
    } catch (error) {
      console.error('Error fetching advances:', error);
      toast({
        title: "Error",
        description: "Failed to fetch salary advances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments for an advance
  const fetchAdvancePayments = async (advanceId: string) => {
    try {
      const { data, error } = await supabase
        .from('salary_advance_payments')
        .select('*')
        .eq('advance_id', advanceId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  };

  // Create a payment record when salary request includes advance deduction
  const createAdvancePayment = async (
    advanceId: string,
    email: string,
    amount: number,
    salaryRequestId?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('salary_advance_payments')
        .insert({
          advance_id: advanceId,
          employee_email: email,
          amount_paid: amount,
          salary_request_id: salaryRequestId || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }
  };

  // Approve a payment (updates balance automatically via trigger)
  const approvePayment = async (paymentId: string, approvedBy: string) => {
    try {
      const { data, error } = await supabase
        .from('salary_advance_payments')
        .update({
          status: 'approved',
          approved_by: approvedBy
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Payment Approved",
        description: "Advance payment has been approved and balance updated"
      });

      return data;
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({
        title: "Error",
        description: "Failed to approve payment",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Create a new advance record
  const createAdvance = async (
    email: string,
    name: string,
    amount: number,
    minimumPayment: number,
    reason: string,
    createdBy: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('employee_salary_advances')
        .insert({
          employee_email: email,
          employee_name: name,
          original_amount: amount,
          remaining_balance: amount,
          minimum_payment: minimumPayment,
          reason,
          created_by: createdBy,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Advance Created",
        description: `Salary advance of ${amount.toLocaleString()} UGX created for ${name}`
      });

      return data;
    } catch (error) {
      console.error('Error creating advance:', error);
      toast({
        title: "Error",
        description: "Failed to create salary advance",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    advances,
    payments,
    loading,
    fetchEmployeeAdvance,
    fetchAllAdvances,
    fetchAdvancePayments,
    createAdvancePayment,
    approvePayment,
    createAdvance
  };
};
