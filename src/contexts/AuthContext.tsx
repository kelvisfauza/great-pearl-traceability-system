import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { securityService } from '@/services/securityService';

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

// Admin access is now managed through the user_roles table in the database
// No hardcoded admin bypasses for security and auditability

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

  // Set up real-time subscription for employee changes - INCLUDING account status
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
        async (payload) => {
          console.log('🔔 Employee data changed, checking status...', payload);
          const newData = payload.new as any;
          
          // CRITICAL: Check if account was disabled - force logout immediately
          if (newData.disabled === true || 
              (newData.status && newData.status.toLowerCase() !== 'active')) {
            console.log('🚫 Account disabled/deactivated, forcing logout');
            
            toast({
              title: "Account Suspended",
              description: "Your account has been suspended. Please contact an administrator.",
              variant: "destructive",
              duration: 10000
            });
            
            // Force sign out after a brief delay to show the toast
            setTimeout(async () => {
              await supabase.auth.signOut();
              setUser(null);
              setSession(null);
              setEmployee(null);
            }, 1500);
            
            return;
          }
          
          // Show toast notification about permission changes
          if (newData.permissions && employee?.permissions) {
            const oldPerms = new Set(employee.permissions);
            const newPerms = new Set(newData.permissions);
            
            // Check if permissions changed
            const permsChanged = newData.permissions.length !== employee.permissions.length ||
              newData.permissions.some((p: string) => !oldPerms.has(p));
            
            if (permsChanged) {
              toast({
                title: "Permissions Updated",
                description: "Your permissions have been updated. Refreshing your access...",
              });
            }
          }
          
          // Check for role changes
          if (newData.role && employee?.role && newData.role !== employee.role) {
            toast({
              title: "Role Changed",
              description: `Your role has been updated to ${newData.role}`,
            });
          }
          
          refreshEmployeeData();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from employee changes');
      supabase.removeChannel(channel);
    };
  }, [user?.email, employee?.permissions, employee?.role]);

  const fetchEmployeeData = async (userId?: string, userEmail?: string): Promise<Employee | null> => {
    const targetUserId = userId || user?.id;
    const email = userEmail || user?.email;
    
    if (!email || !targetUserId) {
      return null;
    }

    // Normalize email consistently
    const normalizedEmail = email.toLowerCase().trim();

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
          salary: employeeData.salary ? Number(employeeData.salary) : 0,
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
        // Log failed login attempt to security system
        await securityService.logFailedLogin(
          normalizedEmail,
          error.message || 'Invalid credentials'
        );
        
        toast({
          title: "Login Failed",
          description: error.message || "Invalid email or password",
          variant: "destructive"
        });
        throw error;
      }

      if (!data.user) {
        await securityService.logFailedLogin(
          normalizedEmail,
          'No user returned from authentication'
        );
        throw new Error('No user returned from authentication');
      }

      // Check if the employee account is disabled BEFORE allowing login
      const { data: employeeData, error: empError } = await supabase
        .from('employees')
        .select('disabled, status, name, department, role')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (empError) {
        console.error('Error checking employee status:', empError);
      }

      // Block login if account is disabled or status is not active
      if (employeeData?.disabled === true || 
          (employeeData?.status && employeeData.status.toLowerCase() !== 'active')) {
        // Sign out immediately since we already authenticated
        await supabase.auth.signOut();
        
        await securityService.logFailedLogin(
          normalizedEmail,
          'Account is disabled or inactive'
        );
        
        toast({
          title: "Account Disabled",
          description: "Your account has been disabled. Please contact an administrator.",
          variant: "destructive"
        });
        
        throw new Error('Account is disabled');
      }

      // Successful login - could log this as well for audit trail
      console.log('✅ Successful login for:', normalizedEmail);

      // Write an explicit auth event to system_console_logs so IT can always see logins
      // (console/error capture alone won't show a login if the user doesn't trigger any console output).
      try {
        await supabase.from('system_console_logs').insert({
          level: 'info',
          source: 'auth',
          message: `AUTH: LOGIN_SUCCESS ${normalizedEmail}`,
          user_id: data.user.id,
          user_name: employeeData?.name || (data.user.user_metadata as any)?.name || normalizedEmail,
          user_department: employeeData?.department || 'Unknown',
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 500) : undefined,
          metadata: {
            event: 'LOGIN_SUCCESS',
            email: normalizedEmail,
            role: employeeData?.role || null
          }
        });
      } catch {
        // Never block login on monitoring failures
      }

      return {};
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Only log to security if not already logged
      if (!error.message?.includes('Invalid login')) {
        await securityService.logFailedLogin(
          email.toLowerCase().trim(),
          error.message || 'Unknown login error'
        );
      }
      
      toast({
        title: "Login Error",
        description: error.message || "An error occurred during login",
        variant: "destructive"
      });

      // Best-effort: record failed logins for IT visibility (no secrets, no password)
      try {
        const normalizedEmail = email.toLowerCase().trim();
        await supabase.from('system_console_logs').insert({
          level: 'warn',
          source: 'auth',
          message: `AUTH: LOGIN_FAILED ${normalizedEmail} - ${String(error.message || 'Unknown error').substring(0, 250)}`,
          user_id: undefined,
          user_name: normalizedEmail,
          user_department: 'Unknown',
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 500) : undefined,
          metadata: {
            event: 'LOGIN_FAILED',
            email: normalizedEmail
          }
        });
      } catch {
        // ignore
      }

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
    let loadingTimeout: NodeJS.Timeout;

    // Safety timeout - ensure loading is set to false after 5 seconds max
    loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.log('⏰ Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

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
                    clearTimeout(loadingTimeout);
                  }
                })
                .catch(error => {
                  console.error('❌ Error fetching employee data:', error);
                  if (mounted) {
                    setEmployee(null);
                    setLoading(false);
                    clearTimeout(loadingTimeout);
                  }
                });
            }
          }, 0);
        } else {
          console.log('🚫 No user session, clearing employee data');
          // No user - clear everything immediately
          setEmployee(null);
          setLoading(false);
          clearTimeout(loadingTimeout);
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
              clearTimeout(loadingTimeout);
            }
          })
          .catch(error => {
            console.error('Error fetching employee data:', error);
            if (mounted) {
              setEmployee(null);
              setLoading(false);
              clearTimeout(loadingTimeout);
            }
          });
      } else {
        if (mounted) {
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
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

  // Check if user can perform specific action based on role hierarchy and granular permissions
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
    
    // User permissions (basic only from role)
    if (role === 'User') {
      const roleBasedActions = ['view', 'create'];
      
      // But also check granular permissions for additional capabilities
      // If user has any granular permission with this action, grant it
      const hasGranularPermission = employee.permissions?.some(p => 
        p.endsWith(`:${action}`)
      );
      
      return roleBasedActions.includes(action) || hasGranularPermission;
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