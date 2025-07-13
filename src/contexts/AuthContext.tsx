
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
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
  employee_id?: string;
  address?: string;
  emergency_contact?: string;
  role: string;
  permissions: string[];
  status: string;
  join_date: string;
  created_at: string;
  updated_at: string;
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
  fetchEmployeeData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const logSecurityEvent = async (action: string, tableName: string, recordId?: string, oldValues?: any, newValues?: any) => {
    try {
      if (!user) return;
      
      await addDoc(collection(db, 'security_audit_log'), {
        user_id: user.uid,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Security logging error:', error);
    }
  };

  const fetchEmployeeData = async () => {
    if (!user?.uid) return;

    try {
      // First check if user profile exists and get linked employee
      const userProfileDoc = await getDoc(doc(db, 'user_profiles', user.uid));
      
      if (userProfileDoc.exists()) {
        const profileData = userProfileDoc.data();
        
        if (profileData.employee_id) {
          const employeeDoc = await getDoc(doc(db, 'employees', profileData.employee_id));
          if (employeeDoc.exists()) {
            const employeeData = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;
            setEmployee(employeeData);
          }
        }
      } else {
        // If no profile exists, try to find employee by email and create link
        const employeesQuery = query(
          collection(db, 'employees'), 
          where('email', '==', user.email)
        );
        const employeeSnapshot = await getDocs(employeesQuery);

        if (!employeeSnapshot.empty) {
          const employeeDoc = employeeSnapshot.docs[0];
          const employeeData = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;

          // Create user profile link
          await setDoc(doc(db, 'user_profiles', user.uid), {
            user_id: user.uid,
            employee_id: employeeDoc.id,
            created_at: new Date().toISOString()
          });

          setEmployee(employeeData);
        }
      }
    } catch (error) {
      console.error('Error in fetchEmployeeData:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (userCredential.user) {
        // Seed data on first login if database is empty
        setTimeout(() => {
          seedFirebaseData();
        }, 1000);
        
        await logSecurityEvent('user_login', 'auth', userCredential.user.uid);
      }

      toast({
        title: "Success",
        description: "Signed in successfully"
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      await logSecurityEvent('failed_login', 'auth', undefined, { email });
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

      if (userCredential.user) {
        // Seed data on signup
        setTimeout(() => {
          seedFirebaseData();
        }, 1000);
        
        await logSecurityEvent('user_signup', 'auth', userCredential.user.uid, null, { email });
      }

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
      await logSecurityEvent('user_logout', 'auth', user?.uid);
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
    return employee?.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    return employee?.role === role || false;
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
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      fetchEmployeeData();
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
