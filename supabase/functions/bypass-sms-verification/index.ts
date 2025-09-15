import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, action } = await req.json()

    console.log(`🔐 SMS Bypass request: { email: "${email}", action: "${action}" }`)

    // Check if user can bypass SMS verification
    const { data: canBypass, error: bypassError } = await supabase
      .rpc('can_bypass_sms_verification', { user_email: email })

    if (bypassError) {
      console.error('❌ Error checking bypass permission:', bypassError)
      throw bypassError
    }

    if (canBypass) {
      console.log(`✅ User ${email} can bypass SMS verification`)
      
      if (action === 'verify_code') {
        // For bypass users, always return success for verification
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Verification bypassed for authorized user',
            bypassed: true
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      } else if (action === 'send_code') {
        // For bypass users, don't send SMS but return success
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'SMS sending bypassed for authorized user',
            bypassed: true
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
    }

    // If not a bypass user, return that normal SMS flow should be used
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'User must use normal SMS verification',
        bypass: false
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ SMS Bypass error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'SMS bypass check failed' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})