import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { temporaryPassword } from '../_shared/secure-random.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { deliveryAccepted } from '../_shared/message-policy.ts';

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

    const { email, employeeId } = await req.json();
    const { data: savedEmployee, error: savedError } = await supabaseAdmin.from('employees')
      .select('email,phone,disabled,status').eq('id', employeeId).maybeSingle();
    if (savedError || !savedEmployee || savedEmployee.disabled === true || String(savedEmployee.status).toLowerCase() !== 'active' || String(savedEmployee.email).toLowerCase() !== String(email).toLowerCase()) {
      return new Response(JSON.stringify({ success: false, error: 'Choose a saved active employee with the matching email.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const phone = savedEmployee.phone;
    let passwordSentViaSms = false;

    console.log('Creating auth account for:', email)

    // Generate a random temporary password
    const tempPassword = temporaryPassword()

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
        const smsMessage = `Great Agro Coffee: Your account has been created. Email: ${email}, Temporary Password: ${tempPassword}. Please login at www.greatagrocoffeesystem.site and change your password.`
        
        // Call the send-sms function internally
        const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            phone: phone,
            message: smsMessage,
            userName: email,
            messageType: 'account_creation'
          })
        })
        
        passwordSentViaSms = deliveryAccepted(smsResponse.ok, await smsResponse.json().catch(() => null));
        if (passwordSentViaSms) {
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
        message: passwordSentViaSms
          ? 'Auth account created. Temporary password sent via SMS.' 
          : 'Auth account created. Please notify the user of their temporary password securely.',
        authUserId: authData.user.id,
        email: email,
        passwordSentViaSms
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
        error: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
