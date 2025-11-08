import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateEmployeePermissions } from '@/utils/updateEmployeePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UnifiedEmployee {
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
  auth_user_id?: string;
  disabled?: boolean;
  is_training_account?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useUnifiedEmployees = () => {
  const [employees, setEmployees] = useState<UnifiedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const { canManageEmployees, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Fetch from Supabase (primary source for employee data)
      const { data: supabaseEmployees, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      // Transform and set employees
      const transformedEmployees: UnifiedEmployee[] = (supabaseEmployees || []).map(emp => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone || '',
        position: emp.position,
        department: emp.department,
        salary: emp.salary || 0,
        role: emp.role || 'User',
        permissions: emp.permissions || ['General Access'],
        status: emp.status || 'Active',
        join_date: emp.join_date,
        employee_id: emp.employee_id,
        address: emp.address,
        emergency_contact: emp.emergency_contact,
        auth_user_id: emp.auth_user_id,
        disabled: emp.disabled || false,
        is_training_account: emp.is_training_account || false,
        created_at: emp.created_at,
        updated_at: emp.updated_at
      }));

      setEmployees(transformedEmployees);
      console.log(`✅ Loaded ${transformedEmployees.length} employees from unified system`);
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: Omit<UnifiedEmployee, 'id' | 'created_at' | 'updated_at'> & { password?: string }) => {
    if (!canManageEmployees()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to add employees",
        variant: "destructive"
      });
      throw new Error("Access denied");
    }

    try {
      console.log('🆕 Creating new employee:', employeeData.name);

      // Extract password and remove it from employee data
      const { password, ...employeeDataWithoutPassword } = employeeData;

      // 1. Create auth user if password is provided
      let authUserId = null;
      if (password) {
        try {
          const response = await supabase.functions.invoke('create-user', {
            body: { 
              employeeData: {
                ...employeeDataWithoutPassword,
                password
              }
            }
          });

          if (response.error) {
            throw new Error(response.error.message || 'Failed to create user account');
          }

          if (response.data?.success && response.data?.user?.id) {
            authUserId = response.data.user.id;
            console.log('✅ Auth user created with ID:', authUserId);
          } else {
            throw new Error(response.data?.error || 'Failed to create user account');
          }
        } catch (authError) {
          console.error('❌ Auth user creation failed:', authError);
          throw new Error(`Failed to create user account: ${authError.message}`);
        }
      }

      // 2. Create in Supabase employees table
      const { data: newEmployee, error: supabaseError } = await supabase
        .from('employees')
        .insert([{
          ...employeeDataWithoutPassword,
          auth_user_id: authUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

      console.log('✅ Employee created in Supabase:', newEmployee.id);

      // 2. Sync to Firebase using existing utility
      try {
        await updateEmployeePermissions(employeeData.email, {
          role: employeeData.role,
          permissions: employeeData.permissions,
          position: employeeData.position,
          department: employeeData.department
        });
        console.log('✅ Employee synced to Firebase successfully');
      } catch (firebaseError) {
        console.warn('⚠️ Firebase sync failed (non-critical):', firebaseError);
        // Continue - Supabase creation was successful
      }

      // 3. Refresh the employee list
      await fetchEmployees();

      toast({
        title: "Success",
        description: `Employee ${employeeData.name} created successfully`,
      });

      return newEmployee;
    } catch (error) {
      console.error('❌ Error creating employee:', error);
      toast({
        title: "Error",
        description: "Failed to create employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<UnifiedEmployee>) => {
    console.log('🔍 Update employee called with:', { id, updates });
    console.log('🔍 Can manage employees:', canManageEmployees());
    
    if (!canManageEmployees()) {
      const errorMsg = "You don't have permission to update employees";
      console.error('❌ Access denied:', errorMsg);
      toast({
        title: "Access Denied",
        description: errorMsg,
        variant: "destructive"
      });
      throw new Error("Access denied");
    }

    try {
      console.log('📝 Updating employee:', id, 'with updates:', updates);
      
      const employee = employees.find(emp => emp.id === id);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // 1. Update in Supabase first (primary database)
      const { error: supabaseError } = await supabase
        .from('employees')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

      console.log('✅ Employee updated in Supabase');

      // 2. Sync to Firebase if permission/role data changed
      if (updates.role || updates.permissions || updates.position || updates.department) {
        try {
          await updateEmployeePermissions(employee.email, {
            role: updates.role || employee.role,
            permissions: updates.permissions || employee.permissions,
            position: updates.position || employee.position,
            department: updates.department || employee.department
          });
          console.log('✅ Employee permissions synced to Firebase');
        } catch (firebaseError) {
          console.warn('⚠️ Firebase sync failed (non-critical):', firebaseError);
          // Continue - Supabase update was successful
        }
      }

      // 3. Refresh the employee list
      await fetchEmployees();

      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!isAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete employees",
        variant: "destructive"
      });
      throw new Error("Access denied");
    }

    try {
      console.log('🗑️ Deleting employee:', id);

      // Delete from Supabase (primary database)
      const { error: supabaseError } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

      console.log('✅ Employee deleted from Supabase');

      // Note: Firebase cleanup will be handled by the sync mechanism
      // or can be done manually via the admin interface if needed

      // Refresh the employee list
      await fetchEmployees();

      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Search function
  const searchEmployees = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(lowercaseQuery) ||
      emp.email.toLowerCase().includes(lowercaseQuery) ||
      emp.position.toLowerCase().includes(lowercaseQuery) ||
      emp.department.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Get employee by email
  const getEmployeeByEmail = (email: string) => {
    return employees.find(emp => 
      emp.email.toLowerCase() === email.toLowerCase()
    );
  };

  // Calculate daily salary for an employee
  const calculateDailySalary = (monthlySalary: number) => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round((monthlySalary / daysInMonth) * 100) / 100; // Round to 2 decimal places
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return {
    employees,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    getEmployeeByEmail,
    calculateDailySalary,
    refetch: fetchEmployees,
    // Stats for debugging
    stats: {
      total: employees.length,
      activeEmployees: employees.filter(e => e.status === 'Active').length,
      withSalary: employees.filter(e => e.salary > 0).length,
      withAuthId: employees.filter(e => e.auth_user_id).length
    }
  };
};