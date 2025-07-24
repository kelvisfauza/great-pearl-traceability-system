// Mock Firebase client wrapper - Firebase disabled
export const firebaseClient = {
  from: (collectionName: string) => ({
    select: () => ({
      order: (field: string, options?: { ascending: boolean }) => ({
        get: async () => {
          console.log('Mock: firebaseClient.from().select().order().get() called for', collectionName);
          return { data: [], error: null };
        }
      }),
      get: async () => {
        console.log('Mock: firebaseClient.from().select().get() called for', collectionName);
        return { data: [], error: null };
      }
    }),
    insert: (data: any) => ({
      get: async () => {
        console.log('Mock: firebaseClient.from().insert().get() called for', collectionName, data);
        return { data: null, error: null };
      }
    })
  })
};