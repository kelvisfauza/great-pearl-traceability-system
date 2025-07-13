
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  employee_id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  role: string;
  permissions: string[];
  address?: string;
  emergency_contact?: string;
  join_date?: string;
  status?: string;
  salary?: number;
  id: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  fetchEmployeeData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployeeData = async () => {
    if (!session?.user) {
      console.log('No session user available for employee fetch');
      setEmployee(null);
      return;
    }
    
    try {
      console.log('Fetching employee data for user:', session.user.id);
      
      // Use the new function to get current employee data
      const { data, error } = await supabase.rpc('get_current_employee');
      
      if (error) {
        console.error('Error fetching employee data:', error);
        
        // Fallback: try to find employee by email if the profile link doesn't exist yet
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle();
        
        if (employeeError) {
          console.error('Fallback employee fetch error:', employeeError);
          setEmployee(null);
          return;
        }
        
        if (employeeData) {
          // Try to create the profile link
          const { error: linkError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: session.user.id,
              employee_id: employeeData.id
            });
          
          if (linkError) {
            console.error('Error creating user profile link:', linkError);
          }
          
          setEmployee({
            id: employeeData.id,
            employee_id: employeeData.employee_id || employeeData.id,
            name: employeeData.name,
            email: employeeData.email,
            phone: employeeData.phone,
            position: employeeData.position,
            department: employeeData.department,
            role: employeeData.role,
            permissions: employeeData.permissions,
            address: employeeData.address,
            emergency_contact: employeeData.emergency_contact,
            join_date: employeeData.join_date,
            status: employeeData.status,
            salary: employeeData.salary
          });
        } else {
          console.log('No employee record found for email:', session.user.email);
          setEmployee(null);
        }
        return;
      }
      
      console.log('Employee data from function:', data);
      
      if (data && data.length > 0) {
        const employeeData = data[0];
        setEmployee({
          id: employeeData.employee_id,
          employee_id: employeeData.employee_id,
          name: employeeData.name,
          email: employeeData.email,
          phone: employeeData.phone,
          position: employeeData.position,
          department: employeeData.department,
          role: employeeData.role,
          permissions: employeeData.permissions,
          address: employeeData.address,
          emergency_contact: employeeData.emergency_contact,
          join_date: employeeData.join_date,
          status: employeeData.status,
          salary: employeeData.salary
        });
      } else {
        console.log('No employee profile found for user:', session.user.id);
        setEmployee(null);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      setEmployee(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            fetchEmployeeData();
          }, 0);
        } else {
          setEmployee(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchEmployeeData();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Add effect to refetch employee data when session changes
  useEffect(() => {
    if (session?.user && !employee) {
      console.log('Session exists but no employee data, refetching...');
      fetchEmployeeData();
    }
  }, [session, employee]);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with email:', email);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      console.log('Sign in successful');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Please check your email to confirm your account"
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmployee(null);
  };

  const hasPermission = (permission: string): boolean => {
    return employee?.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    return employee?.role === role || false;
  };

  const value = {
    user,
    session,
    employee,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasRole,
    fetchEmployeeData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
