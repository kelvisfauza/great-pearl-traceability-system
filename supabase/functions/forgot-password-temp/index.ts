import { safeOrigin } from "../_shared/safe-redirect.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  // Ensure at least 1 of each, total 10 chars
  let pwd = "Reset";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 5; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Valid email is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Look up employee
    const { data: employee, error: empErr } = await supabaseAdmin
      .from("employees")
      .select("id, name, email, phone, auth_user_id, disabled, status")
      .ilike("email", email)
      .maybeSingle();

    // Always respond with generic success to avoid email enumeration
    const genericResponse = {
      ok: true,
      message:
        "If an account exists for that email, a password reset link has been sent. Open it from your inbox (and spam folder).",
    };

    if (empErr) {
      console.error("[forgot-password-temp] employee lookup error", empErr);
      return new Response(JSON.stringify(genericResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!employee) {
      console.log("[forgot-password-temp] no employee for", email);
      return new Response(JSON.stringify(genericResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (employee.disabled === true || (employee.status && employee.status !== "Active")) {
      console.log("[forgot-password-temp] account disabled/inactive:", email);
      return new Response(JSON.stringify(genericResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!employee.auth_user_id) {
      console.log("[forgot-password-temp] no auth_user_id for", email);
      return new Response(JSON.stringify(genericResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send a password-reset link to the employee's own inbox. The password
    // only changes when the owner opens the link, so a stranger who types
    // someone else's email can no longer change their password.
    const { error: emailErr } = await supabaseAdmin.auth.resetPasswordForEmail(employee.email, {
      redirectTo: `${safeOrigin(req)}/reset-password`,
    });
    if (emailErr) {
      console.error("[forgot-password-temp] email send error", emailErr);
    }

    // Send SMS that ONLY tells the user to check email (no password)
    if (employee.phone) {
      try {
        const smsMessage = `Great Agro Coffee: A password reset was requested for your account. A password reset link has been sent to your email (${employee.email}). Check your inbox now. If this wasn't you, contact IT immediately.`;
        await supabaseAdmin.functions.invoke("send-sms", {
          body: { phone: employee.phone, message: smsMessage },
        });
      } catch (smsErr) {
        console.error("[forgot-password-temp] SMS error", smsErr);
      }
    }

    // Audit log (best-effort)
    try {
      await supabaseAdmin.from("audit_logs").insert({
        action: "password_reset_temp_sent",
        table_name: "employees",
        record_id: employee.id,
        reason: "User-initiated forgot password — reset link emailed",
        performed_by: "self_service",
        department: "Auth",
        record_data: { email: employee.email, sms_notified: !!employee.phone },
      });
    } catch (_e) {
      // ignore
    }

    console.log("[forgot-password-temp] OK for", email);
    return new Response(JSON.stringify(genericResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[forgot-password-temp] fatal", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message || "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});