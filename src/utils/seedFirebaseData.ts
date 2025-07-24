// Mock Firebase functionality - Firebase disabled

export const seedFirebaseData = async () => {
  try {
    console.log('Mock: Firebase data seeding disabled');
    return { success: true, message: 'Mock seeding completed' };
  } catch (error) {
    console.error('Mock seeding error:', error);
    return { success: false, message: 'Mock seeding failed' };
  }
};