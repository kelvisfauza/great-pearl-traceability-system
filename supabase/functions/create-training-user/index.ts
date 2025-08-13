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
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Creating training user authentication account...');

    // Create authentication user for training account
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'training@company.com',
      password: 'TrainingPass123!',
      email_confirm: true,
      user_metadata: {
        name: 'Training User',
        role: 'training',
        is_training_account: true
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // If user already exists, that's okay for training purposes
      if (authError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Training user already exists',
            credentials: {
              email: 'training@company.com',
              password: 'TrainingPass123!'
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('Training auth user created successfully:', authUser.user?.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Training user created successfully',
        user_id: authUser.user?.id,
        credentials: {
          email: 'training@company.com',
          password: 'TrainingPass123!'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});