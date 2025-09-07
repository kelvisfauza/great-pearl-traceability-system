import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token } = body;

    console.log('Auto-login request for token:', token?.substring(0, 8) + '***');
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing token parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase admin client
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

    // Verify the login token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('login_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.log('Invalid or expired token');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid or expired login token' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Mark token as used
    await supabaseAdmin
      .from('login_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    // Get employee data
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('name, email, auth_user_id')
      .eq('email', tokenData.email)
      .single();

    if (employeeError || !employee) {
      console.error('Employee not found:', employeeError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User account not found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create a session for the user using admin client
    if (employee.auth_user_id) {
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: employee.email,
      });

      if (sessionError) {
        console.error('Failed to generate auth link:', sessionError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to create authentication session' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log('✅ Auto-login successful for:', employee.email);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Auto-login successful',
          user_name: employee.name,
          auth_url: sessionData.properties?.action_link,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User account not properly configured for auto-login' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in auto-login function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});