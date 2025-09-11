import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const email = url.searchParams.get('email');
    const phone = url.searchParams.get('phone');

    if (!code || !email || !phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('SMS login link accessed with params:', { code, email, phone });

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the code exists and is valid
    const { data: verificationRecord, error: verifyError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('phone', phone)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    console.log('Verification record result:', { verificationRecord, verifyError });

    if (verifyError || !verificationRecord) {
      // Generate HTML response for invalid/expired code
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Code - FarmFlow</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .error { color: #dc2626; margin-bottom: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
            .button:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>⚠️ Invalid or Expired Code</h2>
            <p class="error">This verification link has expired or is invalid.</p>
            <p>Please return to the login page and request a new verification code.</p>
            <a href="/" class="button">Return to Login</a>
          </div>
        </body>
        </html>
      `;
      
      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      });
    }

    // Mark code as used by incrementing attempts
    await supabase
      .from('verification_codes')
      .update({ attempts: verificationRecord.attempts + 1 })
      .eq('id', verificationRecord.id);

    // Get employee data for authentication
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('auth_user_id, name, email')
      .eq('email', email)
      .eq('phone', phone)
      .single();

    console.log('Employee lookup result:', { employee, employeeError });

    if (employeeError || !employee) {
      console.error('Employee not found:', employeeError);
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Not Found - FarmFlow</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .error { color: #dc2626; margin-bottom: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>❌ User Not Found</h2>
            <p class="error">We couldn't find your account. Please contact support.</p>
            <a href="/" class="button">Return to Login</a>
          </div>
        </body>
        </html>
      `;
      
      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      });
    }

    // Generate simple response with code
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Code - FarmFlow</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
          .code { font-size: 32px; font-weight: bold; color: #2563eb; margin: 20px 0; padding: 20px; border: 2px dashed #2563eb; border-radius: 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          .button:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Your Login Code</h2>
          <p>Use this code to login to FarmFlow:</p>
          <div class="code">${code}</div>
          <p>Enter this code on the login page to access your account.</p>
          <a href="https://id-preview--0ab47c69-3f36-4407-b03c-de1f9684ac9a.lovable.app/auth" class="button">Go to Login Page</a>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
      status: 200,
    });

  } catch (error) {
    console.error('SMS login link error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});