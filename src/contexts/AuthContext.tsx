
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
  isAdmin: () => boolean;
  canManageEmployees: () => boolean;
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
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const fetchEmployeeData = async () => {
    const currentSession = await supabase.auth.getSession();
    if (!currentSession.data.session?.user) {
      console.log('No session user available for employee fetch');
      setEmployee(null);
      return;
    }
    
    try {
      console.log('Fetching employee data for user:', currentSession.data.session.user.id);
      
      // First, try to find employee by email
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', currentSession.data.session.user.email)
        .maybeSingle();
      
      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        toast({
          title: "Access Error",
          description: "Unable to load your employee profile. Please contact your administrator.",
          variant: "destructive"
        });
        setEmployee(null);
        return;
      }
      
      if (employeeData) {
        console.log('Employee data found:', employeeData.name);
        setEmployee({
          id: employeeData.id,
          employee_id: employeeData.employee_id || employeeData.id,
          name: employeeData.name,
          email: employeeData.email,
          role: employeeData.role,
          permissions: employeeData.permissions || [],
          department: employeeData.department,
          position: employeeData.position,
          phone: employeeData.phone,
          address: employeeData.address,
          emergency_contact: employeeData.emergency_contact,
          join_date: employeeData.join_date,
          status: employeeData.status,
          salary: employeeData.salary,
        });
      } else {
        console.log('No employee record found for user:', currentSession.data.session.user.email);
        toast({
          title: "Account Setup Required",
          description: "Your account is not linked to an employee record. Please contact your administrator.",
          variant: "destructive"
        });
        setEmployee(null);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast({
        title: "System Error",
        description: "A system error occurred. Please try again later.",
        variant: "destructive"
      });
      setEmployee(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          console.log('Initial session check:', initialSession?.user?.email || 'No session');
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            await fetchEmployeeData();
          }
          
          setIsInitialized(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted || !isInitialized) return;
        
        console.log('Auth state changed:', event, newSession?.user?.email || 'No session');
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user && event !== 'TOKEN_REFRESHED') {
          await fetchEmployeeData();
        } else if (!newSession?.user) {
          setEmployee(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Input validation
    if (!email || !password) {
      const error = { message: "Email and password are required" };
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = { message: "Please enter a valid email address" };
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }

    console.log('Attempting to sign in with email:', email);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      let errorMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Please check your email and click the confirmation link.";
      }
      
      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      console.log('Sign in successful');
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully."
      });
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    // Input validation
    if (!email || !password) {
      const error = { message: "Email and password are required" };
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }

    // Password strength validation
    if (password.length < 8) {
      const error = { message: "Password must be at least 8 characters long" };
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('User already registered')) {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      }
      
      toast({
        title: "Sign Up Error",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Account Created",
        description: "Please check your email to confirm your account. You may need to contact your administrator to link your account to an employee record."
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setEmployee(null);
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully."
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "There was an error signing out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!employee) return false;
    return employee.permissions?.includes(permission) || 
           employee.role === 'Administrator' || 
           employee.role === 'Manager';
  };

  const hasRole = (role: string): boolean => {
    if (!employee) return false;
    return employee.role === role;
  };

  const isAdmin = (): boolean => {
    return hasRole('Administrator');
  };

  const canManageEmployees = (): boolean => {
    return isAdmin() || hasPermission('Human Resources');
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
    isAdmin,
    canManageEmployees,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
