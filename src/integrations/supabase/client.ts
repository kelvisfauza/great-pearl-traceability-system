
// Temporary compatibility layer for Firebase migration
// This provides a mock Supabase client that returns empty data to prevent build errors

const createChainableQuery = (mockData: any) => {
  const chainable = {
    select: (columns?: string) => chainable,
    insert: (data: any) => Promise.resolve({ data: null, error: null }),
    update: (data: any) => chainable,
    delete: () => chainable,
    eq: (column: any, value: any) => chainable,
    order: (column: any, options?: any) => chainable,
    limit: (count: any) => chainable,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    in: (column: any, values: any[]) => chainable,
    then: (resolve: any) => resolve(mockData)
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
