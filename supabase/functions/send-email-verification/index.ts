import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  action: "send_code" | "verify_code";
  code?: string;
}

type DeliveryResult = {
  sent: boolean;
  error?: string;
  provider?: string;
  skipped?: string;
};

async function sendVerificationEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  verificationCode: string,
): Promise<DeliveryResult> {
  // Retry on transient errors (esp. 429 rate-limits from email provider).
  const maxAttempts = 4;
  const delays = [800, 2000, 4000]; // ms between attempts
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'verification-code',
        recipientEmail: email,
        idempotencyKey: `verify-${email}-${verificationCode}`,
        data: { code: verificationCode },
      },
    });
    const errMsg = error
      ? String((error as any).message || error)
      : (data && (data as any).error ? String((data as any).error) : '');
    if (!errMsg) return { sent: true };
    lastErr = errMsg;
    const isRateLimit = /429|rate_?limit|high demand/i.test(errMsg);
    const isTransient = isRateLimit || /5\d{2}|timeout|temporar/i.test(errMsg);
    console.warn(`send-transactional-email attempt ${attempt} failed:`, errMsg);
    if (!isTransient || attempt === maxAttempts) break;
    await new Promise((r) => setTimeout(r, delays[attempt - 1] ?? 4000));
  }
  console.error('send-transactional-email failed after retries:', lastErr);
  return { sent: false, error: String(lastErr || 'Failed to send verification email') };
}

async function findEmployeeRecipient(
  supabase: ReturnType<typeof createClient>,
  email: string,
) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('name, phone, status, disabled')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.warn('Employee lookup failed for verification SMS:', error.message);
      return null;
    }

    if (!data) return null;
    if ((data as any).disabled === true) return null;
    if ((data as any).status && String((data as any).status).toLowerCase() !== 'active') return null;

    return data as { name?: string | null; phone?: string | null };
  } catch (err) {
    console.warn('Employee lookup error for verification SMS:', err);
    return null;
  }
}

async function sendVerificationSms(
  email: string,
  employee: { name?: string | null; phone?: string | null } | null,
  verificationCode: string,
): Promise<DeliveryResult> {
  if (!employee?.phone) {
    return { sent: false, skipped: 'no_employee_phone' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return { sent: false, error: 'SMS service not configured' };
  }

  const firstName = (employee.name || 'Employee').trim().split(/\s+/)[0] || 'Employee';
  const smsMessage = `${firstName} - Great Agro Coffee\nVerification code: ${verificationCode}\nValid for 10 minutes. Do not share.`;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        phone: employee.phone,
        message: smsMessage,
        userName: employee.name || firstName,
        recipientEmail: email,
        messageType: 'verification',
        priority: 'premium',
        triggeredBy: 'email-verification',
      }),
    });

    const text = await response.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!response.ok || data?.error) {
      console.warn('Verification SMS failed:', response.status, data?.error || text);
      return { sent: false, error: data?.error || `HTTP ${response.status}` };
    }

    return { sent: true, provider: data?.provider ? String(data.provider) : undefined };
  } catch (err: any) {
    console.warn('Verification SMS error:', err?.message || err);
    return { sent: false, error: err?.message || 'SMS failed' };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action, code }: VerificationRequest = await req.json();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedCode = code?.trim();

    if (!normalizedEmail) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "send_code") {
      // Codes are bcrypt-hashed at rest, so we can no longer "resend" the same code.
      // Always invalidate any pending unverified code and issue a fresh one.
      await supabase
        .from("email_verification_codes")
        .update({ verified_at: new Date().toISOString() })
        .eq("email", normalizedEmail)
        .is("verified_at", null);

      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { error: dbError } = await supabase
        .from("email_verification_codes")
        .insert({
          email: normalizedEmail,
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
        });

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to store verification code");
      }

      const employee = await findEmployeeRecipient(supabase, normalizedEmail);
      // SMS-first policy (email provider unreliable right now).
      // Try SMS; only fall back to email if there is no phone or SMS fails.
      const smsResult = await sendVerificationSms(normalizedEmail, employee, verificationCode);
      let emailResult: DeliveryResult = { sent: false, skipped: 'sms_primary' };
      if (!smsResult.sent) {
        emailResult = await sendVerificationEmail(supabase, normalizedEmail, verificationCode);
      }

      if (!smsResult.sent && !emailResult.sent) {
        throw new Error(smsResult.error || emailResult.error || 'Failed to send verification code');
      }

      console.log("Verification code sent to:", normalizedEmail, { smsSent: smsResult.sent, emailSent: emailResult.sent });
      return new Response(
        JSON.stringify({
          success: true,
          message: smsResult.sent
            ? "Verification code sent to your phone via SMS"
            : "Verification code sent to your email",
          emailSent: emailResult.sent,
          smsSent: smsResult.sent,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_code") {
      if (!normalizedCode) {
        return new Response(
          JSON.stringify({ error: "Code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_email_otp', {
        _email: normalizedEmail, _code: normalizedCode,
      });
      if (rpcErr) {
        console.error('verify_email_otp rpc error:', rpcErr);
        return new Response(
          JSON.stringify({ error: "Verification failed. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const r: any = rpcRes || {};
      if (r.success) {
        return new Response(
          JSON.stringify({ success: true, message: "Email verified successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const msg = r.error === 'expired'
        ? 'Verification code has expired. Please request a new one.'
        : r.error === 'too_many_attempts'
          ? 'Too many failed attempts. Please request a new code.'
          : r.error === 'no_code'
            ? 'No verification code found. Please request a new one.'
            : `Invalid code.${typeof r.attempts_left === 'number' ? ` ${r.attempts_left} attempt${r.attempts_left !== 1 ? 's' : ''} remaining.` : ''}`;
      return new Response(
        JSON.stringify({ success: false, error: msg, code: r.error ?? 'invalid' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
