import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { transaction_id } = await req.json();
    if (!transaction_id) {
      return new Response(JSON.stringify({ error: "Missing transaction_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: txn, error: txnError } = await supabase
      .from("milling_momo_transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (txnError || !txn) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already resolved
    if (txn.status === "completed" || txn.status === "failed") {
      return new Response(JSON.stringify({ status: txn.status, message: `Transaction already ${txn.status}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!txn.yo_reference) {
      return new Response(JSON.stringify({ status: "pending", message: "No Yo reference to check" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const username = Deno.env.get("YO_API_USERNAME");
    const password = Deno.env.get("YO_API_PASSWORD");

    if (!username || !password) {
      return new Response(JSON.stringify({ status: "pending", message: "API credentials not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${username}</APIUsername>
    <APIPassword>${password}</APIPassword>
    <Method>actransactioncheckstatus</Method>
    <PrivateTransactionReference>${escapeXml(txn.yo_reference)}</PrivateTransactionReference>
  </Request>
</AutoCreate>`;

    console.log(`[Milling MoMo Check] Checking ref: ${txn.yo_reference}`);

    const response = await fetch(YO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml", "Content-Transfer-Encoding": "text" },
      body: xmlBody,
    });

    const responseText = await response.text();
    console.log(`[Milling MoMo Check] Response: ${responseText}`);

    const txStatusMatch = responseText.match(/<TransactionStatus>(.*?)<\/TransactionStatus>/i);
    const txStatus = txStatusMatch?.[1]?.trim()?.toUpperCase();

    if (txStatus === "SUCCEEDED" || txStatus === "COMPLETED") {
      // Process success - update momo txn, clear balance, record cash txn
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
          notes: `MoMo collection (verified) - Ref: ${txn.reference}`,
          date: new Date().toISOString().split("T")[0],
          created_by: txn.initiated_by,
        });

        await supabase
          .from("milling_customers")
          .update({ current_balance: newBalance })
          .eq("id", txn.customer_id);

        console.log(`[Milling MoMo Check] ✅ ${txn.customer_name} balance: ${previousBalance} → ${newBalance}`);
      }

      return new Response(JSON.stringify({ status: "completed", message: "Payment successful! Balance updated." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (txStatus === "FAILED" || txStatus === "EXPIRED" || txStatus === "CANCELLED") {
      await supabase
        .from("milling_momo_transactions")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", txn.id);

      return new Response(JSON.stringify({ status: "failed", message: `Transaction ${txStatus.toLowerCase()}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "pending", message: "Still waiting for customer to confirm" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Milling MoMo Check] Error:", error);
    return new Response(JSON.stringify({ error: "Check failed", status: "pending" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
