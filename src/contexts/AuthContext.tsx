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
      
      // First try Supabase authentication
      console.log('Attempting Supabase authentication...');
      const { data: supabaseAuth, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (!supabaseError && supabaseAuth.user) {
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
      }

      // If Supabase fails, try Firebase authentication for legacy users
      console.log('Supabase authentication failed, trying Firebase...');
      console.log('Supabase error:', supabaseError);
      
      try {
        const firebaseCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        console.log('Firebase authentication successful!');
        console.log('Firebase User ID:', firebaseCredential.user.uid);
        
        // Create compatible user object
        const appUser = {
          uid: firebaseCredential.user.uid,
          email: firebaseCredential.user.email,
          emailVerified: firebaseCredential.user.emailVerified
        } as User;
        
        setUser(appUser);
        
        // Check for Firebase employee data
        const employeeQuery = query(
          collection(db, 'employees'),
          where('email', '==', normalizedEmail)
        );
        
        const employeeSnapshot = await getDocs(employeeQuery);
        
        if (employeeSnapshot.empty) {
          console.log('No Firebase employee record found');
          
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
            
            // Migrate to Supabase
            setTimeout(async () => {
              try {
                const { error } = await supabase.auth.signUp({
                  email: normalizedEmail,
                  password: password
                });
                if (!error) {
                  console.log('User migrated to Supabase successfully');
                }
              } catch (migrationError) {
                console.log('Migration to Supabase failed:', migrationError);
              }
            }, 2000);
            
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
          
          // Attempt to migrate user to Supabase in background
          setTimeout(async () => {
            try {
              const { error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: password
              });
              if (!error) {
                console.log('User migrated to Supabase successfully');
                // Also create employee record in Supabase
                await supabase.from('employees').insert({
                  name: newEmployee.name,
                  email: newEmployee.email,
                  position: newEmployee.position,
                  department: newEmployee.department,
                  role: newEmployee.role,
                  permissions: newEmployee.permissions,
                  status: newEmployee.status,
                  join_date: newEmployee.join_date,
                  salary: newEmployee.salary
                });
              }
            } catch (migrationError) {
              console.log('Migration to Supabase failed:', migrationError);
            }
          }, 2000);
          
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
        
        // Attempt to migrate user to Supabase in background
        setTimeout(async () => {
          try {
            const { error } = await supabase.auth.signUp({
              email: normalizedEmail,
              password: password
            });
            if (!error) {
              console.log('User migrated to Supabase successfully');
              // Also migrate employee record to Supabase
              await supabase.from('employees').insert({
                name: employee.name,
                email: employee.email,
                phone: employee.phone,
                position: employee.position,
                department: employee.department,
                role: employee.role,
                permissions: employee.permissions,
                status: employee.status,
                join_date: employee.join_date,
                salary: employee.salary,
                address: employee.address,
                emergency_contact: employee.emergency_contact
              });
            }
          } catch (migrationError) {
            console.log('Migration to Supabase failed:', migrationError);
          }
        }, 2000);
        
        return {};
        
      } catch (firebaseError: any) {
        console.error('Firebase authentication also failed:', firebaseError);
        
        // Both authentication methods failed
        let errorMessage = "Login failed. Please check your credentials.";
        
        if (supabaseError?.message?.includes('Invalid login credentials') || 
            firebaseError?.code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password. If you don\'t have an account, please sign up first.';
        } else if (supabaseError?.message?.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the verification link before signing in.';
        } else if (supabaseError?.message?.includes('Too many requests') || 
                   firebaseError?.code === 'auth/too-many-requests') {
          errorMessage = 'Too many failed login attempts. Please try again later.';
        } else if (firebaseError?.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email address. Please sign up or contact your administrator.';
        } else if (firebaseError?.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password.';
        } else if (firebaseError?.code === 'auth/user-disabled') {
          errorMessage = 'This account has been disabled. Contact your administrator.';
        }
        
        throw new Error(errorMessage);
      }

    } catch (error: any) {
      console.error('Sign in error:', error);
      
      let errorMessage = "Failed to sign in";
      if (error.message) {
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

  // Real-time employee data listener
  useEffect(() => {
    if (!user?.email) return;

    console.log('=== SETTING UP REAL-TIME EMPLOYEE LISTENER ===');
    
    // Set up Firebase real-time listener for employee data
    const unsubscribeEmployee = onSnapshot(
      query(collection(db, 'employees'), where('email', '==', user.email.toLowerCase())),
      (snapshot) => {
        if (!snapshot.empty) {
          const employeeDoc = snapshot.docs[0];
          const employeeData = employeeDoc.data();
          
          const updatedEmployee: Employee = {
            id: employeeDoc.id,
            name: employeeData.name,
            email: employeeData.email,
            phone: employeeData.phone || '',
            position: employeeData.position,
            department: employeeData.department,
            salary: employeeData.salary || 0,
            role: employeeData.role || 'User',
            permissions: employeeData.permissions || ['General Access'],
            status: employeeData.status || 'Active',
            join_date: employeeData.join_date,
            address: employeeData.address,
            emergency_contact: employeeData.emergency_contact,
            isOneTimePassword: false,
            mustChangePassword: false,
            authUserId: user.uid
          };

          // Check if permissions changed
          const currentPermissions = employee?.permissions || [];
          const newPermissions = updatedEmployee.permissions || [];
          const permissionsChanged = JSON.stringify(currentPermissions.sort()) !== JSON.stringify(newPermissions.sort());
          const roleChanged = employee?.role !== updatedEmployee.role;

          setEmployee(updatedEmployee);

          // Show notification if permissions or role changed
          if (employee && (permissionsChanged || roleChanged)) {
            console.log('🔔 Role/permissions changed, showing notification');
            
            let notificationMessage = '';
            if (roleChanged) {
              notificationMessage = `Your role has been updated to: ${updatedEmployee.role}`;
            }
            if (permissionsChanged) {
              const addedPermissions = newPermissions.filter(p => !currentPermissions.includes(p));
              const removedPermissions = currentPermissions.filter(p => !newPermissions.includes(p));
              
              if (addedPermissions.length > 0) {
                notificationMessage += `${notificationMessage ? ' | ' : ''}New permissions: ${addedPermissions.join(', ')}`;
              }
              if (removedPermissions.length > 0) {
                notificationMessage += `${notificationMessage ? ' | ' : ''}Removed permissions: ${removedPermissions.join(', ')}`;
              }
            }

            if (notificationMessage) {
              toast({
                title: "Permissions Updated",
                description: notificationMessage,
                duration: 5000,
              });
            }
          }
        }
      },
      (error) => {
        console.error('Error in employee listener:', error);
      }
    );

    return () => {
      console.log('Cleaning up employee listener');
      unsubscribeEmployee();
    };
  }, [user?.email, employee?.role, employee?.permissions, toast]);

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
                role: employeeData.role || 'User',
                permissions: employeeData.permissions || ['General Access'],
                status: employeeData.status || 'Active',
                join_date: employeeData.join_date,
                isOneTimePassword: false,
                mustChangePassword: false,
                authUserId: session.user.id,
                address: employeeData.address,
                emergency_contact: employeeData.emergency_contact
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