import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendLovableEmail } from "npm:@lovable.dev/email-js@0.0.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  action: "send_code" | "verify_code";
  code?: string;
}

const SITE_NAME = "Great Agro Coffee";
const SENDER_DOMAIN = "notify.greatpearlcoffeesystem.site";
const FROM_DOMAIN = "notify.greatpearlcoffeesystem.site";
const VERIFICATION_SUBJECT = "Your Great Agro Coffee Verification Code";

function buildVerificationEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="UTF-8"></head>
<body style="background-color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
<div style="padding:20px 25px;max-width:560px;margin:0 auto;">
  <h1 style="font-size:22px;font-weight:bold;color:hsl(220,13%,18%);margin:0 0 20px;">Email Verification</h1>
  <p style="font-size:14px;color:hsl(220,9%,46%);line-height:1.6;margin:0 0 25px;">
    Use the code below to verify your email and complete your sign-in to the Great Agro Coffee system:
  </p>
  <p style="font-family:Courier,monospace;font-size:36px;font-weight:bold;color:hsl(217,91%,60%);letter-spacing:10px;text-align:center;background-color:#f4f4f4;padding:20px;border-radius:8px;margin:0 0 25px;">
    ${code}
  </p>
  <p style="font-size:14px;color:hsl(220,9%,46%);line-height:1.6;margin:0 0 25px;">
    This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
  </p>
  <p style="font-size:12px;color:#999999;margin:30px 0 0;">Great Agro Coffee — Kasese, Uganda</p>
</div>
</body>
</html>`;
}

function buildVerificationEmailText(code: string): string {
  return `Email Verification\n\nUse the code below to verify your email and complete your sign-in to the Great Agro Coffee system:\n\n${code}\n\nThis code will expire in 10 minutes. If you didn't request this code, please ignore this email.\n\nGreat Agro Coffee — Kasese, Uganda`;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendVerificationEmail(email: string, verificationCode: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!lovableApiKey) {
    throw new Error("Email service is not configured");
  }

  const unsubToken = generateToken();

  await sendLovableEmail(
    {
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: VERIFICATION_SUBJECT,
      html: buildVerificationEmailHtml(verificationCode),
      text: buildVerificationEmailText(verificationCode),
      purpose: "transactional",
      label: "verification-code",
      idempotency_key: `verify-${email}-${verificationCode}`,
      unsubscribe_token: unsubToken,
    },
    {
      apiKey: lovableApiKey,
      idempotencyKey: `verify-${email}-${verificationCode}`,
    }
  );
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action, code }: VerificationRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "send_code") {
      const { data: existingCode } = await supabase
        .from("email_verification_codes")
        .select("*")
        .eq("email", email)
        .gte("expires_at", new Date().toISOString())
        .lt("attempts", 3)
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingCode) {
        await sendVerificationEmail(email, existingCode.code);

        console.log("Resent existing verification code for:", email);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Verification code sent to your email"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { error: dbError } = await supabase
        .from("email_verification_codes")
        .insert({
          email,
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
        });

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to store verification code");
      }

      await sendVerificationEmail(email, verificationCode);

      console.log("Verification code sent to:", email);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Verification code sent to your email"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_code") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: verificationRecord, error: fetchError } = await supabase
        .from("email_verification_codes")
        .select("*")
        .eq("email", email)
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !verificationRecord) {
        return new Response(
          JSON.stringify({ error: "No verification code found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(verificationRecord.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Verification code has expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (verificationRecord.attempts >= 3) {
        return new Response(
          JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (verificationRecord.code === code) {
        await supabase
          .from("email_verification_codes")
          .update({ verified_at: new Date().toISOString() })
          .eq("id", verificationRecord.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Email verified successfully"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("email_verification_codes")
        .update({ attempts: verificationRecord.attempts + 1 })
        .eq("id", verificationRecord.id);

      const attemptsLeft = 3 - (verificationRecord.attempts + 1);
      return new Response(
        JSON.stringify({
          error: `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
