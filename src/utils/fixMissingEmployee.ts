// Mock Firebase functionality - Firebase disabled

export const createMissingEmployeeRecord = async (email: string, authUserId: string) => {
  try {
    console.log('Mock: createMissingEmployeeRecord called for', email, authUserId);
    
    const employeeData = {
      id: 'mock-id-' + Math.random().toString(36).substr(2, 9),
      name: 'Denis Bwambaledeni',
      email: email.toLowerCase().trim(),
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
      authUserId: authUserId,
      isOneTimePassword: false,
      mustChangePassword: false
    };

    console.log('Mock: Created employee record', employeeData);
    return employeeData;
  } catch (error) {
    console.error('Error creating employee record:', error);
    throw error;
  }
};