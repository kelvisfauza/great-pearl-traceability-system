import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verifies a face descriptor server-side and, on match, returns a magic-link
 * action URL that signs the user in without password / OTP.
 *
 * Body: { email: string, descriptor: number[] }
 * Response (200):
 *   { ok: true, auth_url: string, name: string } on match
 *   { ok: false, error: string }                  on no-match / no-credential / disabled
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

   try {
     const { email, descriptor } = await req.json().catch(() => ({}));

     if (
       !Array.isArray(descriptor) ||
       descriptor.length !== 128 ||
       !descriptor.every((n) => typeof n === 'number' && Number.isFinite(n))
     ) {
       return new Response(
         JSON.stringify({ ok: false, error: 'Invalid face data. Please try again.' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
       );
     }

     const normalizedEmail =
       typeof email === 'string' && email.includes('@') ? email.toLowerCase().trim() : null;

     const supabaseAdmin = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
       { auth: { autoRefreshToken: false, persistSession: false } },
     );

     let resolvedEmail: string | null = null;

     if (normalizedEmail) {
       // Targeted verification against a specific email
       const { data: matchedUserId, error: verifyErr } = await supabaseAdmin.rpc(
         'verify_face_descriptor',
         { p_email: normalizedEmail, p_descriptor: descriptor },
       );
       if (verifyErr) {
         console.error('Face verify RPC failed:', verifyErr);
         return new Response(
           JSON.stringify({ ok: false, error: 'Verification failed. Please try again.' }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
         );
       }
       if (!matchedUserId) {
         return new Response(
           JSON.stringify({ ok: false, error: 'Face not recognized.' }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
         );
       }
       resolvedEmail = normalizedEmail;
     } else {
       // Auto-identify: search all enrolled faces for the closest match
       const { data: idRows, error: idErr } = await supabaseAdmin.rpc(
         'identify_face_descriptor',
         { p_descriptor: descriptor },
       );
       if (idErr) {
         console.error('Face identify RPC failed:', idErr);
         return new Response(
           JSON.stringify({ ok: false, error: 'Verification failed. Please try again.' }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
         );
       }
       const match = Array.isArray(idRows) ? idRows[0] : null;
       if (!match?.email) {
         return new Response(
           JSON.stringify({ ok: false, error: 'Face not recognized. Try again or sign in with email.' }),
           { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
         );
       }
       resolvedEmail = String(match.email).toLowerCase().trim();
       console.log('🤖 Auto-identified face as', resolvedEmail, 'distance=', match.distance);
     }

     // Block disabled accounts (matches the rest of the app's auth policy)
     const { data: employee } = await supabaseAdmin
       .from('employees')
       .select('name, email, disabled')
       .ilike('email', resolvedEmail!)
       .maybeSingle();

    if (employee?.disabled === true) {
      return new Response(
        JSON.stringify({ ok: false, error: 'This account has been disabled. Contact IT support.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

     // Generate a one-time magic link to sign the user in
     const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
       type: 'magiclink',
       email: employee?.email ?? resolvedEmail!,
     });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('Magic link generation failed:', linkErr);
      return new Response(
        JSON.stringify({ ok: false, error: 'Could not create login session. Please try again.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

     console.log('✅ Face-login succeeded for', resolvedEmail);

    return new Response(
      JSON.stringify({
        ok: true,
        auth_url: linkData.properties.action_link,
         name: employee?.name ?? resolvedEmail!.split('@')[0],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('face-login error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error. Please try again.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});