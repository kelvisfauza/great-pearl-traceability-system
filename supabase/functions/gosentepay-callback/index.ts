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

    // Extract reference - GosentePay sends as customer_reference
    const ref = body.customer_reference || body.ref;
    const status = (body.status || "").toLowerCase();
    const phone = body.msisdn || body.phone;

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

    // Verify authenticity: reference must exist in our database
    const { data: transaction, error: fetchError } = await supabaseClient
      .from("mobile_money_transactions")
      .select("*")
      .eq("transaction_ref", ref)
      .single();

    if (fetchError || !transaction) {
      console.error("Unknown reference - rejecting callback:", ref);
      return new Response(
        JSON.stringify({ error: "Unknown transaction reference" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verified transaction ${ref} belongs to user ${transaction.user_id}`);

    // Prevent duplicate processing
    if (transaction.status === "completed" || transaction.status === "failed") {
      console.log(`Transaction ${ref} already processed with status: ${transaction.status}`);
      return new Response(
        JSON.stringify({ received: true, already_processed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSuccess = status === "successful";
    console.log(`Transaction ${ref}: status=${status}, isSuccess=${isSuccess}, type=${transaction.transaction_type}`);

    // Update the transaction record
    const { error: updateError } = await supabaseClient
      .from("mobile_money_transactions")
      .update({
        status: isSuccess ? "completed" : "failed",
        provider_response: body,
        completed_at: new Date().toISOString(),
      })
      .eq("transaction_ref", ref);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
    }

    if (isSuccess) {
      const depositAmount = transaction.amount;

      // Check if this is a loan repayment
      if (transaction.transaction_type === 'loan_repayment' && transaction.withdrawal_id) {
        const loanId = transaction.withdrawal_id;
        console.log(`Processing loan repayment for loan ${loanId}, amount: ${depositAmount}`);

        // Get current loan
        const { data: loan, error: loanErr } = await supabaseClient
          .from("loans")
          .select("*")
          .eq("id", loanId)
          .single();

        if (loanErr || !loan) {
          console.error("Loan not found:", loanId);
        } else {
          const newBalance = Math.max(0, (loan.remaining_balance || 0) - depositAmount);
          const newPaidAmount = (loan.paid_amount || 0) + depositAmount;

          // Update loan balance
          await supabaseClient.from("loans").update({
            remaining_balance: newBalance,
            paid_amount: newPaidAmount,
            status: newBalance <= 0 ? 'completed' : 'active',
            is_defaulted: newBalance <= 0 ? false : loan.is_defaulted,
            missed_installments: newBalance <= 0 ? 0 : loan.missed_installments,
          }).eq("id", loanId);

          console.log(`Loan ${loanId} updated: balance=${newBalance}, paid=${newPaidAmount}`);

          // Mark pending installments as paid
          const { data: unpaidInstallments } = await supabaseClient
            .from("loan_repayments")
            .select("*")
            .eq("loan_id", loanId)
            .in("status", ["pending", "overdue"])
            .order("due_date", { ascending: true });

          let remaining = depositAmount;
          for (const inst of (unpaidInstallments || [])) {
            if (remaining <= 0) break;
            const owed = (inst.amount_due || 0) - (inst.amount_paid || 0);
            const payable = Math.min(remaining, owed);
            const newPaid = (inst.amount_paid || 0) + payable;
            await supabaseClient.from("loan_repayments").update({
              amount_paid: newPaid,
              status: newPaid >= inst.amount_due ? "paid" : inst.status,
              paid_date: newPaid >= inst.amount_due ? new Date().toISOString().split("T")[0] : null,
              payment_reference: `MOMO-${ref}`,
            }).eq("id", inst.id);
            remaining -= payable;
          }

          // Create ledger entry for loan repayment tracking (does NOT affect wallet balance)
          await supabaseClient.from("ledger_entries").insert({
            user_id: transaction.user_id,
            entry_type: "LOAN_REPAYMENT",
            amount: -depositAmount,
            reference: `LOAN-MOMO-REPAY-${loanId}-${Date.now()}`,
            metadata: JSON.stringify({
              loan_id: loanId,
              method: "mobile_money",
              phone: phone,
              transaction_ref: ref,
              loan_remaining_balance: newBalance,
            }),
          });

          console.log(`Loan repayment processed successfully for loan ${loanId}`);
        }
      } else {
        // Regular deposit - credit user's wallet
        const { error: ledgerError } = await supabaseClient
          .from("ledger_entries")
          .insert({
            user_id: transaction.user_id,
            entry_type: "DEPOSIT",
            amount: depositAmount,
            reference: `DEPOSIT-${ref}`,
            metadata: JSON.stringify({
              transaction_ref: ref,
              phone: phone,
              currency: body.currency || "UGX",
              provider: "gosentepay",
            }),
          });

        if (ledgerError) {
          console.error("Error creating ledger entry:", ledgerError);
        } else {
          console.log(`Successfully credited UGX ${depositAmount} to user ${transaction.user_id}`);
        }
      }
    } else {
      console.log(`Deposit failed for ref ${ref}, status: ${status}`);
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
