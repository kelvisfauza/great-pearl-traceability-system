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
    console.log('Starting Denis password reset process...');

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

    // First, try to find if Denis's auth user exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    console.log('Total users found:', users.users.length);
    
    let denisUser = users.users.find(user => user.email === 'bwambaledenis8@gmail.com');
    
    if (denisUser) {
      console.log('Found existing Denis user:', denisUser.id);
      
      // Update password for existing user
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        denisUser.id,
        {
          password: 'Denis123!',
          email_confirm: true
        }
      );
      
      if (updateError) {
        console.error('Error updating Denis password:', updateError);
        throw updateError;
      }
      
      console.log('Password updated successfully');
      
      // Update employee record with auth_user_id
      const { error: empUpdateError } = await supabaseAdmin
        .from('employees')
        .update({ auth_user_id: denisUser.id })
        .eq('email', 'bwambaledenis8@gmail.com');

      if (empUpdateError) {
        console.error('Error updating employee record:', empUpdateError);
        // Don't throw here, password reset was successful
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Denis password reset successfully',
          user_id: denisUser.id,
          action: 'password_reset'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      console.log('Denis user not found, creating new user...');
      
      // Create new user
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
        console.error('Error creating Denis user:', createError);
        throw createError;
      }

      console.log('New user created:', newUser.user?.id);

      // Update employee record
      const { error: empUpdateError } = await supabaseAdmin
        .from('employees')
        .update({ auth_user_id: newUser.user?.id })
        .eq('email', 'bwambaledenis8@gmail.com');

      if (empUpdateError) {
        console.error('Error updating employee record:', empUpdateError);
        throw empUpdateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Denis account created successfully',
          user_id: newUser.user?.id,
          action: 'user_created'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

  } catch (error) {
    console.error('Error in reset-denis-password function:', error);
    
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