
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

// Simplified security audit logging function
const logSecurityEvent = async (action: string, tableName: string, recordId?: string, oldValues?: any, newValues?: any) => {
  try {
    // Log to console for now since we're using Firebase
    console.log('Security Event:', {
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Security logging error:', error);
  }
};

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchEmployees = async () => {
    try {
      // For now, return empty array as we're migrating to Firebase
      setEmployees([])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast({
        title: "Info",
        description: "Employee data will be available once Firebase migration is complete.",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateRoleAssignment = async (employeeData: any) => {
    // Simplified validation for now
    if (employeeData.role === 'Administrator' || employeeData.permissions?.includes('Human Resources') || employeeData.permissions?.includes('Finance')) {
      console.log('Admin role assignment detected');
    }
  };

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await validateRoleAssignment(employeeData);

      // For now, just add to local state as placeholder
      const newEmployee = {
        ...employeeData,
        id: `emp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        join_date: employeeData.join_date || new Date().toISOString()
      };

      setEmployees(prev => [newEmployee, ...prev])
      
      await logSecurityEvent('employee_created', 'employees', newEmployee.id, null, newEmployee);
      
      toast({
        title: "Success",
        description: "Employee added successfully (demo mode)"
      })
      return newEmployee
    } catch (error) {
      console.error('Error adding employee:', error)
      toast({
        title: "Error",
        description: "Failed to add employee.",
        variant: "destructive"
      })
      throw error
    }
  }

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      await validateRoleAssignment({ ...updates });

      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...emp, ...updates, updated_at: new Date().toISOString() } : emp
      ));
      
      await logSecurityEvent('employee_updated', 'employees', id, null, updates);
      
      toast({
        title: "Success",
        description: "Employee updated successfully (demo mode)"
      })
    } catch (error) {
      console.error('Error updating employee:', error)
      toast({
        title: "Error",
        description: "Failed to update employee.",
        variant: "destructive"
      })
      throw error
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      const employeeToDelete = employees.find(emp => emp.id === id);

      setEmployees(prev => prev.filter(emp => emp.id !== id))
      
      await logSecurityEvent('employee_deleted', 'employees', id, employeeToDelete, null);
      
      toast({
        title: "Success",
        description: "Employee deleted successfully (demo mode)"
      })
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast({
        title: "Error",
        description: "Failed to delete employee.",
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
