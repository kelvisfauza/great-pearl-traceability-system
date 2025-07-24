import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  salary: number;
  role: 'admin' | 'hr' | 'finance' | 'analyst' | 'field' | 'store' | 'quality' | 'procurement' | 'logistics' | 'processing' | 'sales_marketing' | 'management';
  permissions: string[];
  status: 'active' | 'inactive';
  join_date: string;
  created_at: string;
  updated_at: string;
}

// Security logging function
const logSecurityEvent = async (action: string, tableName: string, recordId?: string, oldValues?: any, newValues?: any) => {
  try {
    console.log('Security event:', { action, tableName, recordId, oldValues, newValues });
    // Mock security logging - in real implementation would use Supabase
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

export const useFirebaseEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      console.log('Loading employees...');
      
      // Mock data since employees table doesn't exist yet
      const mockEmployees: Employee[] = [
        {
          id: '1',
          name: 'John Admin',
          email: 'admin@company.com',
          position: 'System Administrator',
          department: 'IT',
          salary: 5000000,
          role: 'admin',
          permissions: ['all'],
          status: 'active',
          join_date: '2024-01-01',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      console.log('Loaded employees:', mockEmployees.length, 'records');
      setEmployees(mockEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Validation function
  const validateEmployeeData = (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): string[] => {
    const errors: string[] = [];
    
    if (!employeeData.name?.trim()) errors.push('Name is required');
    if (!employeeData.email?.trim()) errors.push('Email is required');
    if (!employeeData.position?.trim()) errors.push('Position is required');
    if (!employeeData.department?.trim()) errors.push('Department is required');
    if (!employeeData.role) errors.push('Role is required');
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (employeeData.email && !emailRegex.test(employeeData.email)) {
      errors.push('Invalid email format');
    }
    
    // Salary validation
    if (employeeData.salary && employeeData.salary < 0) {
      errors.push('Salary must be a positive number');
    }
    
    // Role validation
    const validRoles = ['admin', 'hr', 'finance', 'analyst', 'field', 'store', 'quality', 'procurement', 'logistics', 'processing', 'sales_marketing', 'management'];
    if (employeeData.role && !validRoles.includes(employeeData.role)) {
      errors.push('Invalid role specified');
    }
    
    return errors;
  };

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Check permissions
      if (!hasPermission('manage_employees')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to add employees",
          variant: "destructive"
        });
        throw new Error('Insufficient permissions');
      }

      // Validate data
      const validationErrors = validateEmployeeData(employeeData);
      if (validationErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: validationErrors.join(', '),
          variant: "destructive"
        });
        throw new Error('Validation failed');
      }

      const newEmployee = {
        id: `emp-${Date.now()}`,
        ...employeeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Employee added successfully:', newEmployee.id);
      
      // Update local state
      setEmployees(prev => [newEmployee, ...prev]);
      
      // Log security event
      await logSecurityEvent('CREATE', 'employees', newEmployee.id, null, employeeData);
      
      toast({
        title: "Success",
        description: "Employee added successfully"
      });
      
      return newEmployee;
    } catch (error) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      // Check permissions
      if (!hasPermission('manage_employees')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to update employees",
          variant: "destructive"
        });
        throw new Error('Insufficient permissions');
      }

      const existingEmployee = employees.find(emp => emp.id === id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      console.log('Employee updated successfully');
      
      // Update local state
      setEmployees(prev => 
        prev.map(emp => 
          emp.id === id ? { ...emp, ...updates, updated_at: new Date().toISOString() } : emp
        )
      );
      
      // Log security event
      await logSecurityEvent('UPDATE', 'employees', id, existingEmployee, updates);
      
      toast({
        title: "Success",
        description: "Employee updated successfully"
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      // Check permissions
      if (!hasPermission('manage_employees')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to delete employees",
          variant: "destructive"
        });
        throw new Error('Insufficient permissions');
      }

      const existingEmployee = employees.find(emp => emp.id === id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      console.log('Employee deleted successfully');
      
      // Update local state
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      
      // Log security event
      await logSecurityEvent('DELETE', 'employees', id, existingEmployee, null);
      
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  };
};