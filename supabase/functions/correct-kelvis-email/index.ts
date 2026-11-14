import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// One-account correction, invoked only by the private scheduler credential.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const reply = (body: object, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (req.method !== 'POST') return reply({ ok: false, error: 'Method not allowed' }, 405);
  const secret = req.headers.get('x-internal-secret');
  if (!secret) return reply({ ok: false, error: 'Unauthorized' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data: valid, error: secretError } = await admin.rpc('verify_internal_edge_secret', { p_secret: secret });
  if (secretError || valid !== true) return reply({ ok: false, error: 'Unauthorized' }, 401);
  const userId = '42f96d36-942d-4d63-8bd3-44f573bb1f37';
  const oldEmail = 'kelvifauza@gmail.com';
  const newEmail = 'kelvisfauza@gmail.com';
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return reply({ ok: false, error: 'Account unavailable' });
  if (data.user.email === newEmail) return reply({ ok: true, alreadyCorrect: true });
  if (data.user.email !== oldEmail) return reply({ ok: false, error: 'Account email changed; correction stopped' });
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { email: newEmail, email_confirm: true });
  return reply(updateError ? { ok: false, error: 'Email correction failed' } : { ok: true });
});