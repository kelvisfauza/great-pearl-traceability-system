import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  pendingUser: User | null;
  pendingPhone: string | null;
  pendingEmployeeName: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  completeTwoFactorAuth: () => void;
  cancelTwoFactorAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canManageEmployees: () => boolean;
  isAdmin: () => boolean;
  fetchEmployeeData: (userId?: string) => Promise<Employee | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auto logout after 5 minutes of inactivity
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [pendingEmployeeName, setPendingEmployeeName] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Refs for inactivity tracking
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
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

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, activity, true);
    });

    // Set initial timer
    resetInactivityTimer();

    return () => {
      // Clean up event listeners
      events.forEach(event => {
        document.removeEventListener(event, activity, true);
      });
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

  const fetchEmployeeData = async (userId?: string): Promise<Employee | null> => {
    const targetUserId = userId || user?.uid;
    if (!targetUserId) {
      console.log('No user UID available');
      return null;
    }

    try {
      console.log('Fetching employee data for user:', targetUserId);
      
      // First try to get employee by user ID (Firebase UID)
      const employeeDoc = await getDoc(doc(db, 'employees', targetUserId));
      
      if (employeeDoc.exists()) {
        const employeeData = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;
        console.log('Found employee by ID:', employeeData);
        return employeeData;
      }

      // If not found by ID, try to find by email
      const employeesQuery = query(
        collection(db, 'employees'), 
        where('email', '==', user?.email)
      );
      const employeeSnapshot = await getDocs(employeesQuery);

      if (!employeeSnapshot.empty) {
        const employeeDoc = employeeSnapshot.docs[0];
        const employeeData = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;
        console.log('Found employee by email:', employeeData);
        
        // Update the employee document to use the Firebase UID as the ID
        if (employeeData.id !== targetUserId) {
          console.log('Updating employee ID to match Firebase UID');
          await setDoc(doc(db, 'employees', targetUserId), {
            ...employeeData,
            id: targetUserId,
            updated_at: new Date().toISOString()
          });
          return { ...employeeData, id: targetUserId };
        }
        return employeeData;
      }

      console.log('No employee record found for user');
      return null;

    } catch (error) {
      console.error('Error in fetchEmployeeData:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign in with:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', userCredential.user.uid);

      // Check if user has an employee record with phone number
      const employeeData = await fetchEmployeeData(userCredential.user.uid);
      
      if (!employeeData) {
        await firebaseSignOut(auth);
        toast({
          title: "Access Denied",
          description: "No employee record found. Contact your administrator.",
          variant: "destructive"
        });
        return;
      }

      if (!employeeData.phone) {
        await firebaseSignOut(auth);
        toast({
          title: "Phone Number Required",
          description: "Your account needs a phone number for 2FA. Contact your administrator.",
          variant: "destructive"
        });
        return;
      }

      // Store pending user, phone, and employee name for 2FA
      setPendingUser(userCredential.user);
      setPendingPhone(employeeData.phone);
      setPendingEmployeeName(employeeData.name);
      
      // Sign out temporarily until 2FA is complete
      await firebaseSignOut(auth);

      toast({
        title: "First Step Complete",
        description: "Please verify your phone number to complete login"
      });

    } catch (error: any) {
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

  const completeTwoFactorAuth = async () => {
    if (!pendingUser) return;

    try {
      setLoading(true);
      
      // Re-authenticate the user
      setUser(pendingUser);
      
      // Fetch and set employee data
      const employeeData = await fetchEmployeeData(pendingUser.uid);
      setEmployee(employeeData);
      
      // Clear pending state
      setPendingUser(null);
      setPendingPhone(null);
      setPendingEmployeeName(null);

      // Seed data after successful login
      setTimeout(async () => {
        console.log('Starting data seeding...');
        await seedFirebaseData();
      }, 1000);

      toast({
        title: "Login Successful",
        description: "You have been successfully authenticated!"
      });
    } catch (error: any) {
      console.error('2FA completion error:', error);
      toast({
        title: "Error",
        description: "Failed to complete authentication",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelTwoFactorAuth = () => {
    setPendingUser(null);
    setPendingPhone(null);
    setPendingEmployeeName(null);
    toast({
      title: "Authentication Cancelled",
      description: "Login process was cancelled"
    });
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      console.log('Creating new account for:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Account created:', userCredential.user.uid);

      // Seed data after successful signup
      setTimeout(async () => {
        console.log('Starting data seeding after signup...');
        await seedFirebaseData();
      }, 1000);

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
      // Clear inactivity timer
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
    return employee.permissions?.includes(permission) || employee.role === 'Administrator';
  };

  const hasRole = (role: string): boolean => {
    if (!employee) return false;
    return employee.role === role;
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
        // Clear timer when user logs out
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      console.log('User available, fetching employee data...');
      const loadEmployeeData = async () => {
        const employeeData = await fetchEmployeeData();
        setEmployee(employeeData);
      };
      loadEmployeeData();
    }
  }, [user, loading]);

  const value = {
    user,
    employee,
    loading,
    pendingUser,
    pendingPhone,
    pendingEmployeeName,
    signIn,
    signUp,
    signOut,
    completeTwoFactorAuth,
    cancelTwoFactorAuth,
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
