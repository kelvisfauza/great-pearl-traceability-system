
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
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

    // Get the employee data from request
    const { employeeData } = await req.json()
    console.log('Creating user for employee:', employeeData.email)

    // First check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(employeeData.email)
    
    if (existingUser.user) {
      console.log('User already exists:', existingUser.user.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `A user with email ${employeeData.email} already exists. Please use a different email address.` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create the authentication user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: employeeData.email,
      password: employeeData.password,
      email_confirm: true,
      user_metadata: {
        name: employeeData.name,
        role: employeeData.role
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      let errorMessage = authError.message
      
      // Handle specific auth errors
      if (authError.code === 'email_exists') {
        errorMessage = `A user with email ${employeeData.email} already exists. Please use a different email address.`
      }
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Auth user created successfully:', authData.user?.id)

    // Create the employee record
    const employeeRecord = {
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone || "",
      position: employeeData.position,
      department: employeeData.department,
      role: employeeData.role,
      salary: employeeData.salary,
      permissions: employeeData.permissions || [],
      status: "Active",
      join_date: new Date().toISOString(),
    }

    const { data: employeeData_result, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert(employeeRecord)
      .select()
      .single()

    if (employeeError) {
      console.error('Employee creation error:', employeeError)
      
      // If employee creation fails, clean up the auth user
      if (authData.user) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      }
      
      return new Response(
        JSON.stringify({ success: false, error: employeeError.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Employee record created successfully:', employeeData_result.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        employee: employeeData_result,
        user: authData.user 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
