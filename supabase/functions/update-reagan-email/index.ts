import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const userId = '48c1c62f-b587-4441-ba8d-06048582bac8';
    const newEmail = 'muhindoreagan@greatpearlcoffee.com';
    const oldEmail = 'info.rhiganmuhindo@gmail.com';

    // Update the Auth user email to the company email and keep it confirmed.
    const { data: userData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email: newEmail,
        email_confirm: true,
        user_metadata: {
          name: 'Muhindo Reagan',
          department: 'Store',
          role: 'User'
        }
      }
    );

    if (updateError) {
      console.error('Failed to update auth user email:', updateError);
      return new Response(
        JSON.stringify({ ok: false, error: updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Make sure the employee record is consistent.
    const { error: empError } = await supabaseAdmin
      .from('employees')
      .update({
        email: newEmail,
        alt_email: oldEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'd3322fa5-a1d8-417f-b14b-005b0e3753c3');

    if (empError) {
      console.error('Failed to update employee record:', empError);
      return new Response(
        JSON.stringify({ ok: false, error: empError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Move existing trusted device records over to the new email so Reagan isn't forced to re-verify.
    const { error: deviceError } = await supabaseAdmin
      .from('device_sessions')
      .update({ user_email: newEmail, updated_at: new Date().toISOString() })
      .eq('user_email', oldEmail);

    if (deviceError) {
      console.warn('Device session email update failed (non-blocking):', deviceError);
    }

    console.log('✅ Reagan auth email updated to:', newEmail);

    return new Response(
      JSON.stringify({ ok: true, email: newEmail, alt_email: oldEmail, auth_user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in update-reagan-email:', error);
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
