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

    // SEND CODE ACTION
    if (action === "send_code") {
      // Check for existing valid code (not expired, less than 3 attempts)
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
        console.log("Reusing existing verification code for:", email);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Verification code already sent to your email" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate new 4-digit code
      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store code in database
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

      // Send email via transactional email system (Lovable Emails)
      const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'verification-code',
          recipientEmail: email,
          idempotencyKey: `verify-${email}-${verificationCode}`,
          templateData: { code: verificationCode },
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        throw new Error("Failed to send verification email");
      }

      console.log("Verification code sent to:", email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Verification code sent to your email" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // VERIFY CODE ACTION
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
      } else {
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
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
