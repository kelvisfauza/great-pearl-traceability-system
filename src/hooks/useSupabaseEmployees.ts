import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  salary: number;
  role: string;
  permissions: string[];
  status: string;
  join_date: string;
  employee_id?: string;
  address?: string;
  emergency_contact?: string;
  is_training_account?: boolean;
  training_progress?: number;
  created_at?: string;
  updated_at?: string;
}

export const useSupabaseEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching employees:', error);
        setError(error.message);
        return;
      }

      // Transform Supabase data to match Employee interface
      const transformedEmployees: Employee[] = (data || []).map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone || '',
        position: emp.position,
        department: emp.department,
        salary: emp.salary ? Number(emp.salary) : 0,
        role: emp.role || 'User',
        permissions: emp.permissions || ['General Access'],
        status: emp.status || 'Active',
        join_date: emp.join_date,
        employee_id: emp.employee_id,
        address: emp.address,
        emergency_contact: emp.emergency_contact,
        is_training_account: emp.is_training_account || false,
        training_progress: emp.training_progress || 0,
        created_at: emp.created_at,
        updated_at: emp.updated_at
      }));

      setEmployees(transformedEmployees);
    } catch (error) {
      console.error('Error in fetchEmployees:', error);
      setError('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchEmployees();
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return {
    employees,
    loading,
    error,
    refetch
  };
};