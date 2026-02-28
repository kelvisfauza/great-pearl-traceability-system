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
    console.log("Ssentezo callback received:", JSON.stringify(body));

    // Ssentezo callback format:
    // { externalReference, transactionStatus (SUCCEEDED/FAILED), amount, currency, msisdn, financialTransactionId, ... }
    const externalReference = body.externalReference || body.ref;
    const transactionStatus = body.transactionStatus || body.status;
    const amount = body.amount || body.amount_deposited;
    const phone = body.msisdn || body.phone;
    const financialTransactionId = body.financialTransactionId;

    if (!externalReference) {
      console.error("Callback missing externalReference");
      return new Response(
        JSON.stringify({ error: "Missing transaction reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the transaction to find the user
    const { data: transaction, error: fetchError } = await supabaseClient
      .from("mobile_money_transactions")
      .select("*")
      .eq("transaction_ref", externalReference)
      .single();

    if (fetchError || !transaction) {
      console.error("Transaction not found for ref:", externalReference, fetchError);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ssentezo uses "SUCCEEDED" for success, "FAILED" for failure
    const isSuccess = transactionStatus === "SUCCEEDED" || transactionStatus === "successful";

    console.log(`Transaction ${externalReference}: status=${transactionStatus}, isSuccess=${isSuccess}`);

    // Update the transaction record
    const { error: updateError } = await supabaseClient
      .from("mobile_money_transactions")
      .update({
        status: isSuccess ? "completed" : "failed",
        provider_response: body,
        completed_at: new Date().toISOString(),
      })
      .eq("transaction_ref", externalReference);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
    }

    // If successful, credit the user's balance via ledger entry
    if (isSuccess) {
      const depositAmount = Number(amount) || transaction.amount;

      const { error: ledgerError } = await supabaseClient
        .from("ledger_entries")
        .insert({
          user_id: transaction.user_id,
          entry_type: "DEPOSIT",
          amount: depositAmount,
          reference: `DEPOSIT-${externalReference}`,
          metadata: JSON.stringify({
            transaction_ref: externalReference,
            phone: phone,
            currency: body.currency || "UGX",
            financialTransactionId: financialTransactionId,
            provider: "ssentezo",
          }),
        });

      if (ledgerError) {
        console.error("Error creating ledger entry:", ledgerError);
      } else {
        console.log(`Successfully credited UGX ${depositAmount} to user ${transaction.user_id}`);
      }
    } else {
      console.log(`Deposit failed for ref ${externalReference}, phone ${phone}, status: ${transactionStatus}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Ssentezo callback error:", error);
    return new Response(
      JSON.stringify({ error: "Callback processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
