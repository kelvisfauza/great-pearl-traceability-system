import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
};

function normalizeMsisdn(input: string) {
  // Ensure 256 format without plus
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "256" + digits.slice(1);
  if (digits.startsWith("256")) return digits;
  // Fallback: if already intl with +256, strip plus
  if (input.startsWith("+256")) return input.slice(1);
  return digits; // last resort; adjust to your data
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const withdrawalApiKey = Deno.env.get("WITHDRAWAL_API_KEY");

    if (!supabaseUrl || !supabaseKey || !withdrawalApiKey) {
      return new Response(JSON.stringify({ error: "Missing environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { withdrawalRequestId } = requestBody;
    if (!withdrawalRequestId) {
      return new Response(JSON.stringify({ error: "Withdrawal request ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch request in PENDING
    const { data: withdrawalRequest, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawalRequestId)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Database error", details: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!withdrawalRequest) {
      return new Response(JSON.stringify({ error: "Withdrawal request not found or already processed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user account
    const { data: userAccount, error: accountError } = await supabase
      .from("user_accounts")
      .select("current_balance, total_withdrawn")
      .eq("user_id", withdrawalRequest.user_id)
      .maybeSingle();

    if (accountError) {
      return new Response(JSON.stringify({ error: "Database error", details: accountError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!userAccount) {
      return new Response(JSON.stringify({ error: "User account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = Number(withdrawalRequest.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount on withdrawal request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (Number(userAccount.current_balance) < amount) {
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          failure_reason: "Insufficient balance",
        })
        .eq("id", withdrawalRequestId);

      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare ZengaPay payload
    const transferData = {
      msisdn: normalizeMsisdn(withdrawalRequest.phone_number),
      amount, // number
      external_reference: `WD-${withdrawalRequestId}`, // must be unique
      narration: `Payout - ${amount}`,
      use_contact: false, // BOOLEAN (not a string)  <-- important
    };

    const zRes = await fetch("https://api.sandbox.zengapay.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${withdrawalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transferData),
    });

    const zBody = await zRes.json().catch(() => ({} as any));

    if (zRes.ok && zBody?.code === 202 && zBody?.transactionReference) {
      const transactionReference = zBody.transactionReference;

      // Mark processing and debit balance (ideally do these atomically in SQL)
      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "processing",
          transaction_reference: transactionReference,
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawalRequestId);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to update withdrawal status" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: balanceError } = await supabase
        .from("user_accounts")
        .update({
          current_balance: Number(userAccount.current_balance) - amount,
          total_withdrawn: Number(userAccount.total_withdrawn || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", withdrawalRequest.user_id);

      if (balanceError) {
        // You might want to log/alert and possibly revert the withdrawal to 'pending'
        console.error("Balance update error:", balanceError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Withdrawal initiated successfully",
          transactionReference,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // Mark failed with provider message
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          failure_reason: zBody?.message || `Transfer failed (HTTP ${zRes.status})`,
        })
        .eq("id", withdrawalRequestId);

      return new Response(
        JSON.stringify({
          error: "Transfer failed",
          details: zBody?.message || zBody || `HTTP ${zRes.status}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error", details: `${error}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});