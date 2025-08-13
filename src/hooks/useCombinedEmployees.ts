import { useState, useEffect } from 'react';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import { useSupabaseEmployees, Employee } from '@/hooks/useSupabaseEmployees';
import { useToast } from '@/hooks/use-toast';

export const useCombinedEmployees = () => {
  const [combinedEmployees, setCombinedEmployees] = useState<Employee[]>([]);
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
    addEmployee: addSupabaseEmployee,
    updateEmployee: updateSupabaseEmployee,
    deleteEmployee: deleteSupabaseEmployee,
    refetch: refetchSupabase
  } = useSupabaseEmployees();

  // Combine and deduplicate employees from both sources
  useEffect(() => {
    if (!firebaseLoading && !supabaseLoading) {
      const emailMap = new Map<string, Employee>();
      
      // Add Supabase employees first (giving them priority)
      supabaseEmployees.forEach(emp => {
        emailMap.set(emp.email.toLowerCase(), {
          ...emp,
          source: 'supabase'
        } as Employee & { source: string });
      });
      
      // Add Firebase employees if they don't exist in Supabase
      firebaseEmployees.forEach(emp => {
        const emailKey = emp.email.toLowerCase();
        if (!emailMap.has(emailKey)) {
          emailMap.set(emailKey, {
            ...emp,
            source: 'firebase'
          } as Employee & { source: string });
        }
      });
      
      const merged = Array.from(emailMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setCombinedEmployees(merged);
      setLoading(false);
    }
  }, [firebaseEmployees, supabaseEmployees, firebaseLoading, supabaseLoading]);

  // Combined operations - prefer Supabase for new operations
  const addEmployee = async (employeeData: any) => {
    try {
      // Try Supabase first
      await addSupabaseEmployee(employeeData);
    } catch (error) {
      console.error('Failed to add to Supabase, trying Firebase:', error);
      try {
        await addFirebaseEmployee(employeeData);
      } catch (firebaseError) {
        console.error('Failed to add to both sources:', firebaseError);
        toast({
          title: "Error",
          description: "Failed to add employee to both systems",
          variant: "destructive"
        });
        throw firebaseError;
      }
    }
  };

  const updateEmployee = async (id: string, employeeData: any) => {
    // Find which source this employee belongs to
    const employee = combinedEmployees.find(emp => emp.id === id);
    const source = (employee as any)?.source;
    
    try {
      if (source === 'supabase') {
        await updateSupabaseEmployee(id, employeeData);
      } else {
        await updateFirebaseEmployee(id, employeeData);
      }
    } catch (error) {
      console.error('Failed to update employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    // Find which source this employee belongs to
    const employee = combinedEmployees.find(emp => emp.id === id);
    const source = (employee as any)?.source;
    
    try {
      if (source === 'supabase') {
        await deleteSupabaseEmployee(id);
      } else {
        await deleteFirebaseEmployee(id);
      }
    } catch (error) {
      console.error('Failed to delete employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    employees: combinedEmployees,
    loading: loading || firebaseLoading || supabaseLoading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: () => {
      refetchSupabase();
      // Firebase hook doesn't expose refetch, but it will auto-update
    }
  };
};