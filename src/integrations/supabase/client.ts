
// Enhanced compatibility layer for gradual migration from Supabase to Firebase
// This provides better API compatibility to prevent build errors

const createQueryBuilder = () => ({
  select: (columns = '*') => createQueryBuilder(),
  insert: (data) => createQueryBuilder(),
  update: (data) => createQueryBuilder(),
  delete: () => createQueryBuilder(),
  eq: (column, value) => createQueryBuilder(),
  order: (column, options) => createQueryBuilder(),
  limit: (count) => createQueryBuilder(),
  single: () => Promise.resolve({ data: null, error: null }),
  maybeSingle: () => Promise.resolve({ data: null, error: null }),
  then: (resolve) => resolve({ data: [], error: null, count: 0 })
});

export const supabase = {
  from: (table) => createQueryBuilder(),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    updateUser: (updates) => Promise.resolve({ data: null, error: null })
  },
  channel: (topic) => ({
    on: (type, filter, callback) => ({ subscribe: () => ({}) }),
    unsubscribe: () => {},
    track: (state) => Promise.resolve('ok')
  }),
  functions: {
    invoke: (name, options) => Promise.resolve({ data: null, error: null })
  }
};
