import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Fingerprint (WebAuthn platform authenticator) sign-in.
 *
 * action = 'begin'  -> { email }                        => { ok, credential_id }
 * action = 'finish' -> { email, credential_id }         => { ok, token_hash, verification_type, name }
 *
 * The actual fingerprint match happens inside the device's secure enclave
 * (userVerification: 'required'); this function confirms the presented
 * credential is the one enrolled for that account and issues a login token.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const origin = req.headers.get('origin')?.trim();
    const redirectTo = origin && /^https?:\/\//i.test(origin)
      ? `${origin}/auth?post_auth=fingerprint`
      : 'https://greatpearlcoffeesystem.site/auth?post_auth=fingerprint';

    const { action, email, credential_id } = await req.json().catch(() => ({} as any));
    const normalizedEmail =
      typeof email === 'string' && email.includes('@') ? email.toLowerCase().trim() : null;

    if (!normalizedEmail) return json({ ok: false, error: 'Please enter your work email.' });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: cred } = await admin
      .from('biometric_credentials')
      .select('credential_id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!cred?.credential_id) {
      return json({
        ok: false,
        error: 'No fingerprint is enrolled for this account. Sign in with your password, then enrol under Settings → Profile.',
      });
    }

    if (action === 'begin') {
      return json({ ok: true, credential_id: cred.credential_id });
    }

    if (action !== 'finish') return json({ ok: false, error: 'Invalid request.' });

    if (typeof credential_id !== 'string' || credential_id !== cred.credential_id) {
      return json({ ok: false, error: 'Fingerprint not recognized for this account.' });
    }

    const { data: employee } = await admin
      .from('employees')
      .select('name, email, disabled')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (employee?.disabled === true) {
      return json({ ok: false, error: 'This account has been disabled. Contact IT support.' });
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: employee?.email ?? normalizedEmail,
      options: { redirectTo },
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('Magic link generation failed:', linkErr);
      return json({ ok: false, error: 'Could not create login session. Please try again.' });
    }

    const authUrl = new URL(linkData.properties.action_link);
    authUrl.searchParams.set('redirect_to', redirectTo);

    console.log('✅ Fingerprint login succeeded for', normalizedEmail);

    return json({
      ok: true,
      auth_url: authUrl.toString(),
      token_hash: linkData.properties.hashed_token,
      verification_type: linkData.properties.verification_type,
      name: employee?.name ?? normalizedEmail.split('@')[0],
    });
  } catch (err) {
    console.error('fingerprint-login error:', err);
    return json({ ok: false, error: 'Server error. Please try again.' });
  }
});
