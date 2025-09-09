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

    // Show approval page instead of automatic login
    console.log('Returning approval page for employee:', employee?.name);
    const approvalPageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Approval - Great Pearl Coffee</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 100%;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #8B4513, #D2691E);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            color: white;
            font-weight: bold;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .user-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .user-name {
            font-weight: 600;
            color: #333;
            font-size: 18px;
            margin-bottom: 5px;
        }
        .user-email {
            color: #666;
            font-size: 14px;
        }
        .code-display {
            background: #e9ecef;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 20px;
            font-weight: bold;
            color: #333;
            letter-spacing: 2px;
            border: 2px dashed #8B4513;
        }
        .approve-btn {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s ease;
            margin-bottom: 15px;
        }
        .approve-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);
        }
        .approve-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        .manual-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            margin: 10px 5px;
            width: 100%;
        }
        .cancel-btn {
            background: none;
            color: #666;
            border: none;
            padding: 12px;
            font-size: 14px;
            cursor: pointer;
            text-decoration: underline;
        }
        .loading {
            display: none;
            margin: 20px 0;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #8B4513;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .success {
            color: #28a745;
            font-weight: 600;
            margin-top: 20px;
        }
        .error {
            color: #dc3545;
            font-weight: 600;
            margin-top: 20px;
        }
        .option-divider {
            margin: 20px 0;
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">☕</div>
        <h1>Login Approval</h1>
        <p class="subtitle">Choose how you'd like to proceed</p>
        
        <div class="user-info">
            <div class="user-name">${employee?.name || 'User'}</div>
            <div class="user-email">${email}</div>
        </div>
        
        <div class="code-display">
            Code: ${code}
        </div>
        
        ${employee.auth_user_id ? `
        <button class="approve-btn" onclick="approveAutoLogin()">
            ✓ Auto Login (Recommended)
        </button>
        ` : ''}
        
        <div class="option-divider">OR</div>
        
        <button class="manual-btn" onclick="copyCodeAndRedirect()">
            📋 Copy Code & Go to Login Page
        </button>
        
        <button class="cancel-btn" onclick="cancelLogin()">
            Cancel
        </button>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Processing login...</p>
        </div>
        
        <div id="message"></div>
    </div>

    <script>
        const code = '${code}';
        const email = '${email}';
        const phone = '${phone}';
        const hasAuthId = ${employee.auth_user_id ? 'true' : 'false'};

        async function approveAutoLogin() {
            const approveBtn = document.querySelector('.approve-btn');
            const loading = document.getElementById('loading');
            const message = document.getElementById('message');
            
            approveBtn.disabled = true;
            loading.style.display = 'block';
            message.innerHTML = '';

            try {
                // Generate magic link directly here
                const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/generate-magic-link', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: code,
                        email: email,
                        phone: phone
                    })
                });

                const result = await response.json();

                if (result.success && result.magicLink) {
                    message.innerHTML = '<div class="success">✓ Login approved! Redirecting...</div>';
                    
                    // Redirect to the magic link
                    setTimeout(() => {
                        window.location.href = result.magicLink;
                    }, 1500);
                } else {
                    throw new Error(result.error || 'Failed to generate login link');
                }
            } catch (error) {
                loading.style.display = 'none';
                approveBtn.disabled = false;
                message.innerHTML = '<div class="error">❌ Login failed: ' + error.message + '</div>';
                console.error('Auto-login error:', error);
            }
        }

        function copyCodeAndRedirect() {
            // Copy code to clipboard
            navigator.clipboard.writeText(code).then(() => {
                document.getElementById('message').innerHTML = '<div class="success">✓ Code copied! Redirecting to login...</div>';
                
                // Redirect to login page with code in URL hash
                setTimeout(() => {
                    window.location.href = 'https://id-preview--0ab47c69-3f36-4407-b03c-de1f9684ac9a.lovable.app/auth#code=' + code;
                }, 1000);
            }).catch(() => {
                // Fallback if clipboard doesn't work
                document.getElementById('message').innerHTML = '<div class="success">Code: ' + code + ' - Redirecting to login...</div>';
                setTimeout(() => {
                    window.location.href = 'https://id-preview--0ab47c69-3f36-4407-b03c-de1f9684ac9a.lovable.app/auth#code=' + code;
                }, 2000);
            });
        }

        function cancelLogin() {
            window.close();
        }

        // Auto-focus for better UX
        if (hasAuthId) {
            document.querySelector('.approve-btn').focus();
        } else {
            document.querySelector('.manual-btn').focus();
        }
    </script>
</body>
</html>`;

    return new Response(approvalPageHTML, {
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