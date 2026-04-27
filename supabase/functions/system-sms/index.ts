import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("YOOLA_SMS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "YOOLA_SMS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "Missing phone or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone
    let smsPhone = phone.toString().trim();
    if (!smsPhone.startsWith("+")) {
      if (smsPhone.startsWith("0")) smsPhone = "+256" + smsPhone.slice(1);
      else if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;
      else smsPhone = "+256" + smsPhone;
    }

    console.log("Sending system SMS to:", smsPhone);

    const smsResponse = await fetch("https://yoolasms.com/api/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: smsPhone, message, api_key: apiKey }),
    });

    const result = await smsResponse.text();
    console.log("YoolaSMS response:", smsResponse.status, result);

    return new Response(
      JSON.stringify({ status: "success", sms_status: smsResponse.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("System SMS error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? (error as Error).message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
