import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
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
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canManageEmployees: () => boolean;
  isAdmin: () => boolean;
  fetchEmployeeData: (userId?: string) => Promise<Employee | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auto logout after 5 minutes of inactivity
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const fetchEmployeeData = async (userId?: string): Promise<Employee | null> => {
    const targetUserId = userId || user?.uid;
    if (!targetUserId) return null;

    try {
      const employeeDoc = await getDoc(doc(db, 'employees', targetUserId));
      if (employeeDoc.exists()) {
        return { id: employeeDoc.id, ...employeeDoc.data() } as Employee;
      }

      const employeesQuery = query(collection(db, 'employees'), where('email', '==', user?.email));
      const employeeSnapshot = await getDocs(employeesQuery);

      if (!employeeSnapshot.empty) {
        const docSnap = employeeSnapshot.docs[0];
        const employeeData = { id: docSnap.id, ...docSnap.data() } as Employee;

        if (employeeData.id !== targetUserId) {
          await setDoc(doc(db, 'employees', targetUserId), {
            ...employeeData,
            id: targetUserId,
            updated_at: new Date().toISOString()
          });
          return { ...employeeData, id: targetUserId };
        }

        return employeeData;
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

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

      setUser(userCredential.user);
      setEmployee(employeeData);

      setTimeout(async () => {
        await seedFirebaseData();
      }, 1000);

      toast({
        title: "Login Successful",
        description: "Welcome back!"
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

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      setTimeout(async () => {
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
    signIn,
    signUp,
    signOut,
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
