import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { seedFirebaseData } from '@/utils/seedFirebaseData';

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
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ requiresPasswordChange?: boolean }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canManageEmployees: () => boolean;
  isAdmin: () => boolean;
  fetchEmployeeData: (userId?: string) => Promise<Employee | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auto logout after 5 minutes of inactivity
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

// Admin accounts that bypass employee record checks
const ADMIN_EMAILS = ['kelvifauza@gmail.com', 'bwambaledenis8@gmail.com'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.log('Auto logout due to inactivity');
        toast({
          title: "Session Expired",
          description: "You have been logged out due to inactivity",
          variant: "destructive"
        });
        signOut();
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const activity = () => resetInactivityTimer();

    events.forEach(event => document.addEventListener(event, activity, true));
    resetInactivityTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, activity, true));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, resetInactivityTimer]);

  const fetchEmployeeData = async (userId?: string, email?: string): Promise<Employee | null> => {
    const targetUserId = userId || user?.uid;
    const userEmail = email || user?.email;
    
    console.log('=== FETCH EMPLOYEE DATA ===');
    console.log('Target User ID:', targetUserId);
    console.log('User Email:', userEmail);
    
    if (!userEmail) {
      console.log('No user email available');
      return null;
    }

    // Normalize email consistently
    const normalizedEmail = userEmail.toLowerCase().trim();
    console.log('Normalized email in fetchEmployeeData:', normalizedEmail);

    // Check if this is an admin account
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      console.log('Main admin account detected, creating admin profile');
      const adminProfile: Employee = {
        id: 'main-admin',
        name: 'Main Administrator',
        email: normalizedEmail,
        position: 'System Administrator',
        department: 'Administration',
        salary: 0,
        role: 'Administrator',
        permissions: ['*'], // All permissions
        status: 'Active',
        join_date: new Date().toISOString(),
        isOneTimePassword: false,
        mustChangePassword: false,
        authUserId: targetUserId || ''
      };

      return adminProfile;
    }

    return null;
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      // Normalize email to match the format used during account creation
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('=== AUTH CONTEXT SIGNIN ===');
      console.log('Original email:', email);
      console.log('Normalized email:', normalizedEmail);
      console.log('Password provided:', password ? 'Yes' : 'No');
      console.log('Password length:', password?.length || 0);
      
      // Use Supabase authentication only
      console.log('Attempting Supabase authentication...');
      const { data: supabaseAuth, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (supabaseError) {
        console.error('Supabase authentication failed:', supabaseError);
        throw supabaseError;
      }

      if (!supabaseAuth.user) {
        throw new Error('Authentication failed - no user returned');
      }

      console.log('Supabase authentication successful!');
      console.log('User ID:', supabaseAuth.user.id);
      console.log('User email:', supabaseAuth.user.email);
      
      // Create a compatible user object for the app
      const appUser = {
        uid: supabaseAuth.user.id,
        email: supabaseAuth.user.email,
        emailVerified: supabaseAuth.user.email_confirmed_at != null
      } as User;
      
      setUser(appUser);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if this is an admin account
      if (ADMIN_EMAILS.includes(normalizedEmail)) {
        console.log('Main admin logged in successfully');
        const adminProfile: Employee = {
          id: 'main-admin',
          name: 'Main Administrator',
          email: normalizedEmail,
          position: 'System Administrator',
          department: 'Administration',
          salary: 0,
          role: 'Administrator',
          permissions: ['*'],
          status: 'Active',
          join_date: new Date().toISOString(),
          isOneTimePassword: false,
          mustChangePassword: false,
          authUserId: supabaseAuth.user.id
        };
        
        setEmployee(adminProfile);
        
        setTimeout(async () => {
          await seedFirebaseData();
        }, 1000);

        toast({
          title: "Login Successful",
          description: "Welcome back, Administrator!"
        });

        return {};
      }
      
      // Fetch employee data from Supabase
      console.log('Fetching employee data from Supabase...');
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (employeeError || !employeeData) {
        console.error('No employee record found in Supabase:', employeeError);
        
        // Create a basic employee record for authenticated users
        console.log('Creating basic employee record for authenticated user');
        const { data: newEmployee, error: createError } = await supabase
          .from('employees')
          .insert({
            name: normalizedEmail.split('@')[0], // Use email prefix as default name
            email: normalizedEmail,
            position: 'Staff',
            department: 'General',
            role: 'User',
            permissions: ['General Access'],
            status: 'Active',
            join_date: new Date().toISOString(),
            salary: 0
          })
          .select()
          .single();
        
        if (createError || !newEmployee) {
          console.error('Failed to create employee record:', createError);
          await supabase.auth.signOut();
          setUser(null);
          toast({
            title: "Access Denied",
            description: "Unable to create employee record. Contact your administrator.",
            variant: "destructive"
          });
          return {};
        }
        
        // Use the newly created employee record
        const employee: Employee = {
          id: newEmployee.id,
          name: newEmployee.name,
          email: newEmployee.email,
          phone: newEmployee.phone || '',
          position: newEmployee.position,
          department: newEmployee.department,
          salary: newEmployee.salary || 0,
          role: newEmployee.role,
          permissions: newEmployee.permissions || [],
          status: newEmployee.status,
          join_date: newEmployee.join_date,
          isOneTimePassword: false,
          mustChangePassword: false,
          authUserId: supabaseAuth.user.id
        };

        setEmployee(employee);

        toast({
          title: "Welcome!",
          description: "Your account has been set up. Please contact HR to complete your profile.",
          variant: "default"
        });

        return {};
      }

      console.log('Employee data found:', employeeData);

      const employee: Employee = {
        id: employeeData.id,
        name: employeeData.name,
        email: employeeData.email,
        phone: employeeData.phone || '',
        position: employeeData.position,
        department: employeeData.department,
        salary: employeeData.salary || 0,
        role: employeeData.role,
        permissions: employeeData.permissions || [],
        status: employeeData.status,
        join_date: employeeData.join_date,
        address: employeeData.address,
        emergency_contact: employeeData.emergency_contact,
        isOneTimePassword: false,
        mustChangePassword: false,
        authUserId: supabaseAuth.user.id
      };

      setEmployee(employee);

      console.log('Login successful');
      setTimeout(async () => {
        await seedFirebaseData();
      }, 1000);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${employee.name}!`
      });

      return {};

    } catch (error: any) {
      console.error('Sign in error:', error);
      
      let errorMessage = "Failed to sign in";
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Please confirm your email address";
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = "Too many failed attempts. Please try again later";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      // Use Supabase to change password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      toast({
        title: "Password Changed",
        description: "Your password has been successfully changed"
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Sign out from Supabase
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
        description: error.message || "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!employee) return false;
    // Main admin has all permissions
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
    console.log('=== SUPABASE AUTH STATE LISTENER SETUP ===');
    
    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const appUser = {
            uid: session.user.id,
            email: session.user.email,
            emailVerified: session.user.email_confirmed_at != null
          } as User;
          
          setUser(appUser);
          
          // Don't fetch employee data here to avoid duplicate fetches
          // This will be handled by the signIn method
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setEmployee(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const appUser = {
          uid: session.user.id,
          email: session.user.email,
          emailVerified: session.user.email_confirmed_at != null
        } as User;
        
        setUser(appUser);
        
        // Fetch employee data for existing session
        const fetchEmployeeForSession = async () => {
          const normalizedEmail = session.user.email?.toLowerCase().trim();
          if (!normalizedEmail) return;
          
          if (ADMIN_EMAILS.includes(normalizedEmail)) {
            const adminProfile: Employee = {
              id: 'main-admin',
              name: 'Main Administrator',
              email: normalizedEmail,
              position: 'System Administrator',
              department: 'Administration',
              salary: 0,
              role: 'Administrator',
              permissions: ['*'],
              status: 'Active',
              join_date: new Date().toISOString(),
              isOneTimePassword: false,
              mustChangePassword: false,
              authUserId: session.user.id
            };
            setEmployee(adminProfile);
          } else {
            const { data: employeeData } = await supabase
              .from('employees')
              .select('*')
              .eq('email', normalizedEmail)
              .single();
              
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
                permissions: employeeData.permissions || [],
                status: employeeData.status,
                join_date: employeeData.join_date,
                address: employeeData.address,
                emergency_contact: employeeData.emergency_contact,
                isOneTimePassword: false,
                mustChangePassword: false,
                authUserId: session.user.id
              };
              setEmployee(employee);
            }
          }
        };
        
        fetchEmployeeForSession();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const value = {
    user,
    employee,
    loading,
    signIn,
    signOut,
    changePassword,
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