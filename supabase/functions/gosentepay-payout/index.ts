import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

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

    let smsPhone = phone.replace(/\D/g, "");
    if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;
    else if (smsPhone.startsWith("0")) smsPhone = "+256" + smsPhone.slice(1);
    else smsPhone = "+256" + smsPhone;

    const message = `Dear ${employeeName}, your withdrawal of UGX ${amount.toLocaleString()} has been APPROVED and sent to your Mobile Money number ${phone}. Ref: ${ref}. Great Agro Coffee.`;

    console.log("Sending payout SMS to:", smsPhone);

    const smsResponse = await fetch("https://yoolasms.com/api/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: smsPhone, message, api_key: apiKey }),
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
    if (!Deno.env.get("YO_API_USERNAME") || !Deno.env.get("YO_API_PASSWORD")) {
      throw new Error("Yo Payments API credentials not configured");
    }

    const { phone, amount, ref, employeeName } = await req.json();

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = normalizePhone(phone);
    
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

    console.log(`Initiating Yo Payments payout: ${cleanPhone}, UGX ${numAmount}, ref: ${ref}`);

    const result = await yoPayout({
      phone: cleanPhone,
      amount: numAmount,
      narrative: ref ? `Wallet withdrawal - ${ref}` : "Wallet withdrawal",
    });

    if (result.success) {
      const txRef = result.transactionRef || ref || `YO-${Date.now()}`;

      // Send SMS notification
      if (employeeName) {
        await sendPayoutSMS(cleanPhone, employeeName, numAmount, txRef);
      }

      return new Response(
        JSON.stringify({
          status: "success",
          code: 200,
          message: result.statusMessage || "Payout initiated successfully via Yo Payments",
          ref: txRef,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: "error",
          code: 400,
          message: result.errorMessage || "Payout failed via Yo Payments",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Yo Payments payout error:", error);

    const errorMsg = error instanceof Error ? (error as Error).message : "Unknown error";
    const isConnectionError = errorMsg.includes("Connection refused") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("tcp connect error");

    return new Response(
      JSON.stringify({
        error: isConnectionError
          ? "Mobile money payout service is temporarily unavailable. Please try again later."
          : errorMsg,
        technical_error: errorMsg,
      }),
      { status: isConnectionError ? 503 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
