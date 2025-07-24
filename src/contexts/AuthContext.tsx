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

// Main admin account that bypasses employee record checks
const MAIN_ADMIN_EMAIL = 'kelvifauza@gmail.com';

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
    console.log('user?.email:', user?.email);
    console.log('passed email:', email);
    
    if (!userEmail) {
      console.log('No user email available');
      return null;
    }

    // Check if this is the main admin account
    if (userEmail === MAIN_ADMIN_EMAIL) {
      console.log('Main admin account detected, creating admin profile');
      return {
        id: 'main-admin',
        name: 'Main Administrator',
        email: userEmail,
        position: 'System Administrator',
        department: 'Administration',
        salary: 0,
        role: 'Administrator',
        permissions: ['*'], // All permissions
        status: 'Active',
        join_date: new Date().toISOString(),
        isOneTimePassword: false,
        mustChangePassword: false,
        authUserId: targetUserId
      };
    }

    try {
      console.log('Fetching employee data for email:', userEmail);
      console.log('Target user ID:', targetUserId);
      
      // First try to search by authUserId (for newly created users)
      if (targetUserId) {
        const authUserQuery = query(collection(db, 'employees'), where('authUserId', '==', targetUserId));
        const authUserSnapshot = await getDocs(authUserQuery);
        
        if (!authUserSnapshot.empty) {
          const docSnap = authUserSnapshot.docs[0];
          const employeeData = { id: docSnap.id, ...docSnap.data() } as Employee;
          console.log('Found employee by authUserId:', employeeData);
          return employeeData;
        }
      }
      
      // Fallback to search by email (for existing users)
      const normalizedEmail = userEmail.toLowerCase().trim();
      const employeesQuery = query(collection(db, 'employees'), where('email', '==', normalizedEmail));
      const employeeSnapshot = await getDocs(employeesQuery);

      if (!employeeSnapshot.empty) {
        const docSnap = employeeSnapshot.docs[0];
        const employeeData = { id: docSnap.id, ...docSnap.data() } as Employee;
        console.log('Found employee by email:', employeeData);
        
        // Update the employee record with authUserId if it's missing
        if (!employeeData.authUserId && targetUserId) {
          console.log('Updating employee record with authUserId');
          await updateDoc(doc(db, 'employees', docSnap.id), {
            authUserId: targetUserId,
            updated_at: new Date().toISOString()
          });
          employeeData.authUserId = targetUserId;
        }
        
        return employeeData;
      }

      console.log('No employee record found for email:', userEmail);
      
      // If user exists in Firebase Auth but no employee record, create one
      if (targetUserId) {
        console.log('Creating missing employee record for authenticated user');
        const employeeData = {
          name: userEmail.split('@')[0], // Use email prefix as name
          email: normalizedEmail,
          phone: '',
          position: 'Staff',
          department: 'General',
          salary: 0,
          role: 'User',
          permissions: ['General Access'],
          status: 'Active',
          join_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          authUserId: targetUserId,
          isOneTimePassword: false,
          mustChangePassword: false
        };

        try {
          const docRef = await addDoc(collection(db, 'employees'), employeeData);
          console.log('Created employee record with ID:', docRef.id);
          return { id: docRef.id, ...employeeData } as Employee;
        } catch (error) {
          console.error('Error creating employee record:', error);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in fetchEmployeeData:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('=== AUTH CONTEXT SIGNIN ===');
      console.log('Attempting to sign in with email:', email);
      console.log('Password provided:', password ? 'Yes' : 'No');
      console.log('Password length:', password?.length || 0);
      console.log('Firebase Auth instance:', auth);
      console.log('Firebase project ID:', auth.app.options.projectId);
      
      console.log('Calling Firebase signInWithEmailAndPassword...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase sign in successful!');
      console.log('User UID:', userCredential.user.uid);
      console.log('User email:', userCredential.user.email);
      console.log('Email verified:', userCredential.user.emailVerified);
      // Note: Firebase User object doesn't have disabled property in client SDK

      // Set user first so fetchEmployeeData can access user.email
      setUser(userCredential.user);
      
      // Add a small delay to ensure user state is set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch employee data using the email and uid - pass email explicitly
      const employeeData = await fetchEmployeeData(userCredential.user.uid, email);
      
      // Special handling for main admin account
      if (email === MAIN_ADMIN_EMAIL) {
        console.log('Main admin logged in successfully');
        setEmployee(employeeData);
        
        setTimeout(async () => {
          await seedFirebaseData();
        }, 1000);

        toast({
          title: "Login Successful",
          description: "Welcome back, Administrator!"
        });

        return {};
      }
      
      // Regular employee login flow
      console.log('Checking employee data after fetch:', employeeData);
      console.log('Employee data type:', typeof employeeData);
      console.log('Employee data null check:', employeeData === null);
      console.log('Employee data undefined check:', employeeData === undefined);
      
      if (!employeeData) {
        console.error('No employee record found for email:', email);
        console.error('User ID:', userCredential.user.uid);
        console.error('This should not happen if logs show employee was found');
        await firebaseSignOut(auth);
        setUser(null);
        toast({
          title: "Access Denied",
          description: "No employee record found. Contact your administrator.",
          variant: "destructive"
        });
        return {};
      }

      console.log('Employee data found:', employeeData);
      setEmployee(employeeData);

      // Check if user needs to change password
      if (employeeData.mustChangePassword) {
        console.log('User must change password, returning requiresPasswordChange flag');
        toast({
          title: "Password Change Required",
          description: "You must change your password before continuing.",
          variant: "destructive"
        });
        return { requiresPasswordChange: true };
      }

      console.log('Login successful, no password change required');
      setTimeout(async () => {
        await seedFirebaseData();
      }, 1000);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${employeeData.name}!`
      });

      return {};

    } catch (error: any) {
      console.error('Sign in error:', error);
      
      let errorMessage = "Failed to sign in";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password";
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = "This account has been disabled";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later";
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
      
      await updatePassword(user, newPassword);
      
      // Update employee record to remove one-time password flag
      if (employee) {
        const employeeRef = doc(db, 'employees', employee.id);
        await updateDoc(employeeRef, {
          isOneTimePassword: false,
          mustChangePassword: false,
          updated_at: new Date().toISOString()
        });
        
        // Update local state
        setEmployee(prev => prev ? {
          ...prev,
          isOneTimePassword: false,
          mustChangePassword: false
        } : null);
      }
      
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

      await firebaseSignOut(auth);
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? user.uid : 'No user');
      setUser(user);
      setLoading(false);
      if (!user) {
        setEmployee(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      const loadEmployeeData = async () => {
        const employeeData = await fetchEmployeeData(user.uid);
        setEmployee(employeeData);
      };
      loadEmployeeData();
    }
  }, [user, loading]);

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
