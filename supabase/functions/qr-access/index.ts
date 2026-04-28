import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendLovableEmail } from "npm:@lovable.dev/email-js@0.0.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_DOMAIN = "notify.greatpearlcoffeesystem.site";
const SUBJECT = "Great Agro Coffee — QR Access Code";

function htmlBody(name: string, code: string, purpose: string) {
  const intro =
    purpose === "setup_pin"
      ? "Use this code to set up your 4-digit PIN for QR Code access."
      : "Use this code to enroll a new device for QR Code access.";
  return `<!DOCTYPE html><html><body style="background:#fff;font-family:'Segoe UI',Arial,sans-serif;">
<div style="padding:24px;max-width:560px;margin:0 auto;">
<h1 style="font-size:22px;color:#1f2937;margin:0 0 16px;">QR Access Code</h1>
<p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">Hello ${name || "there"}, ${intro}</p>
<p style="font-family:Courier,monospace;font-size:36px;font-weight:bold;color:#059669;letter-spacing:10px;text-align:center;background:#f3f4f6;padding:20px;border-radius:8px;margin:0 0 20px;">${code}</p>
<p style="color:#4b5563;line-height:1.6;margin:0;">This code expires in 10 minutes. If you didn't request it, ignore this email and consider changing your PIN.</p>
<p style="color:#9ca3af;font-size:12px;margin-top:32px;">Great Agro Coffee — Kasese, Uganda</p>
</div></body></html>`;
}

async function sendCodeEmail(email: string, name: string, code: string, purpose: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("Email service not configured");
  await sendLovableEmail({
    apiKey,
    from: { name: "Great Agro Coffee", email: `noreply@${SENDER_DOMAIN}` },
    to: [email],
    subject: SUBJECT,
    html: htmlBody(name, code, purpose),
    text: `Your QR access code: ${code}\nExpires in 10 minutes.`,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const action = String(body?.action || "");
    const lookup = String(body?.lookup || "");
    if (!lookup) {
      return new Response(JSON.stringify({ ok: false, error: "missing_lookup" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    let result: any = null;

    if (action === "status") {
      const { data, error } = await supabase.rpc("qr_access_status", {
        _lookup: lookup, _device_token: body?.device_token ?? null,
      });
      if (error) throw error;
      result = data;
    } else if (action === "request_otp") {
      const purpose = String(body?.purpose || "");
      const { data, error } = await supabase.rpc("qr_access_request_otp", {
        _lookup: lookup, _purpose: purpose,
      });
      if (error) throw error;
      if (data?.ok && data?.email && data?.code) {
        await sendCodeEmail(data.email, data.name || "", data.code, purpose);
      }
      // never return the raw code
      result = { ok: data?.ok, error: data?.error, email_masked: data?.email
        ? data.email.replace(/(^.).*(@.*$)/, "$1***$2") : undefined };
    } else if (action === "set_pin") {
      const { data, error } = await supabase.rpc("qr_access_set_pin", {
        _lookup: lookup, _otp: String(body?.otp || ""), _new_pin: String(body?.pin || ""),
      });
      if (error) throw error;
      result = data;
    } else if (action === "enroll_device") {
      const { data, error } = await supabase.rpc("qr_access_enroll_device", {
        _lookup: lookup, _otp: String(body?.otp || ""), _pin: String(body?.pin || ""),
        _device_label: body?.device_label ?? null,
      });
      if (error) throw error;
      result = data;
    } else if (action === "get_codes") {
      const { data, error } = await supabase.rpc("qr_access_get_codes", {
        _lookup: lookup, _device_token: String(body?.device_token || ""),
        _pin: String(body?.pin || ""),
      });
      if (error) throw error;
      result = data;
    } else {
      result = { ok: false, error: "unknown_action" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "server_error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }
});