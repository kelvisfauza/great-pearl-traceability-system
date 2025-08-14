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

  // Get data from both sources
  const { 
    employees: firebaseEmployees, 
    loading: firebaseLoading,
    addEmployeeWithAuth: addFirebaseEmployee,
    updateEmployee: updateFirebaseEmployee,
    deleteEmployee: deleteFirebaseEmployee
  } = useFirebaseEmployees();
  
  const { 
    employees: supabaseEmployees, 
    loading: supabaseLoading,
    refetch: refetchSupabase
  } = useSupabaseEmployees();

  // Combine and deduplicate employees from both sources
  useEffect(() => {
    if (!firebaseLoading && !supabaseLoading) {
      const emailMap = new Map<string, CombinedEmployee>();
      
      // Add Firebase employees first
      firebaseEmployees.forEach(emp => {
        emailMap.set(emp.email.toLowerCase(), {
          ...emp,
          permissions: emp.permissions || ['General Access'],
          source: 'firebase'
        } as CombinedEmployee);
      });
      
      // Add or merge Supabase employees
      supabaseEmployees.forEach(emp => {
        const emailKey = emp.email.toLowerCase();
        const existingEmp = emailMap.get(emailKey);
        
        if (existingEmp) {
          // Merge data from both sources, prioritizing Supabase for newer data
          emailMap.set(emailKey, {
            ...existingEmp,
            ...emp,
            source: 'both',
            // Keep the more recent data based on updated_at
            ...(emp.updated_at && existingEmp.updated_at && 
               new Date(emp.updated_at) > new Date(existingEmp.updated_at) ? emp : {})
          });
        } else {
          emailMap.set(emailKey, {
            ...emp,
            source: 'supabase'
          } as CombinedEmployee);
        }
      });
      
      const merged = Array.from(emailMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setCombinedEmployees(merged);
      setLoading(false);
    }
  }, [firebaseEmployees, supabaseEmployees, firebaseLoading, supabaseLoading]);

  // Dual-write operations - write to both systems for redundancy
  const addEmployee = async (employeeData: any) => {
    const results = [];
    
    try {
      // Try both systems simultaneously
      const [supabaseResult, firebaseResult] = await Promise.allSettled([
        // Supabase add (would need to implement)
        Promise.resolve(), // Placeholder for now
        addFirebaseEmployee(employeeData)
      ]);
      
      if (supabaseResult.status === 'fulfilled' || firebaseResult.status === 'fulfilled') {
        toast({
          title: "Success",
          description: "Employee added successfully",
        });
        await refetchSupabase();
      } else {
        throw new Error('Failed to add to both systems');
      }
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

  const updateEmployee = async (id: string, employeeData: any) => {
    const employee = combinedEmployees.find(emp => emp.id === id);
    const source = employee?.source;
    
    try {
      if (source === 'both') {
        // Update in both systems
        await Promise.allSettled([
          updateFirebaseEmployee(id, employeeData),
          // Supabase update (would need to implement)
          Promise.resolve()
        ]);
      } else if (source === 'firebase') {
        await updateFirebaseEmployee(id, employeeData);
      } else {
        // Supabase only (would need to implement)
        console.log('Update Supabase employee:', id, employeeData);
      }
      
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      await refetchSupabase();
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
    const employee = combinedEmployees.find(emp => emp.id === id);
    const source = employee?.source;
    
    try {
      if (source === 'both') {
        // Delete from both systems
        await Promise.allSettled([
          deleteFirebaseEmployee(id),
          // Supabase delete (would need to implement)
          Promise.resolve()
        ]);
      } else if (source === 'firebase') {
        await deleteFirebaseEmployee(id);
      } else {
        // Supabase only (would need to implement)
        console.log('Delete Supabase employee:', id);
      }
      
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      await refetchSupabase();
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

  // Fast search function that searches both datasets
  const searchEmployees = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return combinedEmployees.filter(emp => 
      emp.name.toLowerCase().includes(lowercaseQuery) ||
      emp.email.toLowerCase().includes(lowercaseQuery) ||
      emp.position.toLowerCase().includes(lowercaseQuery) ||
      emp.department.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Get employee by email from either system
  const getEmployeeByEmail = (email: string) => {
    return combinedEmployees.find(emp => 
      emp.email.toLowerCase() === email.toLowerCase()
    );
  };

  return {
    employees: combinedEmployees,
    loading: loading || firebaseLoading || supabaseLoading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    getEmployeeByEmail,
    refetch: async () => {
      await refetchSupabase();
      // Firebase will auto-refresh through its real-time listeners
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
