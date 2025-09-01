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
    console.log('🔧 Final Denis account fix - proper authentication setup...');

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check current employee record
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('email', 'bwambaledenis8@gmail.com')
      .single();

    if (empError || !employee) {
      console.error('❌ Employee record not found:', empError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Employee record not found for Denis'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('📋 Current employee record:', employee);

    // Check if auth user exists with this ID
    let authUser = null;
    if (employee.auth_user_id) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(employee.auth_user_id);
        if (!userError && userData?.user) {
          authUser = userData.user;
          console.log('✅ Found existing auth user:', authUser.id);
        }
      } catch (err) {
        console.log('⚠️ Auth user not found, will create new one');
      }
    }

    if (!authUser) {
      // Create new auth user
      console.log('🆕 Creating new auth user for Denis...');
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'bwambaledenis8@gmail.com',
        password: 'Denis123!',
        email_confirm: true,
        user_metadata: {
          name: employee.name,
          role: employee.role
        }
      });

      if (createError) {
        console.error('❌ Error creating auth user:', createError);
        throw createError;
      }

      authUser = newUserData.user;
      console.log('✅ New auth user created:', authUser!.id);

      // Update employee record with new auth_user_id
      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ auth_user_id: authUser!.id })
        .eq('email', 'bwambaledenis8@gmail.com');

      if (updateError) {
        console.error('❌ Error updating employee record:', updateError);
        throw updateError;
      }
    } else {
      // Update existing user's password
      console.log('🔑 Updating password for existing auth user...');
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        {
          password: 'Denis123!',
          email_confirm: true
        }
      );

      if (updateError) {
        console.error('❌ Error updating password:', updateError);
        throw updateError;
      }
    }

    // Verify everything is working
    const { data: finalEmployee, error: finalError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('email', 'bwambaledenis8@gmail.com')
      .single();

    if (finalError) {
      throw finalError;
    }

    console.log('🎉 Denis account setup completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Denis account is now properly configured like other accounts',
        email: 'bwambaledenis8@gmail.com',
        password: 'Denis123!',
        auth_user_id: authUser!.id,
        employee_id: finalEmployee.id,
        permissions: finalEmployee.permissions,
        status: finalEmployee.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('💥 Error in reset-denis-final function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});