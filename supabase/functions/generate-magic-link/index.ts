import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, email, phone } = await req.json();

    if (!code || !email || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the code exists and is valid
    const { data: verificationRecord, error: verifyError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('phone', phone)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (verifyError || !verificationRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired code' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mark code as used
    await supabaseAdmin
      .from('verification_codes')
      .update({ attempts: verificationRecord.attempts + 1 })
      .eq('id', verificationRecord.id);

    // Get employee data
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('auth_user_id, name, email')
      .eq('email', email)
      .eq('phone', phone)
      .single();

    if (employeeError || !employee || !employee.auth_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found or not authorized for auto-login' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate magic link
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: employee.email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/`
      }
    });

    if (magicLinkError || !magicLinkData?.properties?.action_link) {
      console.error('Magic link generation failed:', magicLinkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate login link' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        magicLink: magicLinkData.properties.action_link,
        user: {
          id: employee.auth_user_id,
          email: employee.email,
          name: employee.name
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Generate magic link error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});