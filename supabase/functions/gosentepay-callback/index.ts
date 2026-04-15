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
    const contentType = req.headers.get("content-type") || "";
    let ref: string | undefined;
    let status: string | undefined;
    let phone: string | undefined;
    let rawBody: any;

    // Handle both XML (Yo Payments) and JSON (legacy) callbacks
    if (contentType.includes("xml") || contentType.includes("text/xml")) {
      const xmlText = await req.text();
      console.log("Yo Payments callback received (XML):", xmlText);
      rawBody = { raw_xml: xmlText };

      // Parse Yo Payments XML notification
      // Yo sends: <ExternalReference>, <TransactionStatus> (SUCCEEDED/FAILED), <MsisdnAccount>
      const extRefMatch = xmlText.match(/<ExternalReference>(.*?)<\/ExternalReference>/);
      const txStatusMatch = xmlText.match(/<TransactionStatus>(.*?)<\/TransactionStatus>/);
      const msisdnMatch = xmlText.match(/<MsisdnAccount>(.*?)<\/MsisdnAccount>/);
      const statusMsgMatch = xmlText.match(/<StatusMessage>(.*?)<\/StatusMessage>/);
      const statusMatch = xmlText.match(/<Status>(.*?)<\/Status>/);

      ref = extRefMatch?.[1]?.trim();
      phone = msisdnMatch?.[1]?.trim();
      
      // Yo uses TransactionStatus: SUCCEEDED or FAILED
      const txStatus = txStatusMatch?.[1]?.trim()?.toUpperCase();
      const yoStatus = statusMatch?.[1]?.trim()?.toUpperCase();
      
      if (txStatus === "SUCCEEDED" || yoStatus === "OK") {
        status = "successful";
      } else {
        status = "failed";
      }

      console.log(`Yo Payments parsed: ref=${ref}, status=${status}, phone=${phone}`);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Yo Payments sometimes sends form-urlencoded IPN callbacks
      const formText = await req.text();
      console.log("Yo Payments callback received (form-urlencoded):", formText);
      const params = new URLSearchParams(formText);
      rawBody = Object.fromEntries(params.entries());

      ref = params.get("external_ref") || params.get("external_reference") || params.get("ExternalReference") || params.get("customer_reference") || undefined;
      phone = params.get("msisdn") || params.get("MsisdnAccount") || params.get("account") || undefined;

      const txStatus = (params.get("transaction_status") || params.get("TransactionStatus") || "").toUpperCase();
      const yoStatus = (params.get("status") || params.get("Status") || "").toUpperCase();
      const networkRef = params.get("network_ref") || params.get("NetworkRef") || "";

      if (txStatus === "SUCCEEDED" || yoStatus === "OK" || yoStatus === "SUCCESSFUL") {
        status = "successful";
      } else if (txStatus === "FAILED" || yoStatus === "FAILED") {
        status = "failed";
      } else if (networkRef) {
        // Yo deposit IPN: presence of network_ref without explicit failure means telco processed successfully
        status = "successful";
        console.log(`No explicit status field but network_ref=${networkRef} present — treating as successful`);
      } else {
        status = "failed";
      }

      console.log(`Yo Payments form parsed: ref=${ref}, status=${status}, phone=${phone}, raw keys: ${Array.from(params.keys()).join(', ')}`);
    } else {
      // Try JSON first, fall back to form-urlencoded
      const bodyText = await req.text();
      console.log("Callback received (raw):", bodyText);
      
      try {
        const body = JSON.parse(bodyText);
        rawBody = body;
        ref = body.customer_reference || body.ref || body.external_reference;
        status = (body.status || "").toLowerCase();
        phone = body.msisdn || body.phone;
      } catch {
        // Try as form-urlencoded
        const params = new URLSearchParams(bodyText);
        rawBody = Object.fromEntries(params.entries());
        ref = params.get("external_reference") || params.get("ExternalReference") || params.get("customer_reference") || undefined;
        phone = params.get("msisdn") || params.get("MsisdnAccount") || undefined;
        
        const txStatus = (params.get("transaction_status") || params.get("TransactionStatus") || "").toUpperCase();
        const yoStatus = (params.get("status") || params.get("Status") || "").toUpperCase();
        
        if (txStatus === "SUCCEEDED" || yoStatus === "OK" || yoStatus === "SUCCESSFUL") {
          status = "successful";
        } else {
          status = "failed";
        }
        
        console.log(`Fallback form parsed: ref=${ref}, status=${status}, phone=${phone}`);
      }
    }

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

    // Check if this is an instant withdrawal callback (INSTANT-WD-* ref)
    if (ref?.startsWith("INSTANT-WD-")) {
      console.log(`Processing instant withdrawal callback: ref=${ref}, status=${status}`);
      
      const { data: instantWd, error: iwErr } = await supabaseClient
        .from("instant_withdrawals")
        .select("*")
        .eq("payout_ref", ref)
        .maybeSingle();

      if (iwErr || !instantWd) {
        console.error("Instant withdrawal not found for ref:", ref);
        return new Response(
          JSON.stringify({ error: "Unknown instant withdrawal reference" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (instantWd.payout_status === 'success' || instantWd.payout_status === 'failed') {
        console.log(`Instant withdrawal ${ref} already finalized: ${instantWd.payout_status}`);
        return new Response(
          JSON.stringify({ received: true, already_processed: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isSuccess = status === "successful";

      if (isSuccess) {
        await supabaseClient.from("instant_withdrawals")
          .update({ payout_status: 'success', completed_at: new Date().toISOString() })
          .eq("id", instantWd.id);
        console.log(`Instant withdrawal ${ref} marked as success`);
      } else {
        // Refund: reverse the ledger deduction
        await supabaseClient.from("instant_withdrawals")
          .update({ payout_status: 'failed', completed_at: new Date().toISOString() })
          .eq("id", instantWd.id);

        if (instantWd.ledger_reference) {
          await supabaseClient.from("ledger_entries").insert({
            user_id: instantWd.user_id,
            entry_type: "DEPOSIT",
            amount: instantWd.amount,
            reference: `REFUND-${instantWd.ledger_reference}`,
            source_category: "SYSTEM_AWARD",
            metadata: {
              type: "instant_withdrawal_refund",
              original_ref: ref,
              reason: "Payout rejected/failed at provider",
            },
          });
          console.log(`Refunded UGX ${instantWd.amount} for failed instant withdrawal ${ref}`);
        }
      }

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        provider_response: rawBody,
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

          await supabaseClient.from("loans").update({
            remaining_balance: newBalance,
            paid_amount: newPaidAmount,
            status: newBalance <= 0 ? 'completed' : 'active',
            is_defaulted: newBalance <= 0 ? false : loan.is_defaulted,
            missed_installments: newBalance <= 0 ? 0 : loan.missed_installments,
          }).eq("id", loanId);

          console.log(`Loan ${loanId} updated: balance=${newBalance}, paid=${newPaidAmount}`);

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

          try {
            await supabaseClient.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'loan-repayment',
                recipientEmail: loan.employee_email,
                idempotencyKey: `loan-repay-momo-${loanId}-${Date.now()}`,
                templateData: {
                  employeeName: loan.employee_name,
                  amountCollected: depositAmount.toLocaleString(),
                  sources: `Mobile Money: UGX ${depositAmount.toLocaleString()}`,
                  remainingBalance: newBalance.toLocaleString(),
                  isFullyPaid: newBalance <= 0,
                  isVoluntaryPayment: true,
                },
              },
            });
            console.log(`Loan repayment email sent to ${loan.employee_email}`);
          } catch (emailErr) {
            console.error('Failed to send loan repayment email:', emailErr);
          }
        }
      } else {
        // Resolve unified user ID for wallet credit
        let walletUserId = transaction.user_id;
        try {
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

        // Regular deposit - credit user's wallet
        const { error: ledgerError } = await supabaseClient
          .from("ledger_entries")
          .insert({
            user_id: walletUserId,
            entry_type: "DEPOSIT",
            amount: depositAmount,
            reference: `DEPOSIT-${ref}`,
            source_category: "SELF_DEPOSIT",
            metadata: JSON.stringify({
              transaction_ref: ref,
              phone: phone,
              currency: "UGX",
              provider: "yo_payments",
              source: "mobile_money",
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
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({ error: "Callback processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
