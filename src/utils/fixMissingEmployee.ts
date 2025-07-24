import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export const createMissingEmployeeRecord = async (email: string, authUserId: string) => {
  try {
    // First check if employee record exists
    const normalizedEmail = email.toLowerCase().trim();
    const employeesQuery = query(collection(db, 'employees'), where('email', '==', normalizedEmail));
    const employeeSnapshot = await getDocs(employeesQuery);

    if (!employeeSnapshot.empty) {
      console.log('Employee record already exists');
      return employeeSnapshot.docs[0].data();
    }

    // Create the missing employee record
    const employeeData = {
      name: 'Denis Bwambaledeni', // Based on email
      email: normalizedEmail,
      phone: '', // Can be updated later
      position: 'Staff',
      department: 'General',
      salary: 0,
      role: 'User',
      permissions: ['General Access'],
      status: 'Active',
      join_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      authUserId: authUserId,
      isOneTimePassword: false,
      mustChangePassword: false
    };

    const docRef = await addDoc(collection(db, 'employees'), employeeData);
    console.log('Created employee record with ID:', docRef.id);
    
    return { id: docRef.id, ...employeeData };
  } catch (error) {
    console.error('Error creating employee record:', error);
    throw error;
  }
};