
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Employee {
  id: string
  name: string
  email: string
  phone?: string
  position: string
  department: string
  salary: number
  employee_id?: string
  address?: string
  emergency_contact?: string
  role: string
  permissions: string[]
  status: string
  join_date: string
  created_at: string
  updated_at: string
}

// Security audit logging function
const logSecurityEvent = async (action: string, tableName: string, recordId?: string, oldValues?: any, newValues?: any) => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (session.session?.user) {
      await supabase.from('security_audit_log').insert({
        user_id: session.session.user.id,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues
      });
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast({
        title: "Error",
        description: "Failed to fetch employees. You may not have permission to view employee data.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Validate sensitive role assignments
      if (employeeData.role === 'Administrator' || employeeData.permissions?.includes('Human Resources') || employeeData.permissions?.includes('Finance')) {
        const { data: currentUserProfile } = await supabase
          .from('user_profiles')
          .select('employees:employee_id(role)')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();
        
        if (!currentUserProfile?.employees?.role || currentUserProfile.employees.role !== 'Administrator') {
          toast({
            title: "Access Denied",
            description: "Only administrators can assign administrator roles or sensitive permissions.",
            variant: "destructive"
          });
          throw new Error('Insufficient privileges for role assignment');
        }
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([{
          ...employeeData,
          join_date: employeeData.join_date || new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      setEmployees(prev => [data, ...prev])
      
      await logSecurityEvent('employee_created', 'employees', data.id, null, data);
      
      toast({
        title: "Success",
        description: "Employee added successfully"
      })
      return data
    } catch (error) {
      console.error('Error adding employee:', error)
      
      if (error instanceof Error && error.message === 'Insufficient privileges for role assignment') {
        // Error already handled above
        throw error;
      }
      
      toast({
        title: "Error",
        description: "Failed to add employee. You may not have permission to create employees.",
        variant: "destructive"
      })
      throw error
    }
  }

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      // Get current employee data for audit log
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      // Validate sensitive updates
      if (updates.role === 'Administrator' || updates.permissions?.includes('Human Resources') || updates.permissions?.includes('Finance')) {
        const { data: currentUserProfile } = await supabase
          .from('user_profiles')
          .select('employees:employee_id(role)')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();
        
        if (!currentUserProfile?.employees?.role || currentUserProfile.employees.role !== 'Administrator') {
          toast({
            title: "Access Denied",
            description: "Only administrators can assign administrator roles or sensitive permissions.",
            variant: "destructive"
          });
          throw new Error('Insufficient privileges for role assignment');
        }
      }

      const { data, error } = await supabase
        .from('employees')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setEmployees(prev => prev.map(emp => emp.id === id ? data : emp))
      
      await logSecurityEvent('employee_updated', 'employees', id, currentEmployee, data);
      
      toast({
        title: "Success",
        description: "Employee updated successfully"
      })
      return data
    } catch (error) {
      console.error('Error updating employee:', error)
      
      if (error instanceof Error && error.message === 'Insufficient privileges for role assignment') {
        // Error already handled above
        throw error;
      }
      
      toast({
        title: "Error",
        description: "Failed to update employee. You may not have permission to modify employee data.",
        variant: "destructive"
      })
      throw error
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      // Get employee data for audit log before deletion
      const { data: employeeToDelete } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

      if (error) throw error

      setEmployees(prev => prev.filter(emp => emp.id !== id))
      
      await logSecurityEvent('employee_deleted', 'employees', id, employeeToDelete, null);
      
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast({
        title: "Error",
        description: "Failed to delete employee. You may not have permission to delete employees.",
        variant: "destructive"
      })
      throw error
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  }
}
