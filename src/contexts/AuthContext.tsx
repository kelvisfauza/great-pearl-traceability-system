import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
  role: string;
  permissions: string[];
  status: string;
  join_date: string;
  address?: string;
  emergency_contact?: string;
  avatar_url?: string;
  isOneTimePassword?: boolean;
  mustChangePassword?: boolean;
  authUserId?: string;
  employee_id?: string;
  is_training_account?: boolean;
  training_progress?: number;
  created_at?: string;
  updated_at?: string;
  disabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ requiresPasswordChange?: boolean }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canManageEmployees: () => boolean;
  isAdmin: () => boolean;
  fetchEmployeeData: (userId?: string) => Promise<Employee | null>;
  changePassword: (newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin accounts that bypass employee record checks
const ADMIN_EMAILS = ['kelvifauza@gmail.com'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  console.log('🔥 AuthProvider - current user:', user?.id, user?.email);

  const fetchEmployeeData = async (userId?: string, userEmail?: string): Promise<Employee | null> => {
    const targetUserId = userId || user?.id;
    const email = userEmail || user?.email;
    
    if (!email || !targetUserId) {
      console.log('❌ fetchEmployeeData - missing user data');
      return null;
    }

    // Normalize email consistently
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('🔍 Checking user:', normalizedEmail);

    // HARDCODED MAIN ADMIN - No database lookup needed
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      console.log('🔧 MAIN ADMIN DETECTED - Hardcoded permissions');
      const mainAdminProfile: Employee = {
        id: 'main-admin',
        name: 'Main Administrator',
        email: normalizedEmail,
        position: 'System Administrator',
        department: 'Administration',
        salary: 0,
        role: 'Administrator',
        permissions: ['*'], // All permissions - hardcoded
        status: 'Active',
        join_date: new Date().toISOString(),
        isOneTimePassword: false,
        mustChangePassword: false,
        authUserId: targetUserId
      };
      return mainAdminProfile;
    }

    // For other users, check database
    try {
      // Try to get from Supabase using auth_user_id first
      let { data: employeeData, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', targetUserId)
        .maybeSingle();

      // If not found by auth_user_id, try by email
      if (!employeeData && !error) {
        const { data: emailData, error: emailError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        employeeData = emailData;
        error = emailError;
      }

      if (employeeData) {
        console.log('✅ Found employee record:', employeeData.name);
        
        const employee: Employee = {
          id: employeeData.id,
          name: employeeData.name,
          email: employeeData.email,
          phone: employeeData.phone || '',
          position: employeeData.position,
          department: employeeData.department,
          salary: employeeData.salary || 0,
          role: employeeData.role,
          permissions: employeeData.permissions || ['General Access'],
          status: employeeData.status,
          join_date: employeeData.join_date,
          address: employeeData.address,
          emergency_contact: employeeData.emergency_contact,
          isOneTimePassword: false,
          mustChangePassword: false,
          authUserId: targetUserId,
          disabled: employeeData.disabled || false
        };

        return employee;
      }

      console.log('❌ No employee record found for:', normalizedEmail);
      return null;
    } catch (error) {
      console.error('Error fetching employee data:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting Supabase login for:', email);

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (error) {
        console.error('❌ Supabase login failed:', error);
        toast({
          title: "Login Failed",
          description: error.message || "Invalid email or password",
          variant: "destructive"
        });
        throw error;
      }

      if (!data.user) {
        throw new Error('No user returned from authentication');
      }

      console.log('✅ Supabase login successful for:', data.user.email);

      // Set user and session immediately
      setUser(data.user);
      setSession(data.session);

      // Fetch employee data
      const employeeData = await fetchEmployeeData(data.user.id);
      
      if (employeeData) {
        setEmployee(employeeData);
        console.log('✅ Employee data loaded:', employeeData.name);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${employeeData.name}!`
        });
      } else {
        console.log('⚠️ No employee record found, creating basic user');
        // Create a basic user record
        const basicEmployee: Employee = {
          id: data.user.id,
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          position: 'Staff',
          department: 'General',
          salary: 0,
          role: 'User',
          permissions: ['General Access'],
          status: 'Active',
          join_date: new Date().toISOString(),
          isOneTimePassword: false,
          mustChangePassword: false,
          authUserId: data.user.id
        };
        
        setEmployee(basicEmployee);
        
        toast({
          title: "Welcome!",
          description: "Please contact HR to complete your profile setup.",
        });
      }

      return {};
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: error.message || "An error occurred during login",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Signing out user');
      
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setEmployee(null);
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out"
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign Out Error",
        description: error.message || "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  // Set up Supabase auth state listener
  useEffect(() => {
    console.log('🎯 Setting up Supabase auth listener');
    let isMounted = true;
    let profileTimeout: NodeJS.Timeout;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          // Clear any existing timeout
          if (profileTimeout) clearTimeout(profileTimeout);
          
          // Set a timeout to prevent infinite loading
          profileTimeout = setTimeout(() => {
            if (isMounted) {
              console.log('⏰ Profile loading timeout, setting loading to false');
              setLoading(false);
            }
          }, 5000); // 5 second timeout
          
          // Fetch employee data - pass email from session
          fetchEmployeeData(session.user.id, session.user.email)
            .then(employeeData => {
              if (isMounted) {
                console.log('✅ Employee data loaded:', employeeData?.name || 'No employee');
                setEmployee(employeeData);
                setLoading(false);
                if (profileTimeout) clearTimeout(profileTimeout);
              }
            })
            .catch(error => {
              console.error('❌ Error fetching employee data:', error);
              if (isMounted) {
                setEmployee(null);
                setLoading(false);
                if (profileTimeout) clearTimeout(profileTimeout);
              }
            });
        } else {
          if (isMounted) {
            setUser(null);
            setSession(null);
            setEmployee(null);
            setLoading(false);
            if (profileTimeout) clearTimeout(profileTimeout);
          }
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🎯 Initial session check:', session?.user?.email);
      
      if (!isMounted) return;
      
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        
        // Set timeout for initial load too
        profileTimeout = setTimeout(() => {
          if (isMounted) {
            console.log('⏰ Initial profile loading timeout');
            setLoading(false);
          }
        }, 5000);
        
        // Fetch employee data - pass email from session
        fetchEmployeeData(session.user.id, session.user.email)
          .then(employeeData => {
            if (isMounted) {
              console.log('✅ Initial employee data loaded:', employeeData?.name || 'No employee');
              setEmployee(employeeData);
              setLoading(false);
              if (profileTimeout) clearTimeout(profileTimeout);
            }
          })
          .catch(error => {
            console.error('❌ Error fetching initial employee data:', error);
            if (isMounted) {
              setEmployee(null);
              setLoading(false);
              if (profileTimeout) clearTimeout(profileTimeout);
            }
          });
      } else {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      if (profileTimeout) clearTimeout(profileTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!employee) return false;
    if (employee.permissions?.includes('*')) return true;
    return employee.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    return employee?.role === role || false;
  };

  const canManageEmployees = (): boolean => {
    return hasRole('Administrator') || hasRole('Manager') || hasPermission('Human Resources');
  };

  const isAdmin = (): boolean => {
    return hasRole('Administrator');
  };

  const changePassword = async (newPassword: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated"
      });
    } catch (error: any) {
      toast({
        title: "Password Update Failed", 
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    employee,
    loading,
    signIn,
    signOut,
    hasPermission,
    hasRole,
    canManageEmployees,
    isAdmin,
    fetchEmployeeData,
    changePassword
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