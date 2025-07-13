
// Temporary compatibility layer for Firebase migration
// This provides a mock Supabase client that returns empty data to prevent build errors

const createChainableQuery = (mockData: any) => {
  const chainable = {
    select: (columns?: string) => chainable,
    insert: (data: any) => chainable,
    update: (data: any) => chainable,
    delete: () => chainable,
    eq: (column: any, value: any) => chainable,
    order: (column: any, options?: any) => chainable,
    limit: (count: any) => chainable,
    in: (column: any, values: any[]) => chainable,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    // Add data and error properties for immediate access
    data: mockData.data || [],
    error: mockData.error || null
  };
  
  return chainable;
};

export const supabase = {
  from: (table: string) => createChainableQuery({ data: [], error: null }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    updateUser: (updates: any) => Promise.resolve({ data: { user: null }, error: null })
  },
  channel: (name: string) => ({
    on: (event: string, callback: any) => ({ subscribe: () => {} }),
    subscribe: () => {}
  }),
  functions: {
    invoke: (name: string, options?: any) => Promise.resolve({ data: null, error: null })
  }
};
