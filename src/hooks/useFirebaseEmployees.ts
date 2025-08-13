
import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from './useNotifications'

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
  avatar_url?: string
}

const logSecurityEvent = async (action: string, tableName: string, recordId?: string, oldValues?: any, newValues?: any) => {
  try {
    await addDoc(collection(db, 'security_audit_log'), {
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Security logging error:', error);
  }
};

export const useFirebaseEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { canManageEmployees, isAdmin, employee: currentUser } = useAuth()
  const { createRoleAssignmentNotification } = useNotifications()

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const employeesQuery = query(collection(db, 'employees'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(employeesQuery);
      
      const employeesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      
      setEmployees(employeesData);
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
      const sanitizedData = {
        ...employeeData,
        name: employeeData.name.trim(),
        email: employeeData.email.toLowerCase().trim(),
        position: employeeData.position.trim(),
        department: employeeData.department.trim(),
        join_date: employeeData.join_date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, 'employees'), sanitizedData);
      const newEmployee = { id: docRef.id, ...sanitizedData };

      setEmployees(prev => [newEmployee, ...prev])
      await logSecurityEvent('employee_created', 'employees', docRef.id, null, newEmployee);
      
      toast({
        title: "Success",
        description: `Employee ${newEmployee.name} added successfully`
      })
      return newEmployee
    } catch (error) {
      console.error('Error adding employee:', error)
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive"
      })
      throw error
    }
  }

  const addEmployeeWithAuth = async (employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'> & { password: string }) => {
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

    if (!employeeData.password || employeeData.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      })
      throw new Error("Password validation failed")
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
      // Create Firebase Auth user first
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        employeeData.email.toLowerCase().trim(), 
        employeeData.password
      )

      console.log('Firebase user created:', userCredential.user.uid)

      const sanitizedData = {
        ...employeeData,
        name: employeeData.name.trim(),
        email: employeeData.email.toLowerCase().trim(),
        position: employeeData.position.trim(),
        department: employeeData.department.trim(),
        join_date: employeeData.join_date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        authUserId: userCredential.user.uid,
        mustChangePassword: true,
        isOneTimePassword: true
      }

      // Remove password from employee data
      const { password, ...employeeDataWithoutPassword } = sanitizedData

      const docRef = await addDoc(collection(db, 'employees'), employeeDataWithoutPassword);
      const newEmployee = { id: docRef.id, ...employeeDataWithoutPassword };

      setEmployees(prev => [newEmployee, ...prev])
      await logSecurityEvent('employee_created', 'employees', docRef.id, null, newEmployee);
      
      toast({
        title: "Success",
        description: `Employee ${newEmployee.name} and login account created successfully`
      })
      return newEmployee
    } catch (error: any) {
      console.error('Error adding employee with auth:', error)
      
      let errorMessage = "Failed to create employee account"
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists"
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak"
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address"
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
      // Get the current employee data to compare permissions
      const currentEmployee = employees.find(emp => emp.id === id);
      
      const sanitizedUpdates = {
        ...updates,
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.email && { email: updates.email.toLowerCase().trim() }),
        ...(updates.position && { position: updates.position.trim() }),
        ...(updates.department && { department: updates.department.trim() }),
        updated_at: new Date().toISOString()
      }

      await updateDoc(doc(db, 'employees', id), sanitizedUpdates);
      
      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...emp, ...sanitizedUpdates } : emp
      ));
      
      // Check if permissions or role changed and notify the user
      if (currentEmployee && (updates.permissions || updates.role)) {
        const oldPermissions = currentEmployee.permissions || [];
        const newPermissions = updates.permissions || oldPermissions;
        const roleChanged = updates.role && updates.role !== currentEmployee.role;
        const permissionsChanged = JSON.stringify(oldPermissions.sort()) !== JSON.stringify(newPermissions.sort());
        
        if (roleChanged || permissionsChanged) {
          await createRoleAssignmentNotification(
            currentEmployee.name,
            updates.role || currentEmployee.role,
            newPermissions,
            currentUser?.name || 'Administrator'
          );
        }
      }
      
      await logSecurityEvent('employee_updated', 'employees', id, null, sanitizedUpdates);
      
      toast({
        title: "Success",
        description: "Employee updated successfully"
      })
    } catch (error) {
      console.error('Error updating employee:', error)
      toast({
        title: "Error",
        description: "Failed to update employee",
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
      await deleteDoc(doc(db, 'employees', id));
      
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      await logSecurityEvent('employee_deleted', 'employees', id, null, null);
      
      toast({
        title: "Success",
        description: "Employee deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast({
        title: "Error",
        description: "Failed to delete employee",
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
    addEmployeeWithAuth,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  }
}
