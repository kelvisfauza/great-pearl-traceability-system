
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
}

export const useSecureEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { canManageEmployees, isAdmin } = useAuth()

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching employees:', error)
        if (error.message.includes('row-level security')) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view employee records",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch employees",
            variant: "destructive"
          })
        }
        setEmployees([])
        return
      }
      
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast({
        title: "System Error",
        description: "A system error occurred while fetching employees",
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
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (employeeData.email && !emailRegex.test(employeeData.email)) {
      errors.push('Invalid email format')
    }
    
    // Salary validation
    if (employeeData.salary < 0) {
      errors.push('Salary must be a positive number')
    }
    
    // Role validation
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

    // Validate input data
    const validationErrors = validateEmployeeData(employeeData)
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(', '),
        variant: "destructive"
      })
      throw new Error("Validation failed")
    }

    // Security check for admin role creation
    if (employeeData.role === 'Administrator' && !isAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only administrators can create admin accounts",
        variant: "destructive"
      })
      throw new Error("Insufficient privileges")
    }

    try {
      const sanitizedData = {
        ...employeeData,
        name: employeeData.name.trim(),
        email: employeeData.email.toLowerCase().trim(),
        position: employeeData.position.trim(),
        department: employeeData.department.trim(),
        join_date: employeeData.join_date || new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([sanitizedData])
        .select()
        .single()

      if (error) {
        console.error('Error adding employee:', error)
        if (error.message.includes('duplicate key')) {
          toast({
            title: "Error",
            description: "An employee with this email already exists",
            variant: "destructive"
          })
        } else if (error.message.includes('row-level security')) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to add employees",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to add employee",
            variant: "destructive"
          })
        }
        throw error
      }

      setEmployees(prev => [data, ...prev])
      toast({
        title: "Success",
        description: `Employee ${data.name} added successfully`
      })
      return data
    } catch (error) {
      if (error instanceof Error && error.message !== "Access denied" && error.message !== "Validation failed") {
        console.error('Error adding employee:', error)
        toast({
          title: "System Error",
          description: "A system error occurred while adding the employee",
          variant: "destructive"
        })
      }
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

    // Security check for admin role updates
    if (updates.role === 'Administrator' && !isAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only administrators can assign admin roles",
        variant: "destructive"
      })
      throw new Error("Insufficient privileges")
    }

    try {
      const sanitizedUpdates = {
        ...updates,
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.email && { email: updates.email.toLowerCase().trim() }),
        ...(updates.position && { position: updates.position.trim() }),
        ...(updates.department && { department: updates.department.trim() }),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('employees')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating employee:', error)
        if (error.message.includes('row-level security')) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to update this employee",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to update employee",
            variant: "destructive"
          })
        }
        throw error
      }

      setEmployees(prev => prev.map(emp => emp.id === id ? data : emp))
      toast({
        title: "Success",
        description: `Employee ${data.name} updated successfully`
      })
      return data
    } catch (error) {
      if (error instanceof Error && error.message !== "Access denied") {
        console.error('Error updating employee:', error)
        toast({
          title: "System Error",
          description: "A system error occurred while updating the employee",
          variant: "destructive"
        })
      }
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
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting employee:', error)
        if (error.message.includes('row-level security')) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to delete employees",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to delete employee",
            variant: "destructive"
          })
        }
        throw error
      }

      setEmployees(prev => prev.filter(emp => emp.id !== id))
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      })
    } catch (error) {
      if (error instanceof Error && error.message !== "Access denied") {
        console.error('Error deleting employee:', error)
        toast({
          title: "System Error",
          description: "A system error occurred while deleting the employee",
          variant: "destructive"
        })
      }
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
