import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("GosentePay callback received:", JSON.stringify(body));

    const { status, currency, amount_deposited, deposit_rate, phone, ref } = body;

    if (!ref) {
      console.error("Callback missing ref");
      return new Response(
        JSON.stringify({ error: "Missing transaction reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Log the callback to a table for tracking
    const { error: logError } = await supabaseClient
      .from("mobile_money_transactions")
      .update({
        status: status === "successful" ? "completed" : "failed",
        provider_response: body,
        deposit_rate: deposit_rate ? Number(deposit_rate) : null,
        completed_at: new Date().toISOString(),
      })
      .eq("transaction_ref", ref);

    if (logError) {
      console.error("Error updating transaction:", logError);
    }

    if (status === "successful") {
      console.log(`Deposit successful: ${amount_deposited} ${currency} from ${phone}, ref: ${ref}`);
    } else {
      console.log(`Deposit failed: ${amount_deposited} ${currency} from ${phone}, ref: ${ref}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("GosentePay callback error:", error);
    return new Response(
      JSON.stringify({ error: "Callback processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
