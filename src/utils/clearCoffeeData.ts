import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

export const clearCoffeeData = async () => {
  try {
    console.log('Starting to clear coffee data from both Firebase and Supabase (excluding pending assessments)...');
    
    let totalDeleted = 0;

    // Clear from Supabase first
    console.log('Clearing Supabase quality_assessments (excluding pending)...');
    const { data: supabaseAssessments, error: fetchError } = await supabase
      .from('quality_assessments')
      .select('id, status')
      .not('status', 'in', '("pending","quality_review")');

    if (fetchError) {
      console.error('Error fetching Supabase assessments:', fetchError);
    } else if (supabaseAssessments && supabaseAssessments.length > 0) {
      const idsToDelete = supabaseAssessments.map(a => a.id);
      const { error: deleteError } = await supabase
        .from('quality_assessments')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error('Error deleting Supabase assessments:', deleteError);
      } else {
        totalDeleted += supabaseAssessments.length;
        console.log(`Cleared ${supabaseAssessments.length} quality assessments from Supabase`);
      }
    }

    // Clear Supabase coffee_records (excluding pending)
    console.log('Clearing Supabase coffee_records (excluding pending)...');
    const { data: supabaseCoffee, error: coffeeFetchError } = await supabase
      .from('coffee_records')
      .select('id, status')
      .not('status', 'in', '("pending","quality_review")');

    if (coffeeFetchError) {
      console.error('Error fetching Supabase coffee records:', coffeeFetchError);
    } else if (supabaseCoffee && supabaseCoffee.length > 0) {
      const coffeeIdsToDelete = supabaseCoffee.map(c => c.id);
      const { error: coffeeDeleteError } = await supabase
        .from('coffee_records')
        .delete()
        .in('id', coffeeIdsToDelete);
      
      if (coffeeDeleteError) {
        console.error('Error deleting Supabase coffee records:', coffeeDeleteError);
      } else {
        totalDeleted += supabaseCoffee.length;
        console.log(`Cleared ${supabaseCoffee.length} coffee records from Supabase`);
      }
    }

    // Clear quality assessments (excluding pending and quality_review status)
    console.log('Clearing quality_assessments (excluding pending)...');
    const qaRef = collection(db, 'quality_assessments');
    const qaSnapshot = await getDocs(qaRef);
    
    const qaToDelete = qaSnapshot.docs.filter(doc => {
      const status = doc.data().status;
      return status !== 'pending' && status !== 'quality_review';
    });
    
    const qaDeletePromises = qaToDelete.map(doc => deleteDoc(doc.ref));
    await Promise.all(qaDeletePromises);
    totalDeleted += qaToDelete.length;
    console.log(`Cleared ${qaToDelete.length} quality assessments (preserved ${qaSnapshot.docs.length - qaToDelete.length} pending)`);

    // Clear coffee records (excluding pending and quality_review status)
    console.log('Clearing coffee_records (excluding pending)...');
    const coffeeRef = collection(db, 'coffee_records');
    const coffeeSnapshot = await getDocs(coffeeRef);
    
    const coffeeToDelete = coffeeSnapshot.docs.filter(doc => {
      const status = doc.data().status;
      return status !== 'pending' && status !== 'quality_review';
    });
    
    const coffeeDeletePromises = coffeeToDelete.map(doc => deleteDoc(doc.ref));
    await Promise.all(coffeeDeletePromises);
    totalDeleted += coffeeToDelete.length;
    console.log(`Cleared ${coffeeToDelete.length} coffee records (preserved ${coffeeSnapshot.docs.length - coffeeToDelete.length} pending)`);

    // Clear payment_records, finance_transactions, finance_expenses completely
    const otherCollections = ['payment_records', 'finance_transactions', 'finance_expenses'];
    
    for (const collectionName of otherCollections) {
      console.log(`Clearing ${collectionName}...`);
      
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      totalDeleted += snapshot.docs.length;
      
      console.log(`Cleared ${snapshot.docs.length} documents from ${collectionName}`);
    }
    
    console.log(`Successfully cleared ${totalDeleted} documents from Firebase (pending assessments preserved)`);
    return { success: true, message: `Cleared ${totalDeleted} old records (pending assessments preserved)` };
  } catch (error) {
    console.error('Error clearing coffee data:', error);
    return { success: false, message: 'Failed to clear old data', error };
  }
};