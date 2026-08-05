import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'profile_pictures';

/** Extracts the storage object path from a stored avatar value. */
function extractPath(value: string | null): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return raw.replace(new RegExp(`^${BUCKET}/`), '');
  const m = raw.match(new RegExp(`/storage/v1/object/(?:public|sign)/${BUCKET}/([^?#]+)`, 'i'));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Returns a short-lived signed URL for one employee's profile photo.
 *
 * The /employee/:id QR page is intentionally public, so this endpoint is
 * anonymous — but it only ever exposes the single photo belonging to the
 * looked-up employee, never a listing of the private bucket.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lookup } = await req.json().catch(() => ({ lookup: null }));

    if (!lookup || typeof lookup !== 'string' || lookup.length > 128) {
      return new Response(JSON.stringify({ ok: false, error: 'A valid employee lookup is required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Reuse the same public profile RPC the QR page already relies on,
    // so this endpoint can never surface more than that page already shows.
    const { data, error } = await admin.rpc('get_public_employee_profile', { _lookup: lookup });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const path = extractPath(row?.emp_avatar_url ?? null);

    if (!path) {
      return new Response(JSON.stringify({ ok: true, url: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signed, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 15);

    if (signError) throw signError;

    return new Response(JSON.stringify({ ok: true, url: signed?.signedUrl ?? null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('public-employee-avatar error:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Unable to load profile photo' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
