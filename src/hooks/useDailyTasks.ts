
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DailyTask {
  id: string;
  task_type: 'Payment' | 'Receipt' | 'Float' | 'Expense' | 'Quality Assessment' | 'Employee Payment';
  description: string;
  amount?: number;
  employee_name?: string;
  batch_number?: string;
  supplier_name?: string;
  completed_at: string;
  completed_by: string;
  date: string;
}

export const useDailyTasks = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDailyTasks = async (date?: string) => {
    try {
      setLoading(true);
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      // Fetch from multiple sources to compile daily tasks
      const [
        financeTransactions,
        financeExpenses,
        paymentRecords,
        qualityAssessments,
        salaryPayments
      ] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('date', targetDate),
        supabase
          .from('finance_expenses')
          .select('*')
          .eq('date', targetDate),
        supabase
          .from('payment_records')
          .select('*')
          .eq('date', targetDate),
        supabase
          .from('quality_assessments')
          .select('*, coffee_record:coffee_records(*)')
          .eq('date_assessed', targetDate),
        supabase
          .from('salary_payments')
          .select('*')
          .eq('processed_date', targetDate)
      ]);

      const compiledTasks: DailyTask[] = [];

      // Add finance transactions
      financeTransactions.data?.forEach(transaction => {
        compiledTasks.push({
          id: transaction.id,
          task_type: transaction.type as DailyTask['task_type'],
          description: transaction.description,
          amount: Number(transaction.amount),
          completed_at: transaction.time,
          completed_by: 'Finance Team',
          date: transaction.date
        });
      });

      // Add expenses
      financeExpenses.data?.forEach(expense => {
        compiledTasks.push({
          id: expense.id,
          task_type: 'Expense',
          description: `Expense: ${expense.description}`,
          amount: Number(expense.amount),
          completed_at: new Date(expense.created_at).toLocaleTimeString(),
          completed_by: 'Finance Team',
          date: expense.date
        });
      });

      // Add payment records
      paymentRecords.data?.forEach(payment => {
        compiledTasks.push({
          id: payment.id,
          task_type: 'Payment',
          description: `Payment to ${payment.supplier}`,
          amount: Number(payment.amount),
          supplier_name: payment.supplier,
          batch_number: payment.batch_number || undefined,
          completed_at: new Date(payment.created_at).toLocaleTimeString(),
          completed_by: 'Finance Team',
          date: payment.date
        });
      });

      // Add quality assessments
      qualityAssessments.data?.forEach(assessment => {
        compiledTasks.push({
          id: assessment.id,
          task_type: 'Quality Assessment',
          description: `Quality assessment for batch ${assessment.batch_number}`,
          amount: assessment.suggested_price * (assessment.coffee_record?.kilograms || 0),
          batch_number: assessment.batch_number,
          supplier_name: assessment.coffee_record?.supplier_name,
          completed_at: new Date(assessment.created_at).toLocaleTimeString(),
          completed_by: assessment.assessed_by,
          date: assessment.date_assessed
        });
      });

      // Add salary payments
      salaryPayments.data?.forEach(payment => {
        compiledTasks.push({
          id: payment.id,
          task_type: 'Employee Payment',
          description: `Salary payment for ${payment.employee_count} employees`,
          amount: Number(payment.total_pay),
          completed_at: new Date(payment.processed_date).toLocaleTimeString(),
          completed_by: payment.processed_by,
          date: new Date(payment.processed_date).toISOString().split('T')[0]
        });
      });

      // Sort by completion time
      compiledTasks.sort((a, b) => new Date(`${a.date} ${a.completed_at}`).getTime() - new Date(`${b.date} ${b.completed_at}`).getTime());
      
      setTasks(compiledTasks);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch daily tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyTasks();
  }, []);

  return {
    tasks,
    loading,
    fetchDailyTasks,
    refetch: fetchDailyTasks
  };
};
