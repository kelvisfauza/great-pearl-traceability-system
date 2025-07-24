import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

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
  authUserId?: string
  isOneTimePassword?: boolean
  mustChangePassword?: boolean
}

const logSecurityEvent = async (action: string, tableName: string, recordId?: string, oldValues?: any, newValues?: any) => {
  try {
    console.log('Security event logged:', { action, tableName, recordId });
    // Mock security logging - in real implementation would use Supabase
  } catch (error) {
    console.error('Security logging error:', error);
  }
};

export const useSecureEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { canManageEmployees, isAdmin } = useAuth()

  const fetchEmployees = async () => {
    try {
      console.log('Fetching employees...');
      setLoading(true)
      
      // Mock data since employees table doesn't exist yet
      const mockEmployees: Employee[] = []
      
      console.log('Employees loaded:', mockEmployees.length);
      setEmployees(mockEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      })
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const validateEmployeeData = (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): string[] => {
    const errors: string[] = []
    
    if (!employeeData.name?.trim()) errors.push('Name is required')
    if (!employeeData.email?.trim()) errors.push('Email is required')
    if (!employeeData.position?.trim()) errors.push('Position is required')
    if (!employeeData.department?.trim()) errors.push('Department is required')
    if (!employeeData.role?.trim()) errors.push('Role is required')
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (employeeData.email && !emailRegex.test(employeeData.email)) {
      errors.push('Invalid email format')
    }
    
    if (employeeData.salary < 0) {
      errors.push('Salary must be a positive number')
    }
    
    const validRoles = ['Administrator', 'Manager', 'Supervisor', 'User']
    if (employeeData.role && !validRoles.includes(employeeData.role)) {
      errors.push('Invalid role selected')
    }
    
    return errors
  }

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    if (!canManageEmployees()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add employees",
        variant: "destructive"
      })
      throw new Error("Access denied")
    }

    const validationErrors = validateEmployeeData(employeeData)
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(', '),
        variant: "destructive"
      })
      throw new Error("Validation failed")
    }

    if (employeeData.role === 'Administrator' && !isAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only administrators can create admin accounts",
        variant: "destructive"
      })
      throw new Error("Insufficient privileges")
    }

    try {
      console.log('Adding employee:', employeeData);
      
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        ...employeeData,
        name: employeeData.name.trim(),
        email: employeeData.email.toLowerCase().trim(),
        position: employeeData.position.trim(),
        department: employeeData.department.trim(),
        join_date: employeeData.join_date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: employeeData.permissions || [],
        status: employeeData.status || 'Active',
        isOneTimePassword: employeeData.isOneTimePassword || false,
        mustChangePassword: employeeData.mustChangePassword || false,
        authUserId: employeeData.authUserId || null
      }

      console.log('Employee added successfully:', newEmployee);
      setEmployees(prev => [newEmployee, ...prev])
      await logSecurityEvent('employee_created', 'employees', newEmployee.id, null, newEmployee);
      
      toast({
        title: "Success",
        description: `Employee ${newEmployee.name} added successfully`
      })
      return newEmployee
    } catch (error) {
      console.error('Error adding employee:', error)
      toast({
        title: "Error",
        description: "Failed to add employee. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    if (!canManageEmployees()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to update employees",
        variant: "destructive"
      })
      throw new Error("Access denied")
    }

    try {
      console.log('Updating employee:', id, updates);
      
      const sanitizedUpdates = {
        ...updates,
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.email && { email: updates.email.toLowerCase().trim() }),
        ...(updates.position && { position: updates.position.trim() }),
        ...(updates.department && { department: updates.department.trim() }),
        updated_at: new Date().toISOString()
      }

      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...emp, ...sanitizedUpdates } : emp
      ));
      
      await logSecurityEvent('employee_updated', 'employees', id, null, sanitizedUpdates);
      
      console.log('Employee updated successfully');
      toast({
        title: "Success",
        description: "Employee updated successfully"
      })
    } catch (error) {
      console.error('Error updating employee:', error)
      toast({
        title: "Error",
        description: "Failed to update employee. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }

  const deleteEmployee = async (id: string) => {
    if (!isAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete employees",
        variant: "destructive"
      })
      throw new Error("Access denied")
    }

    try {
      console.log('Deleting employee:', id);
      
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      await logSecurityEvent('employee_deleted', 'employees', id, null, null);
      
      console.log('Employee deleted successfully');
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast({
        title: "Error",
        description: "Failed to delete employee. Please try again.",
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