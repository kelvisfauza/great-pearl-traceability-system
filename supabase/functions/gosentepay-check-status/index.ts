import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactionRef } = await req.json();
    if (!transactionRef) {
      return new Response(JSON.stringify({ error: "Missing transactionRef" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check current DB status first
    const { data: transaction, error: fetchErr } = await supabaseClient
      .from("mobile_money_transactions")
      .select("*")
      .eq("transaction_ref", transactionRef)
      .single();

    if (fetchErr || !transaction) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already processed
    if (transaction.status === "completed" || transaction.status === "failed") {
      return new Response(JSON.stringify({ status: transaction.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll Yo Payments for status
    const username = Deno.env.get("YO_API_USERNAME");
    const password = Deno.env.get("YO_API_PASSWORD");

    if (!username || !password) {
      return new Response(JSON.stringify({ status: "pending" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${username}</APIUsername>
    <APIPassword>${password}</APIPassword>
    <Method>actransactioncheckstatus</Method>
    <PrivateTransactionReference>${escapeXml(transactionRef)}</PrivateTransactionReference>
  </Request>
</AutoCreate>`;

    console.log(`[Yo Check Status] Checking status for ref: ${transactionRef}`);

    const response = await fetch(YO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml", "Content-Transfer-Encoding": "text" },
      body: xmlBody,
    });

    const responseText = await response.text();
    console.log(`[Yo Check Status] Response: ${responseText}`);

    const txStatusMatch = responseText.match(/<TransactionStatus>(.*?)<\/TransactionStatus>/);
    const statusMatch = responseText.match(/<Status>(.*?)<\/Status>/);
    const txStatus = txStatusMatch?.[1]?.trim()?.toUpperCase();
    const yoStatus = statusMatch?.[1]?.trim()?.toUpperCase();

    let newStatus: string | null = null;
    if (txStatus === "SUCCEEDED" || txStatus === "COMPLETED" || yoStatus === "OK") {
      newStatus = "completed";
    } else if (txStatus === "FAILED" || txStatus === "EXPIRED" || txStatus === "CANCELLED") {
      newStatus = "failed";
    }

    if (!newStatus) {
      // Still pending
      return new Response(JSON.stringify({ status: "pending" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction
    await supabaseClient
      .from("mobile_money_transactions")
      .update({
        status: newStatus,
        completed_at: new Date().toISOString(),
        provider_response: { yo_check_status: responseText },
      })
      .eq("transaction_ref", transactionRef)
      .eq("status", "pending"); // Only update if still pending (idempotent)

    // If successful, credit the wallet
    if (newStatus === "completed") {
      const depositAmount = transaction.amount;

      // Resolve unified user ID for wallet
      let walletUserId = transaction.user_id;
      try {
        // Find employee email from auth user
        const { data: emp } = await supabaseClient
          .from("employees")
          .select("email")
          .eq("auth_user_id", transaction.user_id)
          .maybeSingle();

        if (emp?.email) {
          const { data: unifiedId } = await supabaseClient.rpc("get_unified_user_id", {
            input_email: emp.email,
          });
          if (unifiedId) walletUserId = unifiedId;
        }
      } catch (e) {
        console.error("Could not resolve unified user ID, using auth user ID:", e);
      }

      // Insert ledger entry (idempotent via unique reference)
      const { error: ledgerError } = await supabaseClient
        .from("ledger_entries")
        .insert({
          user_id: walletUserId,
          entry_type: "DEPOSIT",
          amount: depositAmount,
          reference: `DEPOSIT-${transactionRef}`,
          source_category: "SELF_DEPOSIT",
          metadata: JSON.stringify({
            transaction_ref: transactionRef,
            phone: transaction.phone,
            currency: "UGX",
            provider: "yo_payments",
            source: "mobile_money",
          }),
        });

      if (ledgerError) {
        // Could be duplicate - that's OK
        if (ledgerError.code === "23505") {
          console.log(`Ledger entry already exists for ${transactionRef}`);
        } else {
          console.error("Ledger insert error:", ledgerError);
        }
      } else {
        console.log(`Credited UGX ${depositAmount} to wallet user ${walletUserId}`);
      }
    }

    return new Response(JSON.stringify({ status: newStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check status error:", error);
    return new Response(JSON.stringify({ error: "Check status failed", status: "pending" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
