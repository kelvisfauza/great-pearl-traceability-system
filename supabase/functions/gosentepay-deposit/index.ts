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
    // GOSENTEPAY_API_KEY = Ssentezo API User
    // GOSENTEPAY_SECRET_KEY = Ssentezo API Key
    const apiUser = Deno.env.get("GOSENTEPAY_API_KEY");
    const apiKey = Deno.env.get("GOSENTEPAY_SECRET_KEY");

    if (!apiUser || !apiKey) {
      throw new Error("Ssentezo API credentials not configured");
    }

    const { phone, amount, email, ref } = await req.json();

    if (!phone || !amount || !ref) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount, ref" }),
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

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 500) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least 500 UGX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build callback URLs
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const successCallback = `${supabaseUrl}/functions/v1/gosentepay-callback`;
    const failureCallback = `${supabaseUrl}/functions/v1/gosentepay-callback`;

    // Ssentezo Wallet uses Basic Auth: base64(apiUser:apiKey)
    const encodedCredentials = btoa(`${apiUser}:${apiKey}`);

    const requestBody = {
      externalReference: ref,
      msisdn: cleanPhone,
      amount: numAmount,
      currency: "UGX",
      reason: "Wallet deposit",
      name: email || "Customer",
      success_callback: successCallback,
      failure_callback: failureCallback,
    };

    console.log("Initiating Ssentezo deposit:", { phone: cleanPhone, amount: numAmount, ref, successCallback });
    console.log("Request body:", JSON.stringify(requestBody));

    const response = await fetch("https://wallet.ssentezo.com/api/deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${encodedCredentials}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log("Ssentezo deposit response:", JSON.stringify(data));
    console.log("Ssentezo HTTP status:", response.status);

    // Ssentezo returns { response: "OK", data: { transactionStatus: "PENDING", ... } }
    if (response.status === 202 || data.response === "OK") {
      return new Response(
        JSON.stringify({
          status: "success",
          code: 200,
          message: "A push notification has been sent to the phone",
          ref,
          ssentezoRef: data.data?.ssentezoWalletReference,
          transactionStatus: data.data?.transactionStatus,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: "error",
          code: response.status,
          message: data.error?.message || data.message || "Failed to initiate deposit",
          details: data,
        }),
        { status: response.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Ssentezo deposit error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
