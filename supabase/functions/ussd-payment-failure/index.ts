import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    console.log(`[USSD Payment Failure] Raw body: ${body}`);

    let externalRef = "";
    let amount = 0;
    let phone = "";
    let transactionId = "";
    let reason = "";

    // Try JSON
    try {
      const json = JSON.parse(body);
      externalRef = json.payment_external_reference || json.external_ref || json.external_reference || json.ExternalReference || "";
      amount = Number(json.amount || json.Amount || 0);
      phone = json.msisdn || json.phone || json.anumbermsisdn || "";
      transactionId = json.transaction_id || json.TransactionId || "";
      reason = json.reason || json.failure_reason || json.StatusMessage || "";
    } catch {
      // Try URL-encoded
      if (body.includes("=")) {
        const params = new URLSearchParams(body);
        externalRef = params.get("payment_external_reference") || params.get("external_ref") || params.get("external_reference") || "";
        amount = Number(params.get("amount") || params.get("Amount") || 0);
        phone = params.get("msisdn") || params.get("phone") || "";
        transactionId = params.get("transaction_id") || params.get("TransactionId") || "";
        reason = params.get("reason") || params.get("failure_reason") || "";
      }
    }

    console.log(`[USSD Payment Failure] ref: ${externalRef}, amount: ${amount}, phone: ${phone}, reason: ${reason}`);

    // Log the failed payment
    await supabase.from("ussd_payment_logs").insert({
      reference: externalRef || `UNKNOWN-${Date.now()}`,
      phone,
      amount,
      transaction_id: transactionId,
      status: "failed",
      narrative: reason || "Payment failed",
      raw_payload: body,
    });

    // If we have a reference, mark any existing momo transaction as failed
    if (externalRef) {
      await supabase
        .from("milling_momo_transactions")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("reference", externalRef)
        .eq("status", "pending");
    }

    console.log(`[USSD Payment Failure] ❌ Payment failed. Ref: ${externalRef}, Reason: ${reason}`);

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[USSD Payment Failure] Error:", error);
    return new Response(JSON.stringify({ status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
