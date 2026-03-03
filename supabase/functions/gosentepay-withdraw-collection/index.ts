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
    const apiKey = Deno.env.get("GOSENTEPAY_API_KEY");
    const secretKey = Deno.env.get("GOSENTEPAY_SECRET_KEY");

    if (!apiKey || !secretKey) {
      throw new Error("GosentePay API credentials not configured");
    }

    const { phone, amount, reason, emailAddress } = await req.json();

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (must start with 256)
    const cleanPhone = phone.replace(/\+/g, "").replace(/\s/g, "");
    if (!cleanPhone.startsWith("256")) {
      // Auto-prefix if starts with 0
      const normalizedPhone = cleanPhone.startsWith("0") ? "256" + cleanPhone.slice(1) : "256" + cleanPhone;
      if (normalizedPhone.length < 12) {
        return new Response(
          JSON.stringify({ error: "Phone number must be at least 12 digits with country code 256" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const finalPhone = cleanPhone.startsWith("256") ? cleanPhone : (cleanPhone.startsWith("0") ? "256" + cleanPhone.slice(1) : "256" + cleanPhone);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 500) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least 500 UGX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestBody = {
      secret_key: secretKey,
      currency: "UGX",
      amount: String(numAmount),
      emailAddress: emailAddress || "system@greatpearlcoffee.com",
      phone: finalPhone,
      reason: reason || "Withdraw collection",
    };

    console.log("Initiating GosentePay withdraw collection:", { phone: finalPhone, amount: numAmount, reason: requestBody.reason });

    const response = await fetch("https://api.gosentepay.com/v1/withdraw_collections.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log("GosentePay withdraw collection response:", JSON.stringify(data));
    console.log("GosentePay withdraw collection HTTP status:", response.status);

    if (data.status === "success" && (data.code === 200 || data.code === 202)) {
      return new Response(
        JSON.stringify({
          status: "success",
          code: data.code,
          message: data.message || "Withdraw collection initiated successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: "error",
          code: data.code || response.status,
          message: data.message || "Failed to initiate withdraw collection",
          details: data,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("GosentePay withdraw collection error:", error);

    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const isConnectionError = errorMsg.includes("Connection refused") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("tcp connect error");

    const userMessage = isConnectionError
      ? "Mobile money withdraw collection service is temporarily unavailable. Please try again later."
      : errorMsg;

    return new Response(
      JSON.stringify({ error: userMessage, technical_error: errorMsg }),
      { status: isConnectionError ? 503 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
