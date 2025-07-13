import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  salary: number;
  employee_id?: string;
  address?: string;
  emergency_contact?: string;
  role: string;
  permissions: string[];
  status: string;
  join_date: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canManageEmployees: () => boolean;
  isAdmin: () => boolean;
  fetchEmployeeData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const logSecurityEvent = async (action: string, tableName: string, recordId?: string, oldValues?: any, newValues?: any) => {
    try {
      if (!user) return;
      
      // Use any to bypass TypeScript type checking for the new table
      await (supabase as any)
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action,
          table_name: tableName,
          record_id: recordId,
          old_values: oldValues,
          new_values: newValues
        });
    } catch (error) {
      console.error('Security logging error:', error);
    }
  };

  const fetchEmployeeData = async () => {
    if (!user?.id) return;

    try {
      // First check if user profile exists and get linked employee
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('user_profiles')
        .select(`
          employee_id,
          employees (*)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        
        // If no profile exists, try to find employee by email and create link
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (employeeError) {
          console.error('Error fetching employee by email:', employeeError);
          return;
        }

        if (employeeData) {
          // Create user profile link
          const { error: linkError } = await (supabase as any)
            .from('user_profiles')
            .insert({
              user_id: user.id,
              employee_id: employeeData.id
            });

          if (linkError) {
            console.error('Error creating user profile link:', linkError);
          } else {
            setEmployee(employeeData as Employee);
          }
        }
      } else if (profileData?.employees) {
        setEmployee(profileData.employees as Employee);
      }
    } catch (error) {
      console.error('Error in fetchEmployeeData:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        await logSecurityEvent('user_login', 'auth', data.user.id);
      }

      toast({
        title: "Success",
        description: "Signed in successfully"
      });
    } catch (error: any) {
      await logSecurityEvent('failed_login', 'auth', undefined, { email });
      console.error('Sign in error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      if (data.user) {
        await logSecurityEvent('user_signup', 'auth', data.user.id, null, { email });
      }

      toast({
        title: "Success",
        description: "Account created successfully"
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await logSecurityEvent('user_logout', 'auth', user?.id);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

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
        description: error.message || "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const hasPermission = (permission: string): boolean => {
    return employee?.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    return employee?.role === role || false;
  };

  const canManageEmployees = (): boolean => {
    return hasRole('Administrator') || hasPermission('Human Resources');
  };

  const isAdmin = (): boolean => {
    return hasRole('Administrator');
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          setEmployee(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      fetchEmployeeData();
    }
  }, [user, loading]);

  const value = {
    user,
    employee,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasRole,
    canManageEmployees,
    isAdmin,
    fetchEmployeeData
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
