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
    console.log('Creating Denis auth account...');

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

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(user => user.email === 'bwambaledenis8@gmail.com');
    
    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      
      // Update employee record with existing auth_user_id
      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({ auth_user_id: existingUser.id })
        .eq('email', 'bwambaledenis8@gmail.com');

      if (updateError) {
        console.error('Error updating employee record:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Denis account linked successfully',
          user: existingUser,
          password: 'Use existing password or reset if needed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create new user if doesn't exist
    console.log('Creating new auth user for Denis...');
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'bwambaledenis8@gmail.com',
      password: 'Denis123!',
      email_confirm: true,
      user_metadata: {
        name: 'bwambale denis',
        role: 'User'
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', newUser.user?.id);

    // Update employee record
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ auth_user_id: newUser.user?.id })
      .eq('email', 'bwambaledenis8@gmail.com');

    if (updateError) {
      console.error('Error updating employee record:', updateError);
      throw updateError;
    }

    console.log('Employee record updated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Denis account created successfully',
        user: newUser.user,
        credentials: {
          email: 'bwambaledenis8@gmail.com',
          password: 'Denis123!'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-denis-account function:', error);
    
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