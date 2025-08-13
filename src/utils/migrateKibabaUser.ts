import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export const migrateKibabaUser = async () => {
  try {
    console.log('Creating Kibaba user in Firebase Auth...');
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'nicholusscottlangz@gmail.com', 
      'Yedascott'
    );

    console.log('Firebase user created:', userCredential.user.uid);

    // Create employee record in Firestore
    const employeeData = {
      name: 'Kibaba Nicholus',
      email: 'nicholusscottlangz@gmail.com',
      phone: '+256778536681',
      position: 'Quality',
      department: 'Quality Control',
      salary: 300000,
      role: 'User',
      permissions: ['Quality Control'],
      status: 'Active',
      join_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      authUserId: userCredential.user.uid,
      mustChangePassword: false,
      isOneTimePassword: false
    };

    const docRef = await addDoc(collection(db, 'employees'), employeeData);
    console.log('Employee record created:', docRef.id);

    return { success: true, message: 'Kibaba user migrated successfully' };
  } catch (error: any) {
    console.error('Migration error:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'User already exists in Firebase Auth' };
    }
    
    return { success: false, message: error.message };
  }
};