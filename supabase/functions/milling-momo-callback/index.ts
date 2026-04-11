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
    const contentType = req.headers.get("content-type") || "";
    let externalRef = "";
    let transactionStatus = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await req.text();
      const params = new URLSearchParams(body);
      externalRef = params.get("external_ref") || params.get("external_reference") || "";
      transactionStatus = params.get("transaction_status") || params.get("status") || "";
    } else {
      const body = await req.text();
      // Try XML parsing
      const extRefMatch = body.match(/<ExternalReference>(.*?)<\/ExternalReference>/i);
      const statusMatch = body.match(/<TransactionStatus>(.*?)<\/TransactionStatus>/i) ||
                          body.match(/<Status>(.*?)<\/Status>/i);
      externalRef = extRefMatch?.[1]?.trim() || "";
      transactionStatus = statusMatch?.[1]?.trim() || "";
      
      // Try JSON if no XML match
      if (!externalRef) {
        try {
          const json = JSON.parse(body);
          externalRef = json.external_ref || json.external_reference || "";
          transactionStatus = json.transaction_status || json.status || "";
        } catch { /* not JSON */ }
      }
    }

    console.log(`[Milling MoMo Callback] ref: ${externalRef}, status: ${transactionStatus}`);

    if (!externalRef) {
      return new Response(JSON.stringify({ error: "No reference found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSuccess = transactionStatus.toLowerCase().includes("success") ||
                      transactionStatus.toLowerCase().includes("completed");

    // Get the pending transaction
    const { data: txn, error: txnError } = await supabase
      .from("milling_momo_transactions")
      .select("*")
      .eq("reference", externalRef)
      .eq("status", "pending")
      .maybeSingle();

    if (txnError || !txn) {
      console.log(`[Milling MoMo Callback] No pending transaction found for ref: ${externalRef}`);
      return new Response(JSON.stringify({ status: "ok", message: "No pending transaction" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isSuccess) {
      // Update momo transaction status
      await supabase
        .from("milling_momo_transactions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", txn.id);

      // Get customer's current balance
      const { data: customer } = await supabase
        .from("milling_customers")
        .select("current_balance")
        .eq("id", txn.customer_id)
        .single();

      if (customer) {
        const previousBalance = customer.current_balance;
        const newBalance = Math.max(0, previousBalance - txn.amount);

        // Record as cash transaction
        await supabase.from("milling_cash_transactions").insert({
          customer_id: txn.customer_id,
          customer_name: txn.customer_name,
          amount_paid: txn.amount,
          previous_balance: previousBalance,
          new_balance: newBalance,
          payment_method: "Mobile Money",
          notes: `MoMo collection - Ref: ${txn.reference}`,
          date: new Date().toISOString().split("T")[0],
          created_by: txn.initiated_by,
        });

        // Update customer balance
        await supabase
          .from("milling_customers")
          .update({ current_balance: newBalance })
          .eq("id", txn.customer_id);

        console.log(`[Milling MoMo Callback] ✅ Customer ${txn.customer_name} balance updated: ${previousBalance} → ${newBalance}`);
      }
    } else {
      await supabase
        .from("milling_momo_transactions")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", txn.id);

      console.log(`[Milling MoMo Callback] ❌ Transaction failed for ${txn.customer_name}`);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Milling MoMo Callback] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
