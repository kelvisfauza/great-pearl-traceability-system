
// Temporary compatibility layer for files not yet migrated to Firebase
// This prevents build errors while we gradually migrate components

export const supabase = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
    eq: function() { return this; },
    order: function() { return this; },
    limit: function() { return this; }
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null })
  },
  channel: () => ({
    on: () => ({ subscribe: () => ({}) }),
    unsubscribe: () => {}
  })
};
