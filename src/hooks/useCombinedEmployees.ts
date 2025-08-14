import { useState, useEffect } from 'react';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import { useSupabaseEmployees } from '@/hooks/useSupabaseEmployees';
import { useToast } from '@/hooks/use-toast';

// Unified Employee interface that works with both systems
export interface CombinedEmployee {
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
  source?: 'firebase' | 'supabase' | 'both';
}

export const useCombinedEmployees = () => {
  const [combinedEmployees, setCombinedEmployees] = useState<CombinedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Primary: Firebase (more reliable for role management)
  const { 
    employees: firebaseEmployees, 
    loading: firebaseLoading,
    addEmployeeWithAuth: addFirebaseEmployee,
    updateEmployee: updateFirebaseEmployee,
    deleteEmployee: deleteFirebaseEmployee
  } = useFirebaseEmployees();
  
  // Secondary: Supabase (for data sync)
  const { 
    employees: supabaseEmployees, 
    loading: supabaseLoading,
    refetch: refetchSupabase
  } = useSupabaseEmployees();

  // Prioritize Firebase data, supplement with Supabase
  useEffect(() => {
    if (!firebaseLoading) {
      console.log('🔥 Firebase employees loaded:', firebaseEmployees.length);
      
      // Use Firebase as primary data source
      const emailMap = new Map<string, CombinedEmployee>();
      
      // Add Firebase employees first (they have priority)
      firebaseEmployees.forEach(emp => {
        emailMap.set(emp.email.toLowerCase(), {
          ...emp,
          permissions: emp.permissions || ['General Access'],
          source: 'firebase'
        } as CombinedEmployee);
      });
      
      // Add Supabase employees only if not in Firebase
      if (!supabaseLoading) {
        console.log('📊 Supabase employees loaded:', supabaseEmployees.length);
        
        supabaseEmployees.forEach(emp => {
          const emailKey = emp.email.toLowerCase();
          const existingEmp = emailMap.get(emailKey);
          
          if (existingEmp) {
            // Mark as existing in both systems
            emailMap.set(emailKey, {
              ...existingEmp,
              source: 'both'
            });
          } else {
            // Only in Supabase
            emailMap.set(emailKey, {
              ...emp,
              source: 'supabase'
            } as CombinedEmployee);
          }
        });
      }
      
      const merged = Array.from(emailMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      console.log('👥 Combined employees:', merged.length);
      setCombinedEmployees(merged);
      setLoading(false);
    }
  }, [firebaseEmployees, supabaseEmployees, firebaseLoading, supabaseLoading]);

  // Use Firebase for all employee operations (more reliable)
  const addEmployee = async (employeeData: any) => {
    try {
      console.log('➕ Adding employee via Firebase...');
      await addFirebaseEmployee(employeeData);
      
      toast({
        title: "Success",
        description: "Employee added successfully",
      });
      
      // Optional: Try to sync to Supabase
      await refetchSupabase();
    } catch (error) {
      console.error('❌ Error adding employee:', error);
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateEmployee = async (id: string, employeeData: any) => {
    try {
      console.log('📝 Updating employee via Firebase...', id);
      await updateFirebaseEmployee(id, employeeData);
      
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      
      // Optional: Try to sync to Supabase
      await refetchSupabase();
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
    try {
      console.log('🗑️ Deleting employee via Firebase...', id);
      await deleteFirebaseEmployee(id);
      
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      
      // Optional: Try to sync to Supabase
      await refetchSupabase();
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

  // Fast search function
  const searchEmployees = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return combinedEmployees.filter(emp => 
      emp.name.toLowerCase().includes(lowercaseQuery) ||
      emp.email.toLowerCase().includes(lowercaseQuery) ||
      emp.position.toLowerCase().includes(lowercaseQuery) ||
      emp.department.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Get employee by email
  const getEmployeeByEmail = (email: string) => {
    return combinedEmployees.find(emp => 
      emp.email.toLowerCase() === email.toLowerCase()
    );
  };

  return {
    employees: combinedEmployees,
    loading: loading || firebaseLoading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    getEmployeeByEmail,
    refetch: async () => {
      // Firebase will auto-refresh through real-time listeners
      await refetchSupabase();
    },
    // Stats for debugging
    stats: {
      total: combinedEmployees.length,
      firebaseOnly: combinedEmployees.filter(e => e.source === 'firebase').length,
      supabaseOnly: combinedEmployees.filter(e => e.source === 'supabase').length,
      both: combinedEmployees.filter(e => e.source === 'both').length
    }
  };
};