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
    const body = await req.json();
    const { action, email, phone, code } = body;
    
    console.log('2FA request body:', JSON.stringify(body, null, 2));
    console.log('2FA request:', { action, email, phone: phone?.substring(0, 6) + '***' });
    
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

    // Check if this user can bypass SMS verification (like Timothy in IT)
    if (email) {
      const { data: canBypass } = await supabaseAdmin
        .rpc('can_bypass_sms_verification', { user_email: email });

      if (canBypass) {
        console.log(`🔓 User ${email} has SMS bypass enabled`);
        
        if (action === 'verify_code') {
          console.log('✅ Verification bypassed for authorized user');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Verification bypassed - you are authorized to access without SMS',
              bypassed: true 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (action === 'send_code') {
          console.log('✅ SMS sending bypassed for authorized user');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'SMS verification not required for your account',
              bypassed: true 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Continue with normal validation for non-bypass users
    
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

    if (action === 'send_code') {
      console.log('📱 Checking verification code eligibility for:', { email, phone: phone?.substring(0, 6) + '***' });
      
      const thirtySecondsAgo = new Date(Date.now() - (30 * 1000)); // 30 seconds ago
      const now = new Date();
      
      // First check if there's ANY existing code (regardless of age)
      const { data: existingCodes, error: existingError } = await supabaseAdmin
        .from('verification_codes')
        .select('created_at, expires_at, code, id')
        .eq('email', email)
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (existingError) {
        console.error('❌ Failed to check existing verification codes:', existingError);
        throw new Error('Failed to check verification eligibility');
      }
      
      // If there's an existing code, check if it's expired or still valid
      if (existingCodes && existingCodes.length > 0) {
        const existingCode = existingCodes[0];
        const lastCodeTime = new Date(existingCode.created_at);
        const lastCodeExpiry = new Date(existingCode.expires_at);
        const timeSinceLastCode = now.getTime() - lastCodeTime.getTime();
        const codeHasExpired = now.getTime() > lastCodeExpiry.getTime();
        
        console.log('🔍 Found existing code:', {
          id: existingCode.id,
          created: lastCodeTime.toISOString(),
          expires: lastCodeExpiry.toISOString(),
          now: now.toISOString(),
          hasExpired: codeHasExpired,
          timeSinceCreation: Math.floor(timeSinceLastCode / 1000) + ' seconds'
        });
        
        // If code has expired, delete it and IMMEDIATELY allow new code generation (skip all rate limits)
        if (codeHasExpired) {
          console.log('✅ Code has expired - deleting and immediately allowing new code');
          
          await supabaseAdmin
            .from('verification_codes')
            .delete()
            .eq('id', existingCode.id);
            
          console.log('✅ Expired code deleted - skipping all rate limit checks and proceeding with new code');
          // DO NOT check any further rate limits - proceed directly to code generation
        } 
        // If code is still valid (not expired), run rate limit checks
        else {
          // Check if code was sent less than 30 seconds ago (duplicate request)
          if (timeSinceLastCode < 30000) {
            console.log('🚫 Duplicate request - code sent less than 30 seconds ago');
            return new Response(
              JSON.stringify({
                success: false,
                error: 'A verification code was just sent. Please wait at least 30 seconds before requesting another code.'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 429,
              }
            );
          }
          
          // Check if code is within the 6-hour window
          const timeSinceCreation = now.getTime() - lastCodeTime.getTime();
          const sixHourWindow = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
          const isWithinSixHours = timeSinceCreation < sixHourWindow;
          
          if (isWithinSixHours) {
            const minutesRemaining = Math.ceil((lastCodeExpiry.getTime() - now.getTime()) / (60 * 1000));
            const hoursUntilNextCode = Math.ceil((6 * 60 * 60 * 1000 - timeSinceLastCode) / (60 * 60 * 1000));
            
            console.log('🚫 Rate limit enforced - valid code exists within 6-hour window:', {
              minutesUntilExpiry: minutesRemaining,
              hoursUntilNextCode,
              timeSinceLastCode: Math.floor(timeSinceLastCode / 1000) + ' seconds'
            });
            
            return new Response(
              JSON.stringify({
                success: false,
                error: `A valid verification code was sent and expires in ${minutesRemaining} minute(s). Please check your SMS and use that code. You can request a new code in ${hoursUntilNextCode} hour(s). Contact IT if you need assistance.`,
                lastCodeSent: lastCodeTime.toISOString(),
                expiresIn: minutesRemaining,
                nextCodeAllowedIn: hoursUntilNextCode
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 429,
              }
            );
          }
          // Code is valid but outside the 6-hour window, allow new code
          console.log('✅ Code exists but outside 6-hour window - allowing new code');
        }
      }
      
      console.log('✅ Eligible for new verification code - generating...');
      
      // Generate 5-digit verification code
      const verificationCode = Math.floor(10000 + Math.random() * 90000).toString();
      
      // Clean up any existing codes for this user (expired or older than 6 hours)
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('email', email)
        .eq('phone', phone);
      
      // Store verification code IMMEDIATELY to prevent race conditions
      const expiresAt = new Date(Date.now() + (5 * 60 * 1000)); // 5 minutes from now
      
      const { error: insertError } = await supabaseAdmin
        .from('verification_codes')
        .insert({
          email,
          phone,
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
          attempts: 0
        });
        
      if (insertError) {
        console.error('❌ Failed to store verification code:', insertError);
        throw new Error('Failed to store verification code');
      }
      
      console.log('✅ Verification code stored in database - proceeding with SMS');
      
      // Check AGAIN after storing to prevent race conditions
      const { data: duplicateCheck, error: duplicateError } = await supabaseAdmin
        .from('verification_codes')
        .select('code, created_at')
        .eq('email', email)
        .eq('phone', phone)
        .gte('created_at', sixHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(2); // Get up to 2 recent codes
        
      if (!duplicateError && duplicateCheck && duplicateCheck.length > 1) {
        // Multiple codes found - this is a duplicate request
        const timeDiff = new Date(duplicateCheck[0].created_at).getTime() - new Date(duplicateCheck[1].created_at).getTime();
        
        if (timeDiff < 10000) { // If codes were created within 10 seconds of each other
          console.log('🚫 Duplicate request detected - aborting SMS send');
          
          // Delete the newer duplicate code
          await supabaseAdmin
            .from('verification_codes')
            .delete()
            .eq('code', verificationCode);
            
          return new Response(
            JSON.stringify({
              success: false,
              error: 'A verification code was just sent. Please wait before requesting another code.'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 429,
            }
          );
        }
      }
      
      // Get user details from employees table
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('name, role, department')
        .eq('email', email)
        .single();

      let userName = 'User';
      let userRole = 'User';
      let userDepartment = '';
      
      if (employeeData && !employeeError) {
        userName = employeeData.name || 'User';
        userRole = employeeData.role || 'User';
        userDepartment = employeeData.department || '';
      } else {
        console.warn('Could not fetch employee data:', employeeError);
      }

      // Format the SMS message with department and include login link  
      const departmentText = userDepartment ? `${userDepartment} ` : '';
      const loginLink = `${Deno.env.get('SUPABASE_URL')?.replace('/v1', '')}/functions/v1/sms-login-link?code=${verificationCode}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`;
      
      const smsMessage = `${userName.split(' ')[0]} - Pearl Coffee
Code: ${verificationCode}
LINK: ${loginLink}
(5min only)`;

      console.log('📱 SMS Message prepared:', {
        messageLength: smsMessage.length,
        linkIncluded: smsMessage.includes('sms-login-link'),
        code: verificationCode
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
          message: smsMessage,
          userName: userName
        })
      });

      if (!smsResponse.ok) {
        const smsError = await smsResponse.text();
        console.error('SMS sending failed:', smsError);
        
        // Log SMS failure for IT support
        const { error: logError } = await supabaseAdmin
          .from('sms_failures')
          .insert({
            user_email: email,
            user_name: userName,
            user_phone: phone,
            verification_code: verificationCode,
            failure_reason: `SMS API Error: ${smsError}`,
            department: userDepartment,
            role: userRole
          });

        if (logError) {
          console.error('Failed to log SMS failure:', logError);
        }

        // Send notification to IT department
        try {
          // Get IT department phone numbers
          const { data: itUsers } = await supabaseAdmin
            .from('employees')
            .select('name, phone')
            .eq('department', 'IT Department')
            .eq('status', 'Active');

          if (itUsers && itUsers.length > 0) {
            for (const itUser of itUsers) {
              if (itUser.phone) {
                const itMessage = `IT ALERT: User ${userName} (${email}) failed to receive login code ${verificationCode}. Phone: ${phone}. Please assist with login.`;
                
                await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                  },
                  body: JSON.stringify({
                    phone: itUser.phone,
                    message: itMessage,
                    userName: 'IT System'
                  })
                });
                
                console.log(`IT notification sent to ${itUser.name}`);
              }
            }
          }
        } catch (itError) {
          console.error('Failed to notify IT department:', itError);
        }

        throw new Error('Failed to send verification code');
      }

      console.log('✅ Verification code sent successfully');

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
      
      console.log('🔍 Verifying code:', { email, phone: phone?.substring(0, 6) + '***', code: code?.substring(0, 2) + '***' });
      
      // Get verification code from database
      const { data: storedCodes, error: fetchError } = await supabaseAdmin
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (fetchError) {
        console.error('❌ Database error fetching verification code:', fetchError);
        throw new Error('Database error occurred');
      }
      
      console.log('📊 Database query result:', { 
        found: storedCodes?.length || 0,
        email,
        phone: phone?.substring(0, 6) + '***'
      });

      if (!storedCodes || storedCodes.length === 0) {
        console.log('❌ No verification code found in database');
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
      
      const storedData = storedCodes[0];
      console.log('📋 Found verification code:', { 
        id: storedData.id,
        attempts: storedData.attempts,
        expires_at: storedData.expires_at
      });

      // Check if code has expired
      const now = new Date();
      const expiresAt = new Date(storedData.expires_at);
      if (now > expiresAt) {
        console.log('⏰ Code has expired');
        
        // Clean up expired code
        await supabaseAdmin
          .from('verification_codes')
          .delete()
          .eq('id', storedData.id);
          
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
        console.log('🚫 Too many attempts');
        
        // Clean up the code
        await supabaseAdmin
          .from('verification_codes')
          .delete()
          .eq('id', storedData.id);
          
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
        console.log('❌ Invalid code provided');
        
        // Increment attempts
        await supabaseAdmin
          .from('verification_codes')
          .update({ attempts: storedData.attempts + 1 })
          .eq('id', storedData.id);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Invalid verification code. ${3 - (storedData.attempts + 1)} attempts remaining.`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Code is valid - clean up and return success
      console.log('✅ Code verification successful');
      
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('id', storedData.id);
      
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
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});