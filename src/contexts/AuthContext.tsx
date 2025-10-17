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
  last_notified_role?: string;
  role_notification_shown_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ requiresPasswordChange?: boolean }>;
  signOut: (reason?: 'inactivity' | 'manual') => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canManageEmployees: () => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isAdministrator: () => boolean;
  isManager: () => boolean;
  isSupervisor: () => boolean;
  isUser: () => boolean;
  canPerformAction: (action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'print' | 'export') => boolean;
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

  // Function to force refresh employee data
  const refreshEmployeeData = async () => {
    if (user) {
      console.log('🔄 Force refreshing employee data for:', user.email);
      const freshEmployeeData = await fetchEmployeeData(user.id, user.email);
      setEmployee(freshEmployeeData);
    }
  };

  // Set up real-time subscription for employee changes
  useEffect(() => {
    if (!user?.email) return;

    console.log('👂 Setting up real-time subscription for employee changes:', user.email);
    
    const channel = supabase
      .channel('employee-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employees',
          filter: `email=eq.${user.email}`
        },
        (payload) => {
          console.log('🔔 Employee data changed, refreshing...', payload);
          refreshEmployeeData();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from employee changes');
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const fetchEmployeeData = async (userId?: string, userEmail?: string): Promise<Employee | null> => {
    const targetUserId = userId || user?.id;
    const email = userEmail || user?.email;
    
    if (!email || !targetUserId) {
      return null;
    }

    // Normalize email consistently
    const normalizedEmail = email.toLowerCase().trim();
    
    // HARDCODED MAIN ADMIN - No database lookup needed
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
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

    console.log('🔍 fetchEmployeeData called for user:', { targetUserId, normalizedEmail });
    try {
      // Try to get from Supabase using auth_user_id first
      console.log('🔍 Searching by auth_user_id:', targetUserId);
      let { data: employeeData, error } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', targetUserId)
        .maybeSingle();
      
      console.log('📊 Supabase auth_user_id query result:', { employeeData, error });

      // If not found by auth_user_id, try by email
      if (!employeeData && !error) {
        console.log('🔍 Searching by email:', normalizedEmail);
        const { data: emailData, error: emailError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        console.log('📊 Supabase email query result:', { emailData, emailError });
        employeeData = emailData;
        error = emailError;
      }

      if (employeeData) {
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
          avatar_url: employeeData.avatar_url,
          isOneTimePassword: false,
          mustChangePassword: false,
          authUserId: employeeData.auth_user_id || targetUserId, // Use auth_user_id from database
          disabled: employeeData.disabled || false
        };

        return employee;
      }

      // If no employee record found, create a basic user profile
      const basicEmployee: Employee = {
        id: targetUserId,
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
        authUserId: targetUserId
      };
      
      return basicEmployee;
    } catch (error) {
      console.error('Error fetching employee data:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (error) {
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

  const signOut = async (reason?: 'inactivity' | 'manual'): Promise<void> => {
    try {
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setEmployee(null);
      
      toast({
        title: "Logged Out",
        description: reason === 'inactivity' 
          ? "You have been logged out due to inactivity" 
          : "You have been successfully logged out"
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

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST - CRITICAL: No async operations here
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('🔥 Auth state change:', { event, user: session?.user?.email, hasSession: !!session });
        
        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer employee data fetching with setTimeout to prevent deadlock
        if (session?.user) {
          console.log('👤 User authenticated, fetching employee data for:', session.user.email);
          setTimeout(() => {
            if (mounted) {
              fetchEmployeeData(session.user.id, session.user.email)
                .then(employeeData => {
                  console.log('✅ Employee data fetched successfully:', employeeData);
                  if (mounted) {
                    setEmployee(employeeData);
                    setLoading(false);
                  }
                })
                .catch(error => {
                  console.error('❌ Error fetching employee data:', error);
                  if (mounted) {
                    setEmployee(null);
                    setLoading(false);
                  }
                });
            }
          }, 0);
        } else {
          console.log('🚫 No user session, clearing employee data');
          // No user - clear everything immediately
          setEmployee(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchEmployeeData(session.user.id, session.user.email)
          .then(employeeData => {
            if (mounted) {
              setEmployee(employeeData);
              setLoading(false);
            }
          })
          .catch(error => {
            console.error('Error fetching employee data:', error);
            if (mounted) {
              setEmployee(null);
              setLoading(false);
            }
          });
      } else {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!employee) return false;
    if (employee.permissions?.includes('*')) return true;
    
    // Check for wildcard permission first
    if (employee.permissions?.includes('*')) return true;
    
    // If checking for a specific action (e.g., "Finance:create")
    // require exact match
    if (permission.includes(':')) {
      return employee.permissions?.includes(permission) || false;
    }
    
    // For module-level checks (e.g., "Finance")
    // Allow if user has ANY granular permission for that module OR the module itself
    if (employee.permissions?.includes(permission)) return true;
    
    // Check for granular permissions (e.g., "Finance:view" should grant "Finance" access)
    const hasGranularPermission = employee.permissions?.some(p => 
      p.startsWith(permission + ':')
    );
    
    return hasGranularPermission || false;
  };

  const hasRole = (role: string): boolean => {
    return employee?.role === role || false;
  };

  const canManageEmployees = (): boolean => {
    return hasRole('Super Admin') || hasRole('Manager') || hasRole('Administrator') || hasPermission('Human Resources') || hasPermission('HR');
  };

  // Super Admin = Full system access (only you)
  const isSuperAdmin = (): boolean => {
    return hasRole('Super Admin');
  };

  // Administrator = Can approve but has limited access
  const isAdministrator = (): boolean => {
    return hasRole('Administrator');
  };

  // Manager = Can approve, print, delete but not system admin
  const isManager = (): boolean => {
    return hasRole('Manager');
  };

  // Supervisor = More tasks but limited permissions
  const isSupervisor = (): boolean => {
    return hasRole('Supervisor');
  };

  // User = Basic data entry only
  const isUser = (): boolean => {
    return hasRole('User');
  };

  // Legacy isAdmin for backwards compatibility - checks if Super Admin or Administrator
  const isAdmin = (): boolean => {
    return isSuperAdmin() || isAdministrator();
  };

  // Check if user can perform specific action based on role hierarchy
  const canPerformAction = (action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'print' | 'export'): boolean => {
    if (!employee) return false;
    
    const role = employee.role;
    
    // Super Admin can do everything
    if (role === 'Super Admin') return true;
    
    // Manager and Administrator permissions
    if (role === 'Manager' || role === 'Administrator') {
      return ['view', 'create', 'edit', 'approve', 'print', 'export', 'delete'].includes(action);
    }
    
    // Supervisor permissions (no print, approve, delete)
    if (role === 'Supervisor') {
      return ['view', 'create', 'edit', 'export'].includes(action);
    }
    
    // User permissions (basic only)
    if (role === 'User') {
      return ['view', 'create'].includes(action);
    }
    
    return false;
  };

  const changePassword = async (newPassword: string): Promise<void> => {
    try {
      // Update password in Supabase Auth and clear temp password flag
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword,
        data: {
          requires_password_change: false,
          temp_password_set_at: null
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated"
      });
      
      console.log('✅ Password changed successfully, temp flag cleared');
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
    isSuperAdmin,
    isAdministrator,
    isManager,
    isSupervisor,
    isUser,
    canPerformAction,
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