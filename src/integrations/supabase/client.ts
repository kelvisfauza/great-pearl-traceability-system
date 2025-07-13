
// Temporary compatibility layer for Firebase migration
// This provides a mock Supabase client that returns empty data to prevent build errors

export const supabase = {
  from: (table: string) => ({
    select: (columns?: string) => Promise.resolve({ data: [], error: null }),
    insert: (data: any) => Promise.resolve({ data: null, error: null }),
    update: (data: any) => ({
      eq: (column: any, value: any) => Promise.resolve({ data: null, error: null })
    }),
    delete: () => ({
      eq: (column: any, value: any) => Promise.resolve({ data: null, error: null })
    }),
    eq: (column: any, value: any) => ({
      select: (columns?: string) => Promise.resolve({ data: [], error: null }),
      update: (data: any) => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null })
    }),
    order: (column: any, options?: any) => ({
      select: (columns?: string) => Promise.resolve({ data: [], error: null }),
      eq: (column: any, value: any) => Promise.resolve({ data: [], error: null })
    }),
    limit: (count: any) => Promise.resolve({ data: [], error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    in: (column: any, values: any[]) => Promise.resolve({ data: [], error: null })
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    updateUser: (updates: any) => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null })
  },
  channel: (name: string) => ({
    on: (event: string, callback: any) => ({ subscribe: () => {} }),
    subscribe: () => {}
  }),
  functions: {
    invoke: (name: string, options?: any) => Promise.resolve({ data: null, error: null })
  }
};
