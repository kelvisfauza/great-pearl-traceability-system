import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user is admin
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('role')
      .eq('email', email)
      .single();

    if (employeeError) {
      console.error('Error fetching employee:', employeeError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin users can access from anywhere
    if (employee.role === 'Administrator') {
      console.log(`✅ Admin user ${email} - network check bypassed`);
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          reason: 'Admin access granted from any network',
          isAdmin: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-admin users, check IP address
    const clientIp = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    console.log(`Checking network access for ${email} from IP: ${clientIp}`);

    // Check if IP is whitelisted
    const { data: whitelistCheck } = await supabase
      .rpc('is_ip_whitelisted', { check_ip: clientIp });

    if (whitelistCheck) {
      console.log(`✅ IP ${clientIp} is whitelisted - access granted`);
      return new Response(
        JSON.stringify({ 
          allowed: true, 
          reason: 'Access granted from factory network',
          ip: clientIp,
          isAdmin: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IP not whitelisted
    console.log(`❌ IP ${clientIp} is not whitelisted - access denied`);
    return new Response(
      JSON.stringify({ 
        allowed: false, 
        reason: 'Access denied. You must be connected to the Great Pearl Coffee Factory network to login.',
        ip: clientIp,
        isAdmin: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking network access:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
