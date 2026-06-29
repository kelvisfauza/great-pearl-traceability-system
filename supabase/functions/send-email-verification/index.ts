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

async function sendVerificationEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  verificationCode: string,
) {
  const { data, error } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'verification-code',
      recipient: email,
      data: { code: verificationCode },
    },
  });
  if (error) {
    console.error('send-transactional-email invoke error:', error);
    throw new Error('Failed to send verification email');
  }
  if (data && (data as any).error) {
    console.error('send-transactional-email returned error:', (data as any).error);
    throw new Error('Failed to send verification email');
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

      await sendVerificationEmail(supabase, normalizedEmail, verificationCode);

      console.log("Verification code sent to:", normalizedEmail);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Verification code sent to your email"
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
