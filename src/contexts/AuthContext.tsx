import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const createDefaultEmployee = async (user: User): Promise<Employee> => {
    const defaultEmployee: Employee = {
      id: user.uid,
      name: user.email?.split('@')[0] || 'User',
      email: user.email || '',
      position: 'Manager',
      department: 'Operations',
      salary: 2000000,
      role: 'Administrator',
      permissions: ['Human Resources', 'Finance', 'Operations', 'Reports', 'Store Management', 'Quality Control'],
      status: 'Active',
      join_date: new Date().toISOString().split('T')[0],
    };

    try {
      await setDoc(doc(db, 'employees', user.uid), {
        ...defaultEmployee,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      console.log('Default employee created:', defaultEmployee);
      return defaultEmployee;
    } catch (error) {
      console.error('Error creating default employee:', error);
      return defaultEmployee;
    }
  };

  const fetchEmployeeData = async () => {
    if (!user?.uid) {
      console.log('No user UID available');
      return;
    }

    try {
      console.log('Fetching employee data for user:', user.uid);
      
      // First try to get employee by user ID
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      
      if (employeeDoc.exists()) {
        const employeeData = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;
        console.log('Found employee by ID:', employeeData);
        setEmployee(employeeData);
        return;
      }

      // If not found by ID, try to find by email
      const employeesQuery = query(
        collection(db, 'employees'), 
        where('email', '==', user.email)
      );
      const employeeSnapshot = await getDocs(employeesQuery);

      if (!employeeSnapshot.empty) {
        const employeeDoc = employeeSnapshot.docs[0];
        const employeeData = { id: employeeDoc.id, ...employeeDoc.data() } as Employee;
        console.log('Found employee by email:', employeeData);
        setEmployee(employeeData);
        return;
      }

      // If no employee found, create a default one
      console.log('No employee found, creating default employee');
      const defaultEmployee = await createDefaultEmployee(user);
      setEmployee(defaultEmployee);

    } catch (error) {
      console.error('Error in fetchEmployeeData:', error);
      // Create default employee on error
      const defaultEmployee = await createDefaultEmployee(user);
      setEmployee(defaultEmployee);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Attempting to sign in with:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', userCredential.user.uid);

      // Seed data after successful login
      setTimeout(async () => {
        console.log('Starting data seeding...');
        await seedFirebaseData();
      }, 1000);

      toast({
        title: "Success",
        description: "Signed in successfully"
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
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      console.log('User available, fetching employee data...');
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
