import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify the caller is an authenticated admin
async function verifyAdminCaller(req: Request, supabaseAdmin: any): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { isAdmin: false, error: 'Missing authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Verify the JWT and get user
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  
  if (userError || !user) {
    return { isAdmin: false, error: 'Invalid or expired token' }
  }

  // Check if user is admin in employees table
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employees')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (empError || !employee) {
    return { isAdmin: false, error: 'Employee record not found' }
  }

  const adminRoles = ['Super Admin', 'Administrator']
  if (!adminRoles.includes(employee.role)) {
    return { isAdmin: false, error: 'Insufficient permissions - admin role required' }
  }

  return { isAdmin: true }
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

    // Verify caller is admin
    const { isAdmin, error: authError } = await verifyAdminCaller(req, supabaseAdmin)
    if (!isAdmin) {
      console.error('Authorization failed:', authError)
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, employeeId, phone } = await req.json()

    console.log('Creating auth account for:', email)

    // Generate a random temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`

    // Create the auth user
    const { data: authData, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError2) {
      console.error('Error creating auth user:', authError2)
      throw authError2
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

    // Send temporary password via SMS if phone provided
    if (phone) {
      try {
        const smsMessage = `Great Pearl Coffee: Your account has been created. Email: ${email}, Temporary Password: ${tempPassword}. Please login at www.greatpearlcoffeesystem.site and change your password.`
        
        // Call the send-sms function internally
        const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            phone: phone,
            message: smsMessage,
            userName: email,
            messageType: 'account_creation'
          })
        })
        
        if (smsResponse.ok) {
          console.log('Temporary password sent via SMS')
        } else {
          console.error('Failed to send SMS with credentials')
        }
      } catch (smsError) {
        console.error('SMS sending error:', smsError)
      }
    }

    // SECURITY: Do not return the password in the response
    return new Response(
      JSON.stringify({
        success: true,
        message: phone 
          ? 'Auth account created. Temporary password sent via SMS.' 
          : 'Auth account created. Please notify the user of their temporary password securely.',
        authUserId: authData.user.id,
        email: email,
        passwordSentViaSms: !!phone
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
