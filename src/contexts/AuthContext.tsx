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
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { seedFirebaseData } from '@/utils/seedFirebaseData';
import { useSessionManager } from '@/hooks/useSessionManager';

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auto logout after 2 hours of inactivity (much longer to avoid interrupting work)
const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000;

// Admin accounts that bypass employee record checks
const ADMIN_EMAILS = ['kelvifauza@gmail.com'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Session management
  const { createSession, validateSession, invalidateSession } = useSessionManager(user?.uid || null);

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
    
    if (!userEmail) {
      return null;
    }

    // Normalize email consistently
    const normalizedEmail = userEmail.toLowerCase().trim();

    // Check if this is an admin account
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
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
      
      // First try Supabase authentication
      const { data: supabaseAuth, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (!supabaseError && supabaseAuth.user) {
        // Create a compatible user object for the app
        const appUser = {
          uid: supabaseAuth.user.id,
          email: supabaseAuth.user.email,
          emailVerified: supabaseAuth.user.email_confirmed_at != null
        } as User;
        
        setUser(appUser);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create session for single-device login enforcement
        try {
          await createSession(supabaseAuth.user.id);
        } catch (sessionError) {
          console.error('Session creation failed:', sessionError);
          // Continue with login even if session creation fails
        }
        
        // Check if this is an admin account
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
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', normalizedEmail)
          .single();

        if (employeeError || !employeeData) {
          // Create a basic employee record for authenticated users
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
          authUserId: supabaseAuth.user.id
        };

        // Sync to Firebase for consistency (especially for Denis)
        try {
          const { updateEmployeePermissions } = await import('@/utils/updateEmployeePermissions');
          await updateEmployeePermissions(employee.email, {
            role: employee.role,
            permissions: employee.permissions,
            position: employee.position,
            department: employee.department
          });
          console.log(`✅ Synced ${employee.email} data to Firebase during login`);
        } catch (syncError) {
          console.warn('Failed to sync employee data to Firebase:', syncError);
        }

        setEmployee(employee);

        setTimeout(async () => {
          await seedFirebaseData();
        }, 1000);

        toast({
          title: "Login Successful",
          description: `Welcome back, ${employee.name}!`
        });

        return {};
      }

      // If Supabase fails, try Firebase authentication for legacy users
      try {
        const firebaseCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        
        // Create compatible user object
        const appUser = {
          uid: firebaseCredential.user.uid,
          email: firebaseCredential.user.email,
          emailVerified: firebaseCredential.user.emailVerified
        } as User;
        
        setUser(appUser);
        
        // Create session for single-device login enforcement
        try {
          await createSession(firebaseCredential.user.uid);
        } catch (sessionError) {
          console.error('Session creation failed:', sessionError);
          // Continue with login even if session creation fails
        }
        
        // Check for Firebase employee data
        const employeeQuery = query(
          collection(db, 'employees'),
          where('email', '==', normalizedEmail)
        );
        
        const employeeSnapshot = await getDocs(employeeQuery);
        
        if (employeeSnapshot.empty) {
          // Check if admin
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
              authUserId: firebaseCredential.user.uid
            };
            
            setEmployee(adminProfile);
            
            toast({
              title: "Login Successful",
              description: "Welcome back, Administrator! (Firebase)"
            });
            
            return {};
          }
          
          // Create basic employee record for Firebase user
          const newEmployee: Employee = {
            id: firebaseCredential.user.uid,
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
            authUserId: firebaseCredential.user.uid
          };
          
          setEmployee(newEmployee);
          
          toast({
            title: "Welcome!",
            description: "Logged in with Firebase. Your account will be migrated to the new system.",
            variant: "default"
          });
          
          return {};
        }
        
        // Use Firebase employee data
        const firebaseEmployeeData = employeeSnapshot.docs[0].data();
        const employee: Employee = {
          id: firebaseEmployeeData.id || firebaseCredential.user.uid,
          name: firebaseEmployeeData.name || normalizedEmail.split('@')[0],
          email: firebaseEmployeeData.email || normalizedEmail,
          phone: firebaseEmployeeData.phone || '',
          position: firebaseEmployeeData.position || 'Staff',
          department: firebaseEmployeeData.department || 'General',
          salary: firebaseEmployeeData.salary || 0,
          role: firebaseEmployeeData.role || 'User',
          permissions: firebaseEmployeeData.permissions || ['General Access'],
          status: firebaseEmployeeData.status || 'Active',
          join_date: firebaseEmployeeData.join_date || new Date().toISOString(),
          address: firebaseEmployeeData.address,
          emergency_contact: firebaseEmployeeData.emergency_contact,
          isOneTimePassword: firebaseEmployeeData.isOneTimePassword || false,
          mustChangePassword: firebaseEmployeeData.mustChangePassword || false,
          authUserId: firebaseCredential.user.uid
        };
        
        setEmployee(employee);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${employee.name}! (Firebase)`
        });
        
        return {};
        
      } catch (firebaseError) {
        console.error('Both auth methods failed:', { supabaseError, firebaseError });
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive"
        });
        throw new Error('Authentication failed');
      }

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

  // Simplified auth state management
  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeEmployee: (() => void) | null = null;
    let mounted = true;

    const setupEmployeeListener = (firebaseUser: any) => {
      const normalizedEmail = firebaseUser.email?.toLowerCase().trim();
      
      if (!normalizedEmail || ADMIN_EMAILS.includes(normalizedEmail)) {
        return; // Admin accounts use static profiles
      }

      const employeeQuery = query(
        collection(db, 'employees'),
        where('email', '==', normalizedEmail)
      );

      return onSnapshot(employeeQuery, (snapshot) => {
        if (!mounted) return;
        
        if (snapshot.docs.length > 0) {
          const employeeData = snapshot.docs[0].data();
          
          const updatedEmployee: Employee = {
            id: employeeData.id || firebaseUser.uid,
            name: employeeData.name || normalizedEmail.split('@')[0],
            email: employeeData.email || normalizedEmail,
            phone: employeeData.phone || '',
            position: employeeData.position || 'Staff',
            department: employeeData.department || 'General',
            salary: employeeData.salary || 0,
            role: employeeData.role || 'User',
            permissions: employeeData.permissions || ['General Access'],
            status: employeeData.status || 'Active',
            join_date: employeeData.join_date || new Date().toISOString(),
            address: employeeData.address,
            emergency_contact: employeeData.emergency_contact,
            isOneTimePassword: employeeData.isOneTimePassword || false,
            mustChangePassword: employeeData.mustChangePassword || false,
            authUserId: firebaseUser.uid
          };

          // Show role change notification only when role/permissions actually change
          if (employee && (
            employee.role !== updatedEmployee.role || 
            JSON.stringify(employee.permissions.sort()) !== JSON.stringify(updatedEmployee.permissions.sort())
          )) {
            toast({
              title: "Role Updated",
              description: `Your role has been updated to ${updatedEmployee.role}. Access: ${updatedEmployee.permissions.join(', ')}`,
              duration: 5000
            });
          }

          setEmployee(updatedEmployee);
        } else {
          const basicEmployee: Employee = {
            id: firebaseUser.uid,
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
            authUserId: firebaseUser.uid
          };
          
          setEmployee(basicEmployee);
        }
      });
    };

    unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        const normalizedEmail = firebaseUser.email?.toLowerCase().trim();
        if (normalizedEmail && ADMIN_EMAILS.includes(normalizedEmail)) {
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
            authUserId: firebaseUser.uid
          };
          
          setEmployee(adminProfile);
        } else {
          unsubscribeEmployee = setupEmployeeListener(firebaseUser);
        }
        
        setLoading(false);
      } else {
        setUser(null);
        setEmployee(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeEmployee) unsubscribeEmployee();
    };
  }, []); // No dependencies to prevent infinite loops

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
    if (!user) throw new Error('No user logged in');
    
    try {
      await updatePassword(user, newPassword);
      
      if (employee?.mustChangePassword) {
        // Update the employee record to clear the mustChangePassword flag
        const employeeQuery = query(
          collection(db, 'employees'),
          where('email', '==', employee.email)
        );
        const employeeSnapshot = await getDocs(employeeQuery);
        
        if (!employeeSnapshot.empty) {
          const employeeDoc = employeeSnapshot.docs[0];
          await setDoc(doc(db, 'employees', employeeDoc.id), {
            ...employeeDoc.data(),
            mustChangePassword: false,
            isOneTimePassword: false
          }, { merge: true });
        }
      }
      
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully"
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      throw new Error(error.message || 'Failed to change password');
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Invalidate current session before signing out
      if (user?.uid) {
        await invalidateSession(user.uid);
      }
      
      // Sign out from both Firebase and Supabase
      await Promise.all([
        firebaseSignOut(auth),
        supabase.auth.signOut()
      ]);
      
      setUser(null);
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

  const value: AuthContextType = {
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