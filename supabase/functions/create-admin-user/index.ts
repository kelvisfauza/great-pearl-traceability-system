import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminRequest {
  email: string;
  password: string;
  name: string;
  department: string;
  position: string;
  phone?: string;
}

// Verify the caller is an existing Super Admin
async function verifySuperAdminCaller(req: Request, supabaseAdmin: any): Promise<{ isAdmin: boolean; error?: string }> {
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
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (empError || !employee) {
    return { isAdmin: false, error: 'Employee record not found' }
  }

  // Only existing Super Admin can create new Super Admin accounts
  if (employee.role !== 'Super Admin') {
    return { isAdmin: false, error: 'Insufficient permissions - only Super Admin can create admin accounts' }
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

    // Verify caller is Super Admin
    const { isAdmin, error: authError } = await verifySuperAdminCaller(req, supabaseAdmin)
    if (!isAdmin) {
      console.error('Authorization failed:', authError)
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, name, department, position, phone } = await req.json() as CreateAdminRequest

    console.log(`Creating Super Admin account for: ${email}`)

    const { data: authData, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'Super Admin'
      }
    })

    if (authError2) {
      console.error('Error creating auth user:', authError2)
      throw authError2
    }

    if (!authData.user) {
      throw new Error('No user data returned from auth creation')
    }

    console.log(`✅ Auth user created: ${authData.user.id}`)

    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        auth_user_id: authData.user.id,
        email: email.toLowerCase(),
        name,
        department,
        position,
        phone: phone || '',
        role: 'Super Admin',
        permissions: ['*'],
        status: 'Active',
        salary: 0,
        bypass_sms_verification: true
      })
      .select()
      .single()

    if (employeeError) {
      console.error('Error creating employee record:', employeeError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw employeeError
    }

    console.log(`✅ Employee record created: ${employeeData.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Super Admin account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          email_confirmed: true
        },
        employee: employeeData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in create-admin-user function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
