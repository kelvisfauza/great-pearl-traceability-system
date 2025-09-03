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
    console.log('🔧 Starting final Denis auth fix...');

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

    // Get Denis's employee record
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('email', 'bwambaledenis8@gmail.com')
      .single();

    if (empError || !employee) {
      console.error('❌ Denis employee record not found:', empError);
      throw new Error('Denis employee record not found');
    }

    console.log('📋 Denis employee found:', employee.email, 'Auth ID:', employee.auth_user_id);

    // Check if auth user exists (only if auth_user_id is not null)
    let authUser = null;
    let authError = null;

    if (employee.auth_user_id) {
      const result = await supabaseAdmin.auth.admin.getUserById(employee.auth_user_id);
      authUser = result.data;
      authError = result.error;
    }

    if (!employee.auth_user_id || authError || !authUser?.user) {
      console.log('🆕 Auth user not found, creating new one...');
      
      // Create new auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'bwambaledenis8@gmail.com',
        password: 'Denis123!',
        email_confirm: true,
        user_metadata: {
          name: employee.name,
          role: employee.role
        }
      });

      if (createError || !newUser.user) {
        console.error('❌ Failed to create auth user:', createError);
        throw createError;
      }

      console.log('✅ New auth user created:', newUser.user.id);

      // Update employee record with new auth_user_id
      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ auth_user_id: newUser.user.id })
        .eq('email', 'bwambaledenis8@gmail.com');

      if (updateError) {
        console.error('❌ Failed to update employee record:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Denis account created successfully with proper authentication',
          auth_user_id: newUser.user.id,
          email: 'bwambaledenis8@gmail.com',
          password: 'Denis123!',
          action: 'created_new_user'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      console.log('🔄 Auth user exists, updating password...');
      
      // Update existing user password
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.user.id,
        {
          password: 'Denis123!',
          email_confirm: true
        }
      );

      if (updateError) {
        console.error('❌ Failed to update password:', updateError);
        throw updateError;
      }

      console.log('✅ Password updated successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Denis password updated successfully',
          auth_user_id: authUser.user.id,
          email: 'bwambaledenis8@gmail.com',
          password: 'Denis123!',
          action: 'updated_existing_user'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

  } catch (error) {
    console.error('💥 Error in fix-denis-final function:', error);
    
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