
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  QueryConstraint,
  DocumentData,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { db } from './firebase';

interface FirebaseResponse<T = any> {
  data: T | null;
  error: Error | null;
}

interface FirebaseListResponse<T = any> {
  data: T[] | null;
  error: Error | null;
}

class FirebaseQueryBuilder {
  private collectionRef: CollectionReference;
  private constraints: QueryConstraint[] = [];

  constructor(collectionName: string) {
    this.collectionRef = collection(db, collectionName);
  }

  select(columns?: string) {
    // Firebase doesn't support column selection like SQL
    // We'll return all fields and let the consumer filter if needed
    return this;
  }

  where(field: string, operator: any, value: any) {
    this.constraints.push(where(field, operator, value));
    return this;
  }

  eq(field: string, value: any) {
    this.constraints.push(where(field, '==', value));
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.constraints.push(orderBy(field, direction));
    return this;
  }

  limit(count: number) {
    this.constraints.push(limit(count));
    return this;
  }

  async get(): Promise<FirebaseListResponse> {
    try {
      const q = query(this.collectionRef, ...this.constraints);
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async single(): Promise<FirebaseResponse> {
    try {
      const q = query(this.collectionRef, ...this.constraints, limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { data: null, error: new Error('No document found') };
      }
      const doc = querySnapshot.docs[0];
      return { data: { id: doc.id, ...doc.data() }, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async maybeSingle(): Promise<FirebaseResponse> {
    try {
      const q = query(this.collectionRef, ...this.constraints, limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { data: null, error: null };
      }
      const doc = querySnapshot.docs[0];
      return { data: { id: doc.id, ...doc.data() }, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

class FirebaseClient {
  from(collectionName: string) {
    return {
      select: (columns?: string) => new FirebaseQueryBuilder(collectionName),
      
      insert: async (data: any): Promise<FirebaseResponse> => {
        try {
          const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          return { data: { id: docRef.id, ...data }, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      update: (data: any) => ({
        eq: async (field: string, value: any): Promise<FirebaseResponse> => {
          try {
            // For updates, we need to find the document first
            const q = query(collection(db, collectionName), where(field, '==', value));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              return { data: null, error: new Error('Document not found') };
            }

            const docRef = querySnapshot.docs[0].ref;
            await updateDoc(docRef, {
              ...data,
              updated_at: new Date().toISOString()
            });
            
            return { data: { id: docRef.id, ...data }, error: null };
          } catch (error) {
            return { data: null, error: error as Error };
          }
        }
      }),

      delete: () => ({
        eq: async (field: string, value: any): Promise<FirebaseResponse> => {
          try {
            const q = query(collection(db, collectionName), where(field, '==', value));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              return { data: null, error: new Error('Document not found') };
            }

            await deleteDoc(querySnapshot.docs[0].ref);
            return { data: null, error: null };
          } catch (error) {
            return { data: null, error: error as Error };
          }
        }
      })
    };
  }
}

export const firebaseClient = new FirebaseClient();
