
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const seedFirebaseData = async () => {
  try {
    console.log('Starting seed data check...');
    
    // Check if employees already exist
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    console.log('Existing employees count:', employeesSnapshot.size);
    
    if (!employeesSnapshot.empty) {
      console.log('Data already exists, skipping seed');
      return;
    }

    console.log('Seeding Firebase with sample data...');

    // Sample employees
    const employees = [
      {
        name: 'Alex Tumwine',
        email: 'alextumwine@gmail.com',
        position: 'CEO',
        department: 'Management',
        salary: 5000000,
        role: 'Administrator',
        permissions: ['Human Resources', 'Finance', 'Operations', 'Reports'],
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
        permissions: ['Operations', 'Inventory', 'Quality Control'],
        status: 'Active',
        phone: '+256700000002',
        join_date: '2020-03-01',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: 'Sarah Nakato',
        email: 'sarah.nakato@greatpearl.com',
        position: 'Finance Manager',
        department: 'Finance',
        salary: 2800000,
        role: 'Manager',
        permissions: ['Finance', 'Reports'],
        status: 'Active',
        phone: '+256700000003',
        join_date: '2020-06-15',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: 'James Okello',
        email: 'james.okello@greatpearl.com',
        position: 'Quality Control Supervisor',
        department: 'Quality Control',
        salary: 2200000,
        role: 'Supervisor',
        permissions: ['Quality Control'],
        status: 'Active',
        phone: '+256700000004',
        join_date: '2021-01-10',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Add employees
    console.log('Adding employees...');
    for (const employee of employees) {
      const docRef = await addDoc(collection(db, 'employees'), employee);
      console.log('Added employee:', employee.name, 'with ID:', docRef.id);
    }

    // Sample finance transactions
    const transactions = [
      {
        type: 'Income',
        amount: 15000000,
        description: 'Coffee sales - Arabica Grade A',
        date: '2024-07-10',
        time: '09:30',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        type: 'Expense',
        amount: 5000000,
        description: 'Coffee procurement from suppliers',
        date: '2024-07-09',
        time: '14:15',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        type: 'Income',
        amount: 8500000,
        description: 'Robusta coffee export',
        date: '2024-07-08',
        time: '11:45',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    console.log('Adding finance transactions...');
    for (const transaction of transactions) {
      const docRef = await addDoc(collection(db, 'finance_transactions'), transaction);
      console.log('Added transaction:', transaction.description, 'with ID:', docRef.id);
    }

    // Sample expenses
    const expenses = [
      {
        category: 'Operations',
        amount: 2500000,
        description: 'Warehouse maintenance and repairs',
        date: '2024-07-12',
        status: 'Approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        category: 'Transport',
        amount: 1800000,
        description: 'Fuel for delivery trucks',
        date: '2024-07-11',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    console.log('Adding expenses...');
    for (const expense of expenses) {
      const docRef = await addDoc(collection(db, 'finance_expenses'), expense);
      console.log('Added expense:', expense.description, 'with ID:', docRef.id);
    }

    // Sample approval requests
    const approvals = [
      {
        title: 'New Coffee Processing Equipment',
        description: 'Purchase of advanced coffee hulling machine',
        type: 'Purchase',
        amount: '25000000',
        department: 'Operations',
        requestedby: 'Kelvis Fauza',
        priority: 'High',
        status: 'Pending',
        daterequested: '2024-07-13',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        title: 'Marketing Campaign Budget',
        description: 'Q4 marketing campaign for international markets',
        type: 'Budget',
        amount: '8000000',
        department: 'Sales & Marketing',
        requestedby: 'Sarah Nakato',
        priority: 'Medium',
        status: 'Under Review',
        daterequested: '2024-07-12',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    console.log('Adding approval requests...');
    for (const approval of approvals) {
      const docRef = await addDoc(collection(db, 'approval_requests'), approval);
      console.log('Added approval request:', approval.title, 'with ID:', docRef.id);
    }

    console.log('Sample data seeded successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};
