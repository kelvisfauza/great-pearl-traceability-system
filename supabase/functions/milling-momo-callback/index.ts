import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { resolveYoTransactionStatus } from "../_shared/yo-status.ts";

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
    console.log(`[Milling MoMo Callback] Raw body: ${body}`);

    let externalRef = "";
    let transactionStatus = "";

    let networkRef = "";

    // Try all known Yo Payments callback formats
    // 1. URL-encoded form
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || body.includes("external_ref=")) {
      const params = new URLSearchParams(body);
      externalRef = params.get("external_ref") || params.get("external_reference") || params.get("ExternalReference") || "";
      transactionStatus = params.get("transaction_status") || params.get("status") || params.get("Status") || params.get("TransactionStatus") || "";
      networkRef = params.get("network_ref") || params.get("network_reference") || "";
    }

    // 2. XML parsing - try multiple tag patterns Yo uses
    if (!externalRef) {
      const extRefPatterns = [
        /<ExternalReference>(.*?)<\/ExternalReference>/i,
        /<external_reference>(.*?)<\/external_reference>/i,
        /<ExternalRef>(.*?)<\/ExternalRef>/i,
      ];
      const statusPatterns = [
        /<TransactionStatus>(.*?)<\/TransactionStatus>/i,
        /<Status>(.*?)<\/Status>/i,
        /<StatusCode>(.*?)<\/StatusCode>/i,
        /<transaction_status>(.*?)<\/transaction_status>/i,
        /<IsSuccessful>(.*?)<\/IsSuccessful>/i,
      ];

      for (const p of extRefPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) { externalRef = m[1].trim(); break; }
      }
      for (const p of statusPatterns) {
        const m = body.match(p);
        if (m?.[1]?.trim()) { transactionStatus = m[1].trim(); break; }
      }
    }

    // 3. Try JSON
    if (!externalRef) {
      try {
        const json = JSON.parse(body);
        externalRef = json.external_ref || json.external_reference || json.ExternalReference || "";
        transactionStatus = json.transaction_status || json.status || json.TransactionStatus || json.Status || "";
      } catch { /* not JSON */ }
    }

    console.log(`[Milling MoMo Callback] ref: ${externalRef}, status: ${transactionStatus}`);

    if (!externalRef) {
      return new Response(JSON.stringify({ error: "No reference found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine success - check multiple indicators
    const statusLower = transactionStatus.toLowerCase();
    const isSuccess = statusLower.includes("success") ||
                      statusLower.includes("completed") ||
                      statusLower.includes("succeeded") ||
                      statusLower === "ok" ||
                      statusLower === "true" ||  // IsSuccessful=TRUE
                      statusLower === "1";        // StatusCode 1 = OK
    
    const isExplicitFail = statusLower.includes("fail") ||
                           statusLower.includes("cancel") ||
                           statusLower.includes("expired") ||
                           statusLower.includes("rejected") ||
                           statusLower.includes("declined");

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

    // If status is empty/ambiguous (not explicit success or fail), do a proactive check
    if (!isSuccess && !isExplicitFail) {
      console.log(`[Milling MoMo Callback] Ambiguous status "${transactionStatus}", checking with Yo API...`);
      
      const username = Deno.env.get("YO_API_USERNAME");
      const password = Deno.env.get("YO_API_PASSWORD");
      
      if (username && password && txn.yo_reference) {
        try {
          const yoStatus = await resolveYoTransactionStatus(username, password, [txn.yo_reference, txn.reference]);
          console.log(`[Milling MoMo Callback] Resolved ambiguous callback using ${yoStatus.checkedReference}: ${yoStatus.resolvedStatus}`);

          if (yoStatus.resolvedStatus === "completed") {
            await processSuccess(supabase, txn);
            return new Response(JSON.stringify({ status: "ok" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } else if (yoStatus.resolvedStatus === "failed") {
            await processFailed(supabase, txn);
            return new Response(JSON.stringify({ status: "ok" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          console.log(`[Milling MoMo Callback] Check still pending for ${txn.reference}; leaving transaction pending`);
          return new Response(JSON.stringify({ status: "ok" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error(`[Milling MoMo Callback] Check status error:`, e);
        }
      }

      console.log(`[Milling MoMo Callback] Could not verify ambiguous status for ${txn.reference}; leaving pending`);
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isSuccess) {
      await processSuccess(supabase, txn);
    } else {
      await processFailed(supabase, txn);
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

async function processSuccess(supabase: any, txn: any) {
  await supabase
    .from("milling_momo_transactions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", txn.id);

  const { data: customer } = await supabase
    .from("milling_customers")
    .select("current_balance")
    .eq("id", txn.customer_id)
    .single();

  if (customer) {
    const previousBalance = customer.current_balance;
    const newBalance = Math.max(0, previousBalance - txn.amount);

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

    await supabase
      .from("milling_customers")
      .update({ current_balance: newBalance })
      .eq("id", txn.customer_id);

    console.log(`[Milling MoMo Callback] ✅ Customer ${txn.customer_name} balance updated: ${previousBalance} → ${newBalance}`);
  }
}

async function processFailed(supabase: any, txn: any) {
  await supabase
    .from("milling_momo_transactions")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", txn.id);

  console.log(`[Milling MoMo Callback] ❌ Transaction failed for ${txn.customer_name}`);
}
