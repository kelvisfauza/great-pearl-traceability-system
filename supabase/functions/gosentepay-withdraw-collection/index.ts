import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { gosenteWithdraw, isGosenteSuccess, normalizePhone } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Deno.env.get("GOSENTEPAY_API_KEY") || !Deno.env.get("GOSENTEPAY_SECRET_KEY")) {
      throw new Error("GosentePay API credentials not configured");
    }

    const { phone, amount, reason, emailAddress, ref } = await req.json();

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalPhone = normalizePhone(phone);
    if (finalPhone.length < 12) {
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

    const withdrawRef = ref || `GP-WD-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const finalReason = reason || "Withdraw collection";

    console.log("Initiating GosentePay withdraw (v1):", { phone: finalPhone, amount: numAmount, ref: withdrawRef });

    const { status, body: data } = await gosenteWithdraw({
      phone: finalPhone,
      amount: numAmount,
      email: emailAddress || "system@greatagrocoffee.com",
      reason: finalReason,
      ref: withdrawRef,
    });

    console.log("GosentePay withdraw response:", status, JSON.stringify(data));

    const inner = data?.data || data;

    if (isGosenteSuccess(status, data)) {
      return new Response(
        JSON.stringify({
          status: "success",
          code: inner?.code || inner?.status || 200,
          message: inner?.message || "Withdraw initiated successfully",
          ref: data?.gateway_reference || data?.txRef || withdrawRef,
          clientRef: withdrawRef,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: "error",
          code: inner?.code || inner?.status || status,
          message: inner?.message || data?.message || "Failed to initiate withdraw",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("GosentePay withdraw collection error:", error);

    const errorMsg = error instanceof Error ? (error as Error).message : "Unknown error";
    const isConnectionError = errorMsg.includes("Connection refused") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("tcp connect error");

    const userMessage = isConnectionError
      ? "Mobile money withdraw collection service is temporarily unavailable. Please try again later."
      : "Unable to process withdraw collection at this time.";

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: isConnectionError ? 503 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
