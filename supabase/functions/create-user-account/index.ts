import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, employeeId } = await req.json()

    console.log('Creating auth account for:', email)

    // Generate a random temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      throw authError
    }

    console.log('Auth user created:', authData.user.id)

    // Update the employee record with the auth_user_id
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ auth_user_id: authData.user.id })
      .eq('id', employeeId)

    if (updateError) {
      console.error('Error updating employee:', updateError)
      throw updateError
    }

    console.log('Employee record updated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auth account created and linked successfully',
        authUserId: authData.user.id,
        tempPassword: tempPassword,
        email: email
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in create-user-account:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
