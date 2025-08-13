
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

    // Normalize email consistently
    const normalizedEmail = userEmail.toLowerCase().trim();
    console.log('Normalized email in fetchEmployeeData:', normalizedEmail);

    // Check if this is the main admin account
    if (normalizedEmail === MAIN_ADMIN_EMAIL) {
      console.log('Main admin account detected, creating admin profile');
      let adminProfile: Employee = {
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

      // Load profile data from Supabase (including avatar_url)
      try {
        const { data: supabaseUser } = await supabase.auth.getUser();
        if (supabaseUser.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url, name, phone, address, emergency_contact')
            .eq('user_id', supabaseUser.user.id)
            .single();
          
          if (profileData) {
            console.log('Loading admin profile data from Supabase:', profileData);
            if (profileData.avatar_url) adminProfile.avatar_url = profileData.avatar_url;
            if (profileData.phone) adminProfile.phone = profileData.phone;
            if (profileData.address) adminProfile.address = profileData.address;
            if (profileData.emergency_contact) adminProfile.emergency_contact = profileData.emergency_contact;
          }
        }
      } catch (supabaseError) {
        console.warn('Could not load admin Supabase profile data:', supabaseError);
      }

      return adminProfile;
    }

    try {
      console.log('Fetching employee data for normalized email:', normalizedEmail);
      console.log('Target user ID:', targetUserId);
      
      // First try to search by authUserId (for newly created users)
      if (targetUserId) {
        console.log('Searching by authUserId:', targetUserId);
        const authUserQuery = query(collection(db, 'employees'), where('authUserId', '==', targetUserId));
        const authUserSnapshot = await getDocs(authUserQuery);
        
        if (!authUserSnapshot.empty) {
          const docSnap = authUserSnapshot.docs[0];
          const employeeData = { id: docSnap.id, ...docSnap.data() } as Employee;
          console.log('Found employee by authUserId:', employeeData);
          console.log('Employee email from record:', employeeData.email);
          return employeeData;
        } else {
          console.log('No employee found by authUserId');
        }
      }
      
      // Fallback to search by email (for existing users)
      console.log('Searching by email:', normalizedEmail);
      const employeesQuery = query(collection(db, 'employees'), where('email', '==', normalizedEmail));
      const employeeSnapshot = await getDocs(employeesQuery);

      console.log('Email search query result count:', employeeSnapshot.docs.length);

      if (!employeeSnapshot.empty) {
        const docSnap = employeeSnapshot.docs[0];
        const employeeData = { id: docSnap.id, ...docSnap.data() } as Employee;
        console.log('Found employee by email:', employeeData);
        console.log('Employee email from record:', employeeData.email);
        
        // Try to load additional profile data from Supabase (including avatar_url)
        try {
          const { data: supabaseUser } = await supabase.auth.getUser();
          if (supabaseUser.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('avatar_url, name, phone, address, emergency_contact')
              .eq('user_id', supabaseUser.user.id)
              .single();
            
            if (profileData && profileData.avatar_url) {
              console.log('Loading avatar from Supabase profile:', profileData.avatar_url);
              employeeData.avatar_url = profileData.avatar_url;
              // Also update other profile fields if they exist in Supabase
              if (profileData.phone) employeeData.phone = profileData.phone;
              if (profileData.address) employeeData.address = profileData.address;
              if (profileData.emergency_contact) employeeData.emergency_contact = profileData.emergency_contact;
            }
          }
        } catch (supabaseError) {
          console.warn('Could not load Supabase profile data:', supabaseError);
        }
        
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

      console.log('No employee record found for email:', normalizedEmail);
      
      // Check if there are any employees with similar emails (debugging)
      const allEmployeesQuery = query(collection(db, 'employees'));
      const allEmployeesSnapshot = await getDocs(allEmployeesQuery);
      console.log('=== ALL EMPLOYEE EMAILS IN DATABASE ===');
      allEmployeesSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. Email: "${data.email}" | ID: ${doc.id}`);
      });
      console.log('=== END ALL EMPLOYEE EMAILS ===');
      
      // If user exists in Firebase Auth but no employee record, create one
      if (targetUserId) {
        console.log('Creating missing employee record for authenticated user');
        const employeeData = {
          name: normalizedEmail.split('@')[0], // Use email prefix as name
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

  // Ensure an index doc mapping auth uid to role/department/permissions for security rules
  const upsertEmployeeIndex = async (uid: string, employeeData: Employee) => {
    try {
      await setDoc(doc(db, 'employee_index', uid), {
        department: employeeData.department,
        role: employeeData.role,
        permissions: employeeData.permissions || [],
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Failed to upsert employee_index:', e);
    }
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
      
      // Try Supabase authentication first
      console.log('Attempting Supabase authentication...');
      const { data: supabaseAuth, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (supabaseAuth.user && !supabaseError) {
        console.log('Supabase authentication successful!');
        console.log('User ID:', supabaseAuth.user.id);
        console.log('User email:', supabaseAuth.user.email);
        
        // Create a mock Firebase user object for compatibility
        const mockFirebaseUser = {
          uid: supabaseAuth.user.id,
          email: supabaseAuth.user.email,
          emailVerified: supabaseAuth.user.email_confirmed_at != null
        } as User;
        
        setUser(mockFirebaseUser);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Fetch employee data from Supabase
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', normalizedEmail)
          .single();

        if (employeeError || !employeeData) {
          console.error('No employee record found in Supabase:', employeeError);
          await supabase.auth.signOut();
          setUser(null);
          toast({
            title: "Access Denied",
            description: "No employee record found. Contact your administrator.",
            variant: "destructive"
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

        toast({
          title: "Login Successful",
          description: `Welcome back, ${employee.name}!`
        });

        return {};
      }

      // Fallback to Firebase authentication if Supabase fails
      console.log('Supabase auth failed, trying Firebase...', supabaseError?.message);
      console.log('Calling Firebase signInWithEmailAndPassword...');
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      console.log('Firebase sign in successful!');
      console.log('User UID:', userCredential.user.uid);
      console.log('User email from Firebase:', userCredential.user.email);
      console.log('Email verified:', userCredential.user.emailVerified);
      // Note: Firebase User object doesn't have disabled property in client SDK

      // Set user first so fetchEmployeeData can access user.email
      setUser(userCredential.user);
      
      // Add a small delay to ensure user state is set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch employee data using the email and uid - pass normalized email explicitly
      const employeeData = await fetchEmployeeData(userCredential.user.uid, normalizedEmail);
      
      // Special handling for main admin account
      if (normalizedEmail === MAIN_ADMIN_EMAIL) {
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
        console.error('No employee record found for email:', normalizedEmail);
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

      await upsertEmployeeIndex(userCredential.user.uid, employeeData);

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

      // Sign out from both Supabase and Firebase
      await supabase.auth.signOut();
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
    console.log('Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('=== AUTH STATE CHANGED ===');
      console.log('User:', user ? user.uid : 'No user');
      console.log('User email:', user ? user.email : 'No email');
      
      setUser(user);
      
      if (!user) {
        console.log('No user - clearing employee and stopping loading');
        setEmployee(null);
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else {
        console.log('User found - fetching employee data');
        try {
          const employeeData = await fetchEmployeeData(user.uid, user.email);
          console.log('Employee data from auth state change:', employeeData);
          setEmployee(employeeData);
          if (employeeData) {
            await upsertEmployeeIndex(user.uid, employeeData);
          }
        } catch (error) {
          console.error('Error fetching employee data in auth state change:', error);
        } finally {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Remove this duplicate effect since we're now handling employee data in the auth state change

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
