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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key for admin operations
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

    const { email, password, name, department, position, phone } = await req.json() as CreateAdminRequest

    console.log(`Creating Super Admin account for: ${email}`)

    // Create the auth user with email confirmation bypassed
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin users
      user_metadata: {
        name,
        role: 'Super Admin'
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('No user data returned from auth creation')
    }

    console.log(`✅ Auth user created: ${authData.user.id}`)

    // Create employee record
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
        permissions: ['*'], // All permissions
        status: 'Active',
        salary: 0,
        bypass_sms_verification: true // Skip SMS verification for admins
      })
      .select()
      .single()

    if (employeeError) {
      console.error('Error creating employee record:', employeeError)
      
      // Cleanup: Delete the auth user if employee creation fails
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