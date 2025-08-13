import { auth, db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  where, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updatePassword
} from 'firebase/auth';

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
  authUserId?: string;
}

export const fixAuthenticationIssues = async () => {
  console.log('🔧 STARTING AUTHENTICATION REPAIR...');

  try {
    // Get all employees from Firestore
    const employeesQuery = query(collection(db, 'employees'));
    const employeeSnapshot = await getDocs(employeesQuery);
    
    console.log(`Found ${employeeSnapshot.docs.length} employee records`);
    
    const results = {
      checked: 0,
      created: 0,
      updated: 0,
      errors: 0
    };

    for (const docSnap of employeeSnapshot.docs) {
      const employee = { id: docSnap.id, ...docSnap.data() } as Employee;
      results.checked++;
      
      console.log(`\n📋 Checking employee: ${employee.name} (${employee.email})`);
      
      const normalizedEmail = employee.email.toLowerCase().trim();
      
      try {
        // If employee doesn't have authUserId, try to create Firebase Auth account
        if (!employee.authUserId) {
          console.log(`  ⚠️ Missing authUserId for ${employee.name}`);
          
          // Generate a secure default password
          const defaultPassword = 'DefaultPass123!';
          
          try {
            // Try to create Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(
              auth, 
              normalizedEmail, 
              defaultPassword
            );
            
            console.log(`  ✅ Created Firebase Auth account for ${employee.name}`);
            console.log(`  🔑 Default password: ${defaultPassword}`);
            
            // Update employee record with authUserId
            await updateDoc(doc(db, 'employees', employee.id), {
              authUserId: userCredential.user.uid,
              isOneTimePassword: true,
              mustChangePassword: true,
              updated_at: new Date().toISOString()
            });
            
            results.created++;
            console.log(`  ✅ Updated employee record with authUserId`);
            
            // Sign out immediately
            await auth.signOut();
            
          } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
              console.log(`  ℹ️ Firebase Auth account already exists for ${employee.email}`);
              
              // Try to sign in to get the UID
              try {
                const signInResult = await signInWithEmailAndPassword(
                  auth, 
                  normalizedEmail, 
                  defaultPassword
                );
                
                // Update employee record with the existing authUserId
                await updateDoc(doc(db, 'employees', employee.id), {
                  authUserId: signInResult.user.uid,
                  updated_at: new Date().toISOString()
                });
                
                results.updated++;
                console.log(`  ✅ Linked existing Firebase Auth account`);
                
                await auth.signOut();
                
              } catch (signInError: any) {
                console.log(`  ❌ Could not sign in with default password, account exists but password unknown`);
                console.log(`  🔍 Manual intervention needed for ${employee.email}`);
                results.errors++;
              }
            } else {
              console.error(`  ❌ Auth error for ${employee.name}:`, authError.message);
              results.errors++;
            }
          }
        } else {
          console.log(`  ✅ Employee already has authUserId: ${employee.authUserId}`);
        }
        
      } catch (error: any) {
        console.error(`  ❌ Error processing ${employee.name}:`, error.message);
        results.errors++;
      }
    }
    
    console.log('\n📊 REPAIR SUMMARY:');
    console.log(`  Employees checked: ${results.checked}`);
    console.log(`  Auth accounts created: ${results.created}`);
    console.log(`  Records updated: ${results.updated}`);
    console.log(`  Errors: ${results.errors}`);
    
    return results;
    
  } catch (error) {
    console.error('🔥 CRITICAL ERROR during authentication repair:', error);
    throw error;
  }
};

// Test specific email/password combination
export const testSpecificAccount = async (email: string, password: string) => {
  console.log(`🧪 TESTING ACCOUNT: ${email}`);
  
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    // Try to sign in
    console.log('  🔐 Attempting sign in...');
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    console.log(`  ✅ Firebase Auth sign in successful!`);
    console.log(`  👤 User UID: ${userCredential.user.uid}`);
    console.log(`  📧 User email: ${userCredential.user.email}`);
    console.log(`  ✉️ Email verified: ${userCredential.user.emailVerified}`);
    
    // Check for employee record
    console.log('  📋 Checking for employee record...');
    const employeeQuery = query(
      collection(db, 'employees'), 
      where('email', '==', normalizedEmail)
    );
    const employeeSnapshot = await getDocs(employeeQuery);
    
    if (!employeeSnapshot.empty) {
      const employee = employeeSnapshot.docs[0].data();
      console.log(`  ✅ Employee record found!`);
      console.log(`  👤 Name: ${employee.name}`);
      console.log(`  🏢 Department: ${employee.department}`);
      console.log(`  🔗 Auth UID: ${employee.authUserId}`);
      
      if (employee.authUserId !== userCredential.user.uid) {
        console.log(`  ⚠️ UID mismatch! Updating employee record...`);
        await updateDoc(doc(db, 'employees', employeeSnapshot.docs[0].id), {
          authUserId: userCredential.user.uid,
          updated_at: new Date().toISOString()
        });
        console.log(`  ✅ Employee record updated with correct UID`);
      }
    } else {
      console.log(`  ❌ No employee record found for ${normalizedEmail}`);
      console.log(`  📝 Creating employee record...`);
      
      const employeeData = {
        name: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        phone: '+256 700 000 000',
        position: 'Staff',
        department: 'General',
        salary: 500000,
        role: 'User',
        permissions: ['General Access'],
        status: 'Active',
        join_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        authUserId: userCredential.user.uid,
        isOneTimePassword: false,
        mustChangePassword: false
      };
      
      const docRef = await addDoc(collection(db, 'employees'), employeeData);
      console.log(`  ✅ Employee record created with ID: ${docRef.id}`);
    }
    
    await auth.signOut();
    console.log('  👋 Signed out successfully');
    
    return { success: true, uid: userCredential.user.uid };
    
  } catch (error: any) {
    console.error(`  ❌ Test failed:`, error.message);
    console.error(`  🔍 Error code:`, error.code);
    return { success: false, error: error.message, code: error.code };
  }
};