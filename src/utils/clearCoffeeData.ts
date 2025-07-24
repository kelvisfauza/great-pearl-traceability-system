import { collection, getDocs, deleteDoc, doc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const clearCoffeeData = async () => {
  try {
    console.log('Starting to clear coffee data...');
    
    // Collections to clear
    const collectionsToClean = [
      'coffee_records',
      'quality_assessments', 
      'payment_records',
      'finance_transactions',
      'finance_expenses'
    ];

    for (const collectionName of collectionsToClean) {
      console.log(`Clearing ${collectionName}...`);
      
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`Cleared ${snapshot.docs.length} documents from ${collectionName}`);
    }
    
    console.log('Successfully cleared all coffee data from Firebase');
    return { success: true, message: 'All coffee data cleared successfully' };
  } catch (error) {
    console.error('Error clearing coffee data:', error);
    return { success: false, message: 'Failed to clear coffee data', error };
  }
};