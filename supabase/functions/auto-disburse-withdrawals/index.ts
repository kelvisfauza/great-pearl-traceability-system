import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const gosentepayApiKey = Deno.env.get("GOSENTEPAY_API_KEY");
  const gosentepaySecretKey = Deno.env.get("GOSENTEPAY_SECRET_KEY");
  const yoolaSmsApiKey = Deno.env.get("YOOLA_SMS_API_KEY");

  if (!gosentepayApiKey || !gosentepaySecretKey) {
    console.error("GosentePay credentials not configured");
    return new Response(JSON.stringify({ error: "GosentePay not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // SAFETY: Only pick up withdrawals that have NEVER been attempted (payout_attempted_at IS NULL)
    // This prevents dangerous retry loops. Failed payouts must be retried MANUALLY by Finance.
    const { data: pendingPayouts, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("status", "approved")
      .eq("channel", "MOBILE_MONEY")
      .eq("payout_status", "pending")
      .is("payout_attempted_at", null)  // CRITICAL: Only never-attempted records
      .not("finance_approved_at", "is", null)
      .not("admin_approved_1_at", "is", null)  // CRITICAL: Must have at least one admin approval
      .not("approved_at", "is", null)  // CRITICAL: Must have final admin approval timestamp (set by admin, not finance)
      .order("approved_at", { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error("Error fetching pending payouts:", fetchError);
      throw fetchError;
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return new Response(JSON.stringify({ status: "ok", processed: 0, message: "No new payouts to process" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Found ${pendingPayouts.length} NEW payout(s) to process (never attempted before)`);

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < pendingPayouts.length; i++) {
      const withdrawal = pendingPayouts[i];
      
      // GosentePay rate limit: wait 12 seconds between transfers
      if (i > 0) {
        console.log("Waiting 12s for GosentePay rate limit...");
        await new Promise(r => setTimeout(r, 12000));
      }

      const phone = withdrawal.disbursement_phone || withdrawal.phone_number;
      if (!phone) {
        console.error(`No phone for withdrawal ${withdrawal.id}, marking failed`);
        await supabase.from("withdrawal_requests").update({
          payout_status: "failed",
          payout_error: "No disbursement phone number",
          payout_attempted_at: new Date().toISOString()
        }).eq("id", withdrawal.id);
        failed++;
        continue;
      }

      // Normalize phone
      let cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "256" + cleanPhone.slice(1);
      if (!cleanPhone.startsWith("256")) cleanPhone = "256" + cleanPhone;

      // Mark as processing IMMEDIATELY to prevent double-sends
      const { error: lockError } = await supabase.from("withdrawal_requests").update({
        payout_status: "processing",
        payout_attempted_at: new Date().toISOString()
      }).eq("id", withdrawal.id)
        .eq("payout_status", "pending")  // Optimistic lock - only update if still pending
        .is("payout_attempted_at", null);

      if (lockError) {
        console.error(`Failed to lock withdrawal ${withdrawal.id}, skipping (may already be processing)`);
        continue;
      }

      try {
        console.log(`Processing payout: ${withdrawal.id} - UGX ${withdrawal.amount} to ${cleanPhone}`);

        const payoutResponse = await fetch("https://api.gosentepay.com/v1/withdraw_collections.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": gosentepayApiKey,
          },
          body: JSON.stringify({
            secret_key: gosentepaySecretKey,
            currency: "UGX",
            amount: String(withdrawal.amount),
            emailAddress: "system@greatpearlcoffee.com",
            phone: cleanPhone,
            reason: `Wallet withdrawal - ${withdrawal.request_ref || withdrawal.id}`,
          }),
        });

        const payoutData = await payoutResponse.json();
        console.log(`Payout response for ${withdrawal.id}:`, JSON.stringify(payoutData));

        const innerData = payoutData.data || payoutData;
        const isSuccess =
          ((innerData.status === 200 || innerData.status === 202 || innerData.code === 200 || innerData.code === 202) &&
          (innerData.message?.toLowerCase().includes("accepted") || innerData.message?.toLowerCase().includes("success") || payoutData.status === "success"))
          || (payoutResponse.ok && payoutData.txRef);

        if (isSuccess) {
          const txRef = payoutData.txRef || withdrawal.request_ref;
          
          await supabase.from("withdrawal_requests").update({
            payout_status: "sent",
            payout_ref: txRef,
            payout_attempted_at: new Date().toISOString(),
            payout_error: null
          }).eq("id", withdrawal.id);

          // Deduct from tracked GosentePay balance
          const { data: currentBal } = await supabase
            .from("gosentepay_balance")
            .select("balance")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (currentBal) {
            const newBal = currentBal.balance - withdrawal.amount;
            await supabase.from("gosentepay_balance").update({
              balance: newBal,
              last_updated_by: "auto-disburse",
              last_transaction_ref: txRef,
              last_transaction_type: "payout_deduction",
              updated_at: new Date().toISOString()
            }).order("updated_at", { ascending: false }).limit(1);

            await supabase.from("gosentepay_balance_log").insert({
              previous_balance: currentBal.balance,
              new_balance: newBal,
              change_amount: -withdrawal.amount,
              change_type: "payout_deduction",
              reference: txRef,
              notes: `Auto-disburse to ${cleanPhone}`,
              created_by: "system"
            });
          }

          // Get employee name and system phone for SMS
          let employeeName = "User";
          let employeeSystemPhone = "";
          const { data: emp } = await supabase
            .from("employees")
            .select("name, phone")
            .or(`auth_user_id.eq.${withdrawal.user_id},email.eq.${withdrawal.user_id}`)
            .maybeSingle();
          if (emp) {
            employeeName = emp.name;
            employeeSystemPhone = emp.phone || "";
          }

          // Send SMS to employee's system phone, NOT the disbursement number
          if (yoolaSmsApiKey && employeeSystemPhone) {
            let smsPhone = employeeSystemPhone.replace(/\D/g, "");
            if (smsPhone.startsWith("0")) smsPhone = "+256" + smsPhone.slice(1);
            else if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;
            else if (!smsPhone.startsWith("+")) smsPhone = "+256" + smsPhone;

            const smsMessage = `Dear ${employeeName}, your withdrawal of UGX ${withdrawal.amount.toLocaleString()} has been APPROVED and sent to your Mobile Money number ${phone}. Ref: ${txRef}. Great Pearl Coffee.`;

            try {
              const smsResp = await fetch("https://yoolasms.com/api/v1/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: smsPhone, message: smsMessage, api_key: yoolaSmsApiKey }),
              });
              const smsResult = await smsResp.text();
              console.log(`SMS sent for ${withdrawal.id}:`, smsResp.status, smsResult);
            } catch (smsErr) {
              console.error(`SMS error for ${withdrawal.id}:`, smsErr);
            }
          }

          processed++;
          console.log(`Payout SUCCESS for ${withdrawal.id}: ${txRef}`);
        } else {
          // Mark as FAILED - will NOT be auto-retried. Finance must manually retry.
          await supabase.from("withdrawal_requests").update({
            payout_status: "failed",
            payout_error: innerData.message || "Transfer rejected by provider",
            payout_attempted_at: new Date().toISOString()
          }).eq("id", withdrawal.id);
          failed++;
          console.error(`Payout FAILED for ${withdrawal.id}: ${innerData.message}. Will NOT auto-retry - Finance must retry manually.`);
        }
      } catch (payoutErr) {
        console.error(`Payout exception for ${withdrawal.id}:`, payoutErr);
        await supabase.from("withdrawal_requests").update({
          payout_status: "failed",
          payout_error: payoutErr instanceof Error ? payoutErr.message : "Unknown error",
          payout_attempted_at: new Date().toISOString()
        }).eq("id", withdrawal.id);
        failed++;
      }
    }

    console.log(`Auto-disburse complete: ${processed} sent, ${failed} failed (failed ones require manual retry)`);

    return new Response(
      JSON.stringify({ status: "ok", processed, failed, total: pendingPayouts.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-disburse error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
