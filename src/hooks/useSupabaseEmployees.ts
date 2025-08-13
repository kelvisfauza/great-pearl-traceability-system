import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  salary: number;
  employee_id?: string;
  address?: string;
  emergency_contact?: string;
  role: string;
  permissions: string[];
  status: string;
  join_date: string;
  created_at: string;
  updated_at: string;
  is_training_account?: boolean;
  training_progress?: number;
}

export const useSupabaseEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: "Error",
          description: "Failed to fetch employees",
          variant: "destructive"
        });
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) {
        console.error('Error adding employee:', error);
        toast({
          title: "Error",
          description: "Failed to add employee",
          variant: "destructive"
        });
        throw error;
      }

      await fetchEmployees();
      toast({
        title: "Success",
        description: "Employee added successfully"
      });

      return data;
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, employeeData: Partial<Employee>) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id);

      if (error) {
        console.error('Error updating employee:', error);
        toast({
          title: "Error",
          description: "Failed to update employee",
          variant: "destructive"
        });
        throw error;
      }

      await fetchEmployees();
      toast({
        title: "Success",
        description: "Employee updated successfully"
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting employee:', error);
        toast({
          title: "Error",
          description: "Failed to delete employee",
          variant: "destructive"
        });
        throw error;
      }

      await fetchEmployees();
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  };
};