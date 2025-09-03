import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory storage for verification codes (in production, use Redis or database)
const verificationCodes = new Map();

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, email, phone, code } = body;
    
    console.log('2FA request body:', JSON.stringify(body, null, 2));
    console.log('2FA request:', { action, email, phone: phone?.substring(0, 6) + '***' });
    
    // Validate required fields
    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing action parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing email parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing phone parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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

    if (action === 'send_code') {
      // Generate 5-digit verification code
      const verificationCode = Math.floor(10000 + Math.random() * 90000).toString();
      
      // Store verification code with expiry (5 minutes)
      const codeKey = `${email}_${phone}`;
      verificationCodes.set(codeKey, {
        code: verificationCode,
        expires: Date.now() + (5 * 60 * 1000), // 5 minutes
        attempts: 0
      });

      // Send SMS using existing send-sms function
      const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          phone: phone,
          message: `Your Great Pearl Coffee verification code is: ${verificationCode}. This code expires in 5 minutes.`,
          userName: 'System'
        })
      });

      if (!smsResponse.ok) {
        const smsError = await smsResponse.text();
        console.error('SMS sending failed:', smsError);
        throw new Error('Failed to send verification code');
      }

      console.log('Verification code sent successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent to your phone',
          expires_in: 300 // 5 minutes in seconds
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'verify_code') {
      // Validate code parameter for verify action
      if (!code) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing code parameter for verification' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      console.log('Verifying code:', { email, phone: phone?.substring(0, 6) + '***', code: code?.substring(0, 2) + '***' });
      
      const codeKey = `${email}_${phone}`;
      const storedData = verificationCodes.get(codeKey);
      
      console.log('Stored verification codes keys:', Array.from(verificationCodes.keys()));
      console.log('Looking for key:', codeKey);
      console.log('Stored data found:', !!storedData);

      if (!storedData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No verification code found. Please request a new code.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if code has expired
      if (Date.now() > storedData.expires) {
        verificationCodes.delete(codeKey);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Verification code has expired. Please request a new code.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check attempts limit
      if (storedData.attempts >= 3) {
        verificationCodes.delete(codeKey);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Too many failed attempts. Please request a new code.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Verify the code
      if (storedData.code !== code) {
        storedData.attempts += 1;
        verificationCodes.set(codeKey, storedData);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Invalid verification code. ${3 - storedData.attempts} attempts remaining.`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Code is valid - clean up and return success
      verificationCodes.delete(codeKey);
      
      console.log('Verification code validated successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Phone number verified successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid action. Use "send_code" or "verify_code".'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );

  } catch (error) {
    console.error('Error in 2fa-verification function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});