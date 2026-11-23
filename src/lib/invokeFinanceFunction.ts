import { supabase } from '@/integrations/supabase/client';

/** Resolve the current session before sending Finance requests; never retry payment actions. */
export async function invokeFinanceFunction(name: string, options?: { body?: Record<string, unknown> }) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    return { data: { ok: false, error: 'Please sign in again.' }, error: null };
  }
  return supabase.functions.invoke(name, {
    ...options,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}