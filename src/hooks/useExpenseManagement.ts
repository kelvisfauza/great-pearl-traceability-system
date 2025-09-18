import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExpenseRequest {
  id: string;
  title: string;
  description: string;
  amount: number;
  requestedBy: string;
  dateRequested: string;
  priority: string;
  status: string;
  financeApproved: boolean;
  adminApproved: boolean;
}

interface CompanyExpense {
  id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  priority: string;
  dateCreated: string;
  financeApproved: boolean;
  adminApproved: boolean;
}

interface CreateExpenseData {
  title: string;
  description: string;
  amount: number;
  priority: string;
  category: string;
}

export const useExpenseManagement = () => {
  const [userExpenseRequests, setUserExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [companyExpenses, setCompanyExpenses] = useState<CompanyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();

  useEffect(() => {
    fetchExpenseData();
  }, []);

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      
      // Fetch user expense requests
      const { data: requests } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Expense Request')
        .order('created_at', { ascending: false });

      const formattedRequests: ExpenseRequest[] = requests?.map(req => ({
        id: req.id,
        title: req.title,
        description: req.description,
        amount: parseFloat(req.amount || '0'),
        requestedBy: req.requestedby,
        dateRequested: new Date(req.daterequested).toLocaleDateString(),
        priority: req.priority,
        status: req.status,
        financeApproved: !!req.finance_approved_at,
        adminApproved: !!req.admin_approved_at
      })) || [];

      setUserExpenseRequests(formattedRequests);

      // Mock company expenses data for now
      const mockCompanyExpenses: CompanyExpense[] = [
        {
          id: 'comp_001',
          title: 'Office Equipment Purchase',
          description: 'New computers and printers for staff',
          amount: 2500000,
          category: 'Equipment',
          priority: 'Medium',
          dateCreated: new Date().toLocaleDateString(),
          financeApproved: true,
          adminApproved: false
        }
      ];

      setCompanyExpenses(mockCompanyExpenses);
    } catch (error) {
      console.error('Error fetching expense data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveExpenseRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({
          finance_approved_at: new Date().toISOString(),
          finance_approved_by: employee?.name || 'Finance Team',
          status: 'Finance Approved'
        })
        .eq('id', requestId);

      if (error) throw error;
      
      await fetchExpenseData();
    } catch (error) {
      console.error('Error approving expense request:', error);
      throw error;
    }
  };

  const rejectExpenseRequest = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'Rejected',
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejected_by: employee?.name || 'Finance Team'
        })
        .eq('id', requestId);

      if (error) throw error;
      
      await fetchExpenseData();
    } catch (error) {
      console.error('Error rejecting expense request:', error);
      throw error;
    }
  };

  const createCompanyExpense = async (expenseData: CreateExpenseData) => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .insert({
          type: 'Company Expense',
          title: expenseData.title,
          description: expenseData.description,
          amount: expenseData.amount.toString(),
          priority: expenseData.priority,
          department: 'Finance',
          requestedby: employee?.name || 'Finance Department',
          daterequested: new Date().toISOString(),
          status: 'Pending',
          details: {
            category: expenseData.category,
            requires_dual_approval: true
          }
        });

      if (error) throw error;
      
      await fetchExpenseData();
    } catch (error) {
      console.error('Error creating company expense:', error);
      throw error;
    }
  };

  return {
    userExpenseRequests,
    companyExpenses,
    loading,
    approveExpenseRequest,
    rejectExpenseRequest,
    createCompanyExpense,
    refetch: fetchExpenseData
  };
};