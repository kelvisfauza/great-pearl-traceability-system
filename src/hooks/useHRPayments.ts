import { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SalaryRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  position: string;
  salaryAmount: number;
  period: string;
  requestedDate: string;
  status: 'Pending' | 'Processing' | 'Completed';
}

interface AdvanceRequest {
  id: string;
  employeeName: string;
  amount: number;
  reason: string;
  requestDate: string;
  status: 'Pending' | 'Processing' | 'Completed';
}

interface IssueAdvanceData {
  employee: string;
  amount: number;
  reason: string;
}

export const useHRPayments = () => {
  const [salaryRequests, setSalaryRequests] = useState<SalaryRequest[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();

  useEffect(() => {
    fetchHRPayments();
  }, []);

  const fetchHRPayments = async () => {
    try {
      setLoading(true);
      
      // Fetch salary payment requests from Supabase
      const { data: salaryReqs } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Salary Payment')
        .order('created_at', { ascending: false });

      const formattedSalaryRequests: SalaryRequest[] = salaryReqs?.map(req => ({
        id: req.id,
        employeeName: (req.details as any)?.employee_name || req.requestedby || 'Unknown',
        employeeId: (req.details as any)?.employee_id || 'N/A',
        position: (req.details as any)?.position || 'Unknown',
        salaryAmount: req.amount || 0,
        period: (req.details as any)?.period || 'Current Month',
        requestedDate: new Date(req.daterequested).toLocaleDateString(),
        status: req.status === 'Approved' ? 'Completed' : 
                req.status === 'Processing' ? 'Processing' : 'Pending'
      })) || [];

      setSalaryRequests(formattedSalaryRequests);

      // Mock advance requests for now
      const mockAdvanceRequests: AdvanceRequest[] = [
        {
          id: 'adv_001',
          employeeName: 'Sarah Johnson',
          amount: 300000,
          reason: 'Medical emergency for family member',
          requestDate: new Date().toLocaleDateString(),
          status: 'Pending'
        },
        {
          id: 'adv_002', 
          employeeName: 'Michael Brown',
          amount: 150000,
          reason: 'School fees payment',
          requestDate: new Date(Date.now() - 86400000).toLocaleDateString(),
          status: 'Completed'
        }
      ];

      setAdvanceRequests(mockAdvanceRequests);
    } catch (error) {
      console.error('Error fetching HR payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSalaryPayment = async (paymentId: string, method: 'Cash' | 'Bank') => {
    try {
      if (method === 'Cash') {
        // Process cash payment immediately
        const { error } = await supabase
          .from('approval_requests')
          .update({
            status: 'Approved',
            processed_at: new Date().toISOString(),
            processed_by: employee?.name || 'Finance Department',
            payment_method: 'Cash'
          })
          .eq('id', paymentId);

        if (error) throw error;
        
        // Create payment record
        await addDoc(collection(db, 'payment_records'), {
          type: 'salary',
          payment_id: paymentId,
          method: 'Cash',
          status: 'Completed',
          processed_by: employee?.name || 'Finance Department',
          processed_at: new Date().toISOString()
        });
      } else {
        // Submit for admin approval
        const { error } = await supabase
          .from('approval_requests')
          .update({
            status: 'Processing',
            finance_approved_at: new Date().toISOString(),
            finance_approved_by: employee?.name || 'Finance Department',
            payment_method: 'Bank Transfer'
          })
          .eq('id', paymentId);

        if (error) throw error;
      }
      
      await fetchHRPayments();
    } catch (error) {
      console.error('Error processing salary payment:', error);
      throw error;
    }
  };

  const processAdvancePayment = async (advanceId: string, method: 'Cash' | 'Bank') => {
    try {
      // Update advance request status
      setAdvanceRequests(prev => prev.map(adv => 
        adv.id === advanceId 
          ? { ...adv, status: method === 'Cash' ? 'Completed' : 'Processing' }
          : adv
      ));
      
      // Create payment record
      await addDoc(collection(db, 'payment_records'), {
        type: 'advance',
        advance_id: advanceId,
        method,
        status: method === 'Cash' ? 'Completed' : 'Processing',
        processed_by: employee?.name || 'Finance Department',
        processed_at: new Date().toISOString()
      });

      if (method === 'Bank') {
        // Create approval request for admin
        const advance = advanceRequests.find(a => a.id === advanceId);
        if (advance) {
          await supabase
            .from('approval_requests')
          .insert({
            type: 'Employee Advance',
            title: `Advance Payment - ${advance.employeeName}`,
            description: advance.reason,
            amount: advance.amount,
            requestedby: employee?.name || 'Finance Department',
              department: 'Finance',
              daterequested: new Date().toISOString(),
              status: 'Pending',
              priority: 'Medium',
              details: {
                employee_name: advance.employeeName,
                advance_id: advanceId,
                method: 'Bank Transfer'
              }
            });
        }
      }
      
      await fetchHRPayments();
    } catch (error) {
      console.error('Error processing advance payment:', error);
      throw error;
    }
  };

  const issueAdvance = async (advanceData: IssueAdvanceData) => {
    try {
      // Add new advance to the list
      const newAdvance: AdvanceRequest = {
        id: `adv_${Date.now()}`,
        employeeName: advanceData.employee,
        amount: advanceData.amount,
        reason: advanceData.reason,
        requestDate: new Date().toLocaleDateString(),
        status: 'Pending'
      };
      
      setAdvanceRequests(prev => [newAdvance, ...prev]);
      
      // Create advance record
      await addDoc(collection(db, 'employee_advances'), {
        employee_name: advanceData.employee,
        amount: advanceData.amount,
        reason: advanceData.reason,
        issued_by: employee?.name || 'Finance Department',
        issued_at: new Date().toISOString(),
        status: 'Pending'
      });
    } catch (error) {
      console.error('Error issuing advance:', error);
      throw error;
    }
  };

  return {
    salaryRequests,
    advanceRequests,
    loading,
    processSalaryPayment,
    processAdvancePayment,
    issueAdvance,
    refetch: fetchHRPayments
  };
};