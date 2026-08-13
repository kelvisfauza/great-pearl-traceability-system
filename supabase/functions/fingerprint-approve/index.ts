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
 * Fingerprint confirmation for money/finance approvals.
 *
 * action = 'begin'  -> { email }                => { ok, credential_id, name }
 * action = 'finish' -> { email, credential_id, context } => { ok, name }
 *
 * The fingerprint match happens in the phone's secure enclave
 * (userVerification: 'required'); this function only confirms the presented
 * credential is the one enrolled for that admin account and audits the event.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, email, credential_id, context } = await req.json().catch(() => ({} as any));
    const normalizedEmail =
      typeof email === 'string' && email.includes('@') ? email.toLowerCase().trim() : null;

    if (!normalizedEmail) return json({ ok: false, error: 'Missing approver email.' });

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

    const { data: employee } = await admin
      .from('employees')
      .select('name, email, disabled')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (employee?.disabled === true) {
      return json({ ok: false, error: 'This account has been disabled. Contact IT support.' });
    }

    const displayName = employee?.name ?? normalizedEmail.split('@')[0];

    // ---- First-time enrolment straight from the scanned phone link ----
    if (action === 'enroll_begin') {
      if (cred?.credential_id) {
        return json({ ok: false, error: 'A fingerprint is already enrolled for this account.' });
      }
      return json({ ok: true, name: displayName });
    }

    if (action === 'enroll_finish') {
      if (cred?.credential_id) {
        return json({ ok: false, error: 'A fingerprint is already enrolled for this account.' });
      }
      if (typeof credential_id !== 'string' || credential_id.length < 16) {
        return json({ ok: false, error: 'Could not register this device.' });
      }
      const { error: insErr } = await admin
        .from('biometric_credentials')
        .insert({ email: normalizedEmail, credential_id });
      if (insErr) {
        console.error('enrol insert failed:', insErr);
        return json({ ok: false, error: 'Could not save this device. Please try again.' });
      }
      await admin.from('audit_logs').insert({
        action: 'FINGERPRINT_ENROLLED_VIA_APPROVAL_LINK',
        table_name: 'biometric_credentials',
        user_email: normalizedEmail,
        new_values: context ?? {},
      });
      return json({ ok: true, name: displayName });
    }

    if (!cred?.credential_id) {
      return json({
        ok: false,
        needs_enrollment: true,
        error: 'No fingerprint is enrolled for this account yet.',
      });
    }

    if (action === 'begin') {
      return json({
        ok: true,
        credential_id: cred.credential_id,
        name: displayName,
      });
    }

    if (action !== 'finish') return json({ ok: false, error: 'Invalid request.' });

    if (typeof credential_id !== 'string' || credential_id !== cred.credential_id) {
      return json({ ok: false, error: 'Fingerprint not recognized for this account.' });
    }

    await admin.from('audit_logs').insert({
      action: 'FINGERPRINT_APPROVAL_CONFIRMED',
      table_name: 'approval_requests',
      user_email: normalizedEmail,
      new_values: context ?? {},
    }).then(({ error }) => {
      if (error) console.warn('audit log failed:', error.message);
    });

    console.log('✅ Fingerprint approval confirmed for', normalizedEmail);

    return json({ ok: true, name: displayName });
  } catch (err) {
    console.error('fingerprint-approve error:', err);
    return json({ ok: false, error: 'Server error. Please try again.' });
  }
});
