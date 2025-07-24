import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface Employee {
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
  address?: string;
  emergency_contact?: string;
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ requiresPasswordChange?: boolean }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canManageEmployees: () => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Main admin account
const MAIN_ADMIN_EMAIL = 'kelvifauza@gmail.com';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployeeData = async (userEmail: string): Promise<Employee | null> => {
    try {
      console.log('Fetching employee data for:', userEmail);

      // Check if this is the main admin account
      if (userEmail === MAIN_ADMIN_EMAIL) {
        return {
          id: 'main-admin',
          name: 'Main Administrator',
          email: userEmail,
          position: 'System Administrator',
          department: 'Administration',
          salary: 0,
          role: 'Administrator',
          permissions: ['*'],
          status: 'Active',
          join_date: new Date().toISOString()
        };
      }

      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', userEmail.toLowerCase())
        .limit(1);

      if (error) {
        console.error('Error fetching employee:', error);
        return null;
      }

      if (employees && employees.length > 0) {
        console.log('Found employee:', employees[0]);
        return employees[0] as Employee;
      }

      console.log('No employee record found, creating default one');
      
      // Create default employee record
      const { data: newEmployee, error: createError } = await supabase
        .from('employees')
        .insert([{
          name: userEmail.split('@')[0],
          email: userEmail.toLowerCase(),
          position: 'Staff',
          department: 'General',
          salary: 0,
          role: 'User',
          permissions: ['General Access'],
          status: 'Active'
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating employee record:', createError);
        return null;
      }

      return newEmployee as Employee;
    } catch (error) {
      console.error('Error in fetchEmployeeData:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign in with:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      if (data.user) {
        const employeeData = await fetchEmployeeData(data.user.email!);
        
        if (!employeeData) {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "No employee record found. Contact your administrator.",
            variant: "destructive"
          });
          return {};
        }

        setEmployee(employeeData);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${employeeData.name}!`
        });
      }

      return {};
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setEmployee(null);
      toast({
        title: "Success",
        description: "Signed out successfully"
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!employee) return false;
    if (employee.permissions?.includes('*')) return true;
    return employee.permissions?.includes(permission) || employee.role === 'Administrator';
  };

  const hasRole = (role: string): boolean => {
    return employee?.role === role;
  };

  const canManageEmployees = (): boolean => {
    return hasRole('Administrator') || hasPermission('Human Resources');
  };

  const isAdmin = (): boolean => {
    return hasRole('Administrator');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchEmployeeData(session.user.email!).then(setEmployee);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const employeeData = await fetchEmployeeData(session.user.email!);
        setEmployee(employeeData);
      } else {
        setEmployee(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    employee,
    loading,
    signIn,
    signOut,
    hasPermission,
    hasRole,
    canManageEmployees,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};