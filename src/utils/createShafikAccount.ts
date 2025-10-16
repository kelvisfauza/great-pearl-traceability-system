import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const createShafikAccount = async () => {
  const email = 'shafikahmed20051@gmail.com';
  const tempPassword = 'Shafik@2025'; // Temporary password
  
  try {
    console.log('🔧 Creating Firebase Auth account for Shafik...');
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
    const firebaseUid = userCredential.user.uid;
    
    console.log('✅ Firebase Auth account created with UID:', firebaseUid);
    
    // Create/update Firebase employee record
    await setDoc(doc(db, 'employees', firebaseUid), {
      name: 'Shafik Yeda',
      email: email,
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
      authUserId: firebaseUid,
      isOneTimePassword: true,
      mustChangePassword: true
    });
    
    console.log('✅ Firebase employee record created');
    
    alert(`✅ Shafik's account is ready!\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nShafik must change this password on first login.`);
    
    return { success: true, email, tempPassword };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️ Firebase account already exists for Shafik');
      alert('Shafik already has a Firebase account. If he forgot his password, use the password reset feature.');
      return { success: true, message: 'Account exists' };
    }
    
    console.error('❌ Error creating Shafik account:', error);
    alert(`❌ Error: ${error.message}`);
    throw error;
  }
};

// Auto-execute
createShafikAccount();
