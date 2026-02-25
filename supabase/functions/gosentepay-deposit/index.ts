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
    const GOSENTEPAY_API_KEY = Deno.env.get("GOSENTEPAY_API_KEY");
    const GOSENTEPAY_SECRET_KEY = Deno.env.get("GOSENTEPAY_SECRET_KEY");

    if (!GOSENTEPAY_API_KEY) {
      throw new Error("GOSENTEPAY_API_KEY is not configured");
    }
    if (!GOSENTEPAY_SECRET_KEY) {
      throw new Error("GOSENTEPAY_SECRET_KEY is not configured");
    }

    const { phone, amount, email, ref } = await req.json();

    // Validate required fields
    if (!phone || !amount || !email || !ref) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount, email, ref" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (must start with 256)
    const cleanPhone = phone.replace(/\+/g, "").replace(/\s/g, "");
    if (!cleanPhone.startsWith("256") || cleanPhone.length < 12) {
      return new Response(
        JSON.stringify({ error: "Phone number must start with 256 and be at least 12 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be a positive number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build callback URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const callbackUrl = `${supabaseUrl}/functions/v1/gosentepay-callback`;

    console.log("Initiating GosentePay deposit:", { phone: cleanPhone, amount, ref, callbackUrl });

    const response = await fetch("https://api.gosentepay.com/v1/deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GOSENTEPAY_API_KEY}`,
      },
      body: JSON.stringify({
        secret_key: GOSENTEPAY_SECRET_KEY,
        currency: "UGX",
        phone: cleanPhone,
        amount: String(numAmount),
        email,
        ref,
        callback: callbackUrl,
      }),
    });

    const data = await response.json();
    console.log("GosentePay deposit response:", JSON.stringify(data));

    return new Response(
      JSON.stringify(data),
      { 
        status: data.code === 200 ? 200 : data.code || 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("GosentePay deposit error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
