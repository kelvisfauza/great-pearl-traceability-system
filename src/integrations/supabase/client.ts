
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { createSessionExpiryFetch, SESSION_EXPIRED_EVENT } from '@/lib/sessionExpiry'

const SUPABASE_URL = "https://pudfybkyfedeggmokhco.supabase.co"
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"

let expiryHandling = false;
async function handleExpiredSession(accessToken: string) {
  if (expiryHandling) return;
  expiryHandling = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    // Ignore an old failed request if automatic refresh or a new login replaced it.
    if (session && session.access_token !== accessToken) return;
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    await supabase.auth.signOut({ scope: 'local' });
  } finally {
    expiryHandling = false;
  }
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: createSessionExpiryFetch(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, token => {
      void handleExpiredSession(token).catch(() => { /* Original request still reports its error. */ });
    }),
  },
})
