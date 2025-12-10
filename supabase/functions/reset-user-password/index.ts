import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify the caller is an authenticated admin
async function verifyAdminCaller(req: Request, supabaseAdmin: any): Promise<{ isAdmin: boolean; callerEmail?: string; error?: string }> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { isAdmin: false, error: 'Missing authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  
  if (userError || !user) {
    return { isAdmin: false, error: 'Invalid or expired token' }
  }

  const { data: employee, error: empError } = await supabaseAdmin
    .from('employees')
    .select('role, email')
    .eq('auth_user_id', user.id)
    .single()

  if (empError || !employee) {
    return { isAdmin: false, error: 'Employee record not found' }
  }

  const adminRoles = ['Super Admin', 'Administrator']
  if (!adminRoles.includes(employee.role)) {
    return { isAdmin: false, error: 'Insufficient permissions - admin role required' }
  }

  return { isAdmin: true, callerEmail: employee.email }
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
    const { isAdmin, callerEmail, error: authError } = await verifyAdminCaller(req, supabaseAdmin)
    if (!isAdmin) {
      console.error('Authorization failed:', authError)
      return new Response(
        JSON.stringify({ error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, newPassword } = await req.json()

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Email and new password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (getUserError) {
      console.error('Error listing users:', getUserError)
      throw getUserError
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      throw updateError
    }

    // Log the password reset action (without the password itself)
    console.log(`Password reset by admin ${callerEmail} for user: ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password updated successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in reset-user-password function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
