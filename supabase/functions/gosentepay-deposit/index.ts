import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { normalizePhone } from "../_shared/yo-payments.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { gosenteDeposit, isGosenteSuccess } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-supabase-authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getProviderCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("256") ? "0" + digits.slice(3) : digits;
  if (local.startsWith("077") || local.startsWith("078") || local.startsWith("076") || local.startsWith("079")) return "MTN";
  if (local.startsWith("070") || local.startsWith("075") || local.startsWith("074")) return "AIRTEL";
  return "MTN";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || req.headers.get("x-supabase-authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase auth environment is not configured");
    }

    const authClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("[Yo Payments Deposit] Auth failed:", userErr?.message ?? "No user returned");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const username = Deno.env.get("YO_API_USERNAME");
    const password = Deno.env.get("YO_API_PASSWORD");

    if (!username || !password) {
      throw new Error("Yo Payments API credentials not configured");
    }

    const { phone, amount, email, ref } = await req.json();

    if (!phone || !amount || !ref) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount, ref" }),
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

    // Build callback URL for Yo Payments notification
    const callbackUrl = `${supabaseUrl}/functions/v1/gosentepay-callback`;

    // ==============================================================
    // Route small deposits (<= 50,000 UGX) through GosentePay v1 API.
    // Larger deposits continue via Yo Payments XML below.
    // ==============================================================
    if (numAmount <= 50000) {
      try {
        console.log(`[Deposit Router] Routing UGX ${numAmount} deposit via GosentePay for ${cleanPhone}, ref: ${ref}`);

        // Flag the transaction as gosentepay so status-check + callback know how to handle it.
        const svcUpdate = createClient(
          supabaseUrl,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await svcUpdate
          .from("mobile_money_transactions")
          .update({ provider: "gosentepay" })
          .eq("transaction_ref", ref);

        const { status, body: gpBody } = await gosenteDeposit({
          phone: cleanPhone,
          amount: numAmount,
          email: (email && String(email).trim()) || "system@greatagrocoffee.com",
          ref,
          callback: callbackUrl,
        });

        const inner = gpBody?.data ?? gpBody;
        if (isGosenteSuccess(status, gpBody)) {
          return new Response(
            JSON.stringify({
              status: "success",
              code: 200,
              message: inner?.message || "A payment prompt has been sent to your phone. Enter your PIN to confirm.",
              ref,
              provider: "gosentepay",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const errMsg = inner?.message || gpBody?.message || `GosentePay rejected the deposit (HTTP ${status})`;
        console.error(`[GosentePay Deposit] Failed: ${errMsg}`, gpBody);
        return new Response(
          JSON.stringify({ status: "error", code: 400, message: errMsg }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (gpErr) {
        console.error("[GosentePay Deposit] Exception, falling back to Yo Payments:", gpErr);
        // fall through to Yo below
      }
    }

    // Build XML request for Yo Payments acdepositfunds (collect/receive money from user's mobile money)
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
    <Narrative>${escapeXml(`Wallet deposit ${ref}`)}</Narrative>
    <ExternalReference>${escapeXml(ref)}</ExternalReference>
    <ProviderReferenceText>${escapeXml(`Deposit UGX ${numAmount.toLocaleString()}`)}</ProviderReferenceText>
    <InstantNotificationUrl>${escapeXml(callbackUrl)}</InstantNotificationUrl>
    <FailureNotificationUrl>${escapeXml(callbackUrl)}</FailureNotificationUrl>
  </Request>
</AutoCreate>`;

    console.log(`[Yo Payments Deposit] Collecting UGX ${numAmount} from ${cleanPhone} (${getProviderCode(cleanPhone)}), ref: ${ref}`);

    const response = await fetch(YO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "Content-Transfer-Encoding": "text",
      },
      body: xmlBody,
    });

    const responseText = await response.text();
    console.log(`[Yo Payments Deposit] HTTP ${response.status}, Response: ${responseText}`);

    // Parse Yo XML response
    const statusMatch = responseText.match(/<Status>(.*?)<\/Status>/);
    const status = statusMatch?.[1]?.trim();
    const statusCodeMatch = responseText.match(/<StatusCode>(.*?)<\/StatusCode>/);
    const statusCode = statusCodeMatch?.[1]?.trim();
    const txRefMatch = responseText.match(/<TransactionReference>(.*?)<\/TransactionReference>/);
    const statusMsgMatch = responseText.match(/<StatusMessage>(.*?)<\/StatusMessage>/);

    // Status "OK" = immediate success
    // StatusCode "-22" = pending authorization (user gets a prompt on their phone) - treat as success
    if (status === "OK" || statusCode === "-22") {
      return new Response(
        JSON.stringify({
          status: "success",
          code: 200,
          message: "A payment prompt has been sent to your phone. Enter your PIN to confirm.",
          ref: ref,
          transactionRef: txRefMatch?.[1]?.trim(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorMsg = statusMsgMatch?.[1]?.trim() || `Yo Payments returned status: ${status}`;
      console.error(`[Yo Payments Deposit] Failed: ${errorMsg}`);
      return new Response(
        JSON.stringify({
          status: "error",
          code: 400,
          message: errorMsg,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Yo Payments deposit error:", error);

    const errorMsg = error instanceof Error ? (error as Error).message : "Unknown error";
    const isConnectionError = errorMsg.includes("Connection refused") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("tcp connect error");

    const userMessage = isConnectionError
      ? "Mobile money service is temporarily unavailable. Please try again later."
      : "Unable to process deposit at this time.";

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: isConnectionError ? 503 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
