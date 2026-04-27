import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { normalizePhone } from "../_shared/yo-payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function getProviderCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("256") ? "0" + digits.slice(3) : digits;
  if (local.startsWith("077") || local.startsWith("078") || local.startsWith("076")) return "MTN";
  if (local.startsWith("070") || local.startsWith("075") || local.startsWith("074")) return "AIRTEL";
  return "MTN";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const username = Deno.env.get("YO_API_USERNAME");
    const password = Deno.env.get("YO_API_PASSWORD");

    if (!username || !password) {
      throw new Error("Yo Payments API credentials not configured");
    }

    const { phone, amount, customer_id, customer_name, initiated_by } = await req.json();

    if (!phone || !amount || !customer_id || !customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount, customer_id, customer_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 12) {
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

    // Generate a unique reference
    const ref = `MILL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Build callback URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const callbackUrl = `${supabaseUrl}/functions/v1/milling-momo-callback`;

    // Build XML for acdepositfunds (collect money FROM customer's mobile money)
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${username}</APIUsername>
    <APIPassword>${password}</APIPassword>
    <Method>acdepositfunds</Method>
    <NonBlocking>TRUE</NonBlocking>
    <Amount>${numAmount}</Amount>
    <Account>${cleanPhone}</Account>
    <AccountProviderCode>${getProviderCode(cleanPhone)}</AccountProviderCode>
    <Narrative>${escapeXml(`Milling payment from ${customer_name}`)}</Narrative>
    <ExternalReference>${escapeXml(ref)}</ExternalReference>
    <ProviderReferenceText>${escapeXml(`Milling UGX ${numAmount.toLocaleString()}`)}</ProviderReferenceText>
    <InstantNotificationUrl>${escapeXml(callbackUrl)}</InstantNotificationUrl>
    <FailureNotificationUrl>${escapeXml(callbackUrl)}</FailureNotificationUrl>
  </Request>
</AutoCreate>`;

    console.log(`[Milling MoMo] Collecting UGX ${numAmount} from ${cleanPhone} for customer ${customer_name}, ref: ${ref}`);

    const response = await fetch(YO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml", "Content-Transfer-Encoding": "text" },
      body: xmlBody,
    });

    const responseText = await response.text();
    console.log(`[Milling MoMo] HTTP ${response.status}, Response: ${responseText}`);

    const statusMatch = responseText.match(/<Status>(.*?)<\/Status>/);
    const status = statusMatch?.[1]?.trim();
    const statusCodeMatch = responseText.match(/<StatusCode>(.*?)<\/StatusCode>/);
    const statusCode = statusCodeMatch?.[1]?.trim();
    const txRefMatch = responseText.match(/<TransactionReference>(.*?)<\/TransactionReference>/);
    const statusMsgMatch = responseText.match(/<StatusMessage>(.*?)<\/StatusMessage>/);

    if (status === "OK" || statusCode === "-22") {
      // Store pending transaction in milling_momo_transactions
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

      await supabaseClient.from("milling_momo_transactions").insert({
        reference: ref,
        yo_reference: txRefMatch?.[1]?.trim() || null,
        customer_id,
        customer_name,
        phone: cleanPhone,
        amount: numAmount,
        status: "pending",
        initiated_by: initiated_by || "unknown",
      });

      return new Response(
        JSON.stringify({
          status: "success",
          message: "A payment prompt has been sent to the customer's phone. They need to enter their PIN to confirm.",
          ref,
          transactionRef: txRefMatch?.[1]?.trim(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorMsg = statusMsgMatch?.[1]?.trim() || `Yo Payments returned status: ${status}`;
      console.error(`[Milling MoMo] Failed: ${errorMsg}`);
      return new Response(
        JSON.stringify({ status: "error", message: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Milling MoMo collection error:", error);
    const errorMsg = error instanceof Error ? (error as Error).message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
