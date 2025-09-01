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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔄 Resetting Kibaba password...')

    // Update the user's password using admin API
    const { data: userData, error: userError } = await supabase.auth.admin.updateUserById(
      '5fe8c99d-ee15-484d-8765-9bd4b37f961f',
      { 
        password: 'Yedascott',
        email_confirm: true // Ensure email is confirmed
      }
    )

    if (userError) {
      console.error('❌ Error updating user password:', userError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Password updated successfully for:', userData.user.email)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully',
        user: {
          id: userData.user.id,
          email: userData.user.email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})