
// Simple Firebase client wrapper for consistent API
import { db } from './firebase';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

export const firebaseClient = {
  from: (collectionName: string) => ({
    select: () => ({
      order: (field: string, options?: { ascending: boolean }) => ({
        get: async () => {
          try {
            const q = options?.ascending === false 
              ? query(collection(db, collectionName), orderBy(field, 'desc'))
              : query(collection(db, collectionName), orderBy(field, 'asc'));
            
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            return { data, error: null };
          } catch (error) {
            console.error(`Error fetching from ${collectionName}:`, error);
            return { data: null, error };
          }
        }
      })
    }),
    insert: async (data: any) => {
      try {
        const docRef = await addDoc(collection(db, collectionName), {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return { data: { id: docRef.id, ...data }, error: null };
      } catch (error) {
        console.error(`Error inserting to ${collectionName}:`, error);
        return { data: null, error };
      }
    }
  })
};
