import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Send SMS directly via YoolaSMS after successful payout
 */
async function sendPayoutSMS(phone: string, employeeName: string, amount: number, ref: string) {
  try {
    const apiKey = Deno.env.get("YOOLA_SMS_API_KEY");
    if (!apiKey) {
      console.error("YOOLA_SMS_API_KEY not configured, skipping SMS");
      return;
    }

    // Format phone for SMS (needs +256 prefix)
    let smsPhone = phone.replace(/\D/g, "");
    if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;
    else if (smsPhone.startsWith("0")) smsPhone = "+256" + smsPhone.slice(1);
    else smsPhone = "+256" + smsPhone;

    const message = `Dear ${employeeName}, your withdrawal of UGX ${amount.toLocaleString()} has been APPROVED and sent to your Mobile Money number ${phone}. Ref: ${ref}. Great Pearl Coffee.`;

    console.log("Sending payout SMS to:", smsPhone);

    const smsResponse = await fetch("https://yoolasms.com/api/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: smsPhone,
        message: message,
        api_key: apiKey,
      }),
    });

    const smsResult = await smsResponse.text();
    console.log("Payout SMS response:", smsResponse.status, smsResult);
  } catch (smsErr) {
    console.error("Payout SMS error (non-blocking):", smsErr);
  }
}

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

    const { phone, amount, ref, emailAddress, employeeName } = await req.json();

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and normalize phone format (must start with 256)
    let cleanPhone = phone.replace(/\+/g, "").replace(/\s/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "256" + cleanPhone.slice(1);
    if (!cleanPhone.startsWith("256")) cleanPhone = "256" + cleanPhone;
    
    if (cleanPhone.length < 12) {
      return new Response(
        JSON.stringify({ error: "Phone number must be at least 12 digits with country code 256" }),
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

    const requestBody = {
      secret_key: secretKey,
      currency: "UGX",
      amount: String(numAmount),
      emailAddress: emailAddress || "system@greatpearlcoffee.com",
      phone: cleanPhone,
      reason: ref ? `Wallet withdrawal - ${ref}` : "Wallet withdrawal",
    };

    console.log("Initiating GosentePay withdraw collection:", { phone: cleanPhone, amount: numAmount, ref });

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

    // GosentePay returns nested: { data: { status: 200, message: "transfer accepted" }, txRef: "..." }
    const innerData = data.data || data;
    const isSuccess = 
      (innerData.status === 200 || innerData.status === 202 || innerData.code === 200 || innerData.code === 202) &&
      (innerData.message?.toLowerCase().includes("accepted") || innerData.message?.toLowerCase().includes("success") || data.status === "success");

    if (isSuccess) {
      const txRef = data.txRef || ref;

      // Send SMS notification directly after successful payout
      if (employeeName) {
        await sendPayoutSMS(cleanPhone, employeeName, numAmount, txRef);
      } else {
        console.log("No employeeName provided, skipping server-side SMS");
      }

      return new Response(
        JSON.stringify({
          status: "success",
          code: innerData.code || innerData.status || 200,
          message: innerData.message || "Withdraw collection initiated successfully",
          ref: txRef,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: "error",
          code: innerData.code || innerData.status || response.status,
          message: innerData.message || "Failed to initiate withdraw collection",
          details: data,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("GosentePay payout error:", error);

    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const isConnectionError = errorMsg.includes("Connection refused") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("tcp connect error");

    const userMessage = isConnectionError
      ? "Mobile money payout service is temporarily unavailable. Please try again later."
      : errorMsg;

    return new Response(
      JSON.stringify({ error: userMessage, technical_error: errorMsg }),
      { status: isConnectionError ? 503 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
