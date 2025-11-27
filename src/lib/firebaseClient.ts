
// Firebase has been migrated to Supabase
// This file is kept for backwards compatibility

export const firebaseClient = {
  from: (collectionName: string) => ({
    select: () => ({
      order: (field: string, options?: { ascending: boolean }) => ({
        get: async () => {
          console.warn('Firebase has been migrated to Supabase. Please update your code.');
          return { data: [], error: null };
        }
      })
    }),
    insert: async (data: any) => {
      console.warn('Firebase has been migrated to Supabase. Please update your code.');
      return { data: null, error: null };
    }
  })
};
