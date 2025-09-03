
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
    const { employeeData, linkExisting = false } = await req.json()
    console.log('🔧 Processing user creation:', { 
      email: employeeData.email, 
      linkExisting, 
      name: employeeData.name 
    })

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
      console.error('❌ Auth error:', authError)
      let errorMessage = authError.message
      
      // Handle specific auth errors
      if (authError.message?.includes('User already registered')) {
        errorMessage = `A user with email ${employeeData.email} already exists. Please use a different email address.`
      } else if (authError.message?.includes('email')) {
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

    console.log('✅ Auth user created successfully:', authData.user?.id)

    let employeeData_result
    
    if (linkExisting) {
      // Link to existing employee record
      console.log('🔗 Linking to existing employee record...')
      
      // Find existing employee
      const { data: existingEmployees, error: findError } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('email', employeeData.email)
        .limit(1)

      if (findError) {
        console.error('❌ Error finding employee:', findError)
        // Clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw findError
      }

      if (!existingEmployees || existingEmployees.length === 0) {
        console.error('❌ No employee found with email:', employeeData.email)
        // Clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw new Error(`No employee record found for email: ${employeeData.email}`)
      }

      const existingEmployee = existingEmployees[0]
      console.log('📋 Found existing employee:', { id: existingEmployee.id, name: existingEmployee.name })

      // Update existing employee with auth_user_id
      const { data: updatedEmployee, error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ auth_user_id: authData.user.id })
        .eq('id', existingEmployee.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error linking employee to auth user:', updateError)
        // Clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw updateError
      }

      employeeData_result = updatedEmployee
      console.log('✅ Employee record linked to auth user successfully')

    } else {
      // Create new employee record (original behavior)
      console.log('📝 Creating new employee record...')
      
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
        auth_user_id: authData.user.id
      }

      const { data: newEmployee, error: employeeError } = await supabaseAdmin
        .from('employees')
        .insert(employeeRecord)
        .select()
        .single()

      if (employeeError) {
        console.error('❌ Employee creation error:', employeeError)
        
        // Clean up auth user
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
      
      employeeData_result = newEmployee
      console.log('✅ Employee record created successfully:', employeeData_result.id)
    }

    // Create audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: linkExisting ? 'auth_user_linked_to_existing_employee' : 'auth_user_and_employee_created',
        table_name: 'employees',
        record_id: employeeData_result.id,
        reason: linkExisting ? 'Admin linked auth account to existing employee' : 'Admin created new auth account and employee',
        performed_by: 'System',
        department: 'IT',
        record_data: {
          auth_user_id: authData.user.id,
          employee_email: employeeData.email,
          employee_name: employeeData_result.name,
          link_existing: linkExisting
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: linkExisting 
          ? `Auth account created and linked to existing employee: ${employeeData_result.name}`
          : `New auth account and employee created: ${employeeData_result.name}`,
        employee: employeeData_result,
        user: authData.user 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
