
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const seedFirebaseData = async () => {
  try {
    console.log('Starting Firebase data seeding...');
    
    // Check if employees already exist
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    console.log('Existing employees count:', employeesSnapshot.size);
    
    if (!employeesSnapshot.empty) {
      console.log('Data already exists, skipping seeding');
      return;
    }

    console.log('Seeding employees...');
    
    // Sample employees
    const employees = [
      {
        name: 'Alex Tumwine',
        email: 'alextumwine@gmail.com',
        position: 'CEO',
        department: 'Management',
        salary: 5000000,
        role: 'Administrator',
        permissions: ['Human Resources', 'Finance', 'Operations', 'Reports', 'Store Management'],
        status: 'Active',
        phone: '+256700000001',
        join_date: '2020-01-15',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: 'Kelvis Fauza',
        email: 'kelvisfauza@gmail.com',
        position: 'Operations Manager',
        department: 'Operations',
        salary: 3000000,
        role: 'Manager',
        permissions: ['Operations', 'Inventory', 'Quality Control', 'Store Management'],
        status: 'Active',
        phone: '+256700000002',
        join_date: '2020-03-01',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: 'Bwambaledenis',
        email: 'bwambaledenis8@gmail.com',
        position: 'Staff',
        department: 'General',
        salary: 1500000,
        role: 'User',
        permissions: ['General Access'],
        status: 'Active',
        phone: '+256700000003',
        join_date: '2024-01-01',
        mustChangePassword: false,
        isOneTimePassword: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Add employees in sequence
    for (const employee of employees) {
      try {
        const docRef = await addDoc(collection(db, 'employees'), employee);
        console.log('Added employee:', employee.name, 'with ID:', docRef.id);
      } catch (error) {
        console.error('Error adding employee:', employee.name, error);
      }
    }

    console.log('Seeding finance transactions...');
    
    // Sample finance transactions
    const transactions = [
      {
        type: 'Receipt',
        amount: 15000000,
        description: 'Coffee sales - Arabica Grade A',
        date: '2024-07-10',
        time: '09:30',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        type: 'Payment',
        amount: 5000000,
        description: 'Coffee procurement from suppliers',
        date: '2024-07-09',
        time: '14:15',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const transaction of transactions) {
      try {
        const docRef = await addDoc(collection(db, 'finance_transactions'), transaction);
        console.log('Added transaction:', transaction.description, 'with ID:', docRef.id);
      } catch (error) {
        console.error('Error adding transaction:', transaction.description, error);
      }
    }

    console.log('Seeding coffee records...');
    
    // Sample coffee records for store
    const coffeeRecords = [
      {
        supplier_name: 'John Doe Farmers',
        coffee_type: 'Arabica',
        bags: 50,
        kilograms: 3000,
        date: new Date().toISOString().split('T')[0],
        batch_number: 'AR001',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        supplier_name: 'Green Valley Co-op',
        coffee_type: 'Robusta',
        bags: 30,
        kilograms: 1800,
        date: new Date().toISOString().split('T')[0],
        batch_number: 'RB002',
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const record of coffeeRecords) {
      try {
        const docRef = await addDoc(collection(db, 'coffee_records'), record);
        console.log('Added coffee record:', record.batch_number, 'with ID:', docRef.id);
      } catch (error) {
        console.error('Error adding coffee record:', record.batch_number, error);
      }
    }

    console.log('Firebase data seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding Firebase data:', error);
  }
};
