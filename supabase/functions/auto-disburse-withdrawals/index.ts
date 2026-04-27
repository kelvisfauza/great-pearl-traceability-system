import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

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
  const yoolaSmsApiKey = Deno.env.get("YOOLA_SMS_API_KEY");

  // Check Yo Payments credentials
  if (!Deno.env.get("YO_API_USERNAME") || !Deno.env.get("YO_API_PASSWORD")) {
    console.error("Yo Payments credentials not configured");
    return new Response(JSON.stringify({ error: "Yo Payments not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // SAFETY: Only pick up withdrawals that have NEVER been attempted (payout_attempted_at IS NULL)
    const { data: pendingPayouts, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("status", "approved")
      .eq("payment_channel", "MOBILE_MONEY")
      .eq("payout_status", "pending")
      .is("payout_attempted_at", null)
      .not("finance_approved_at", "is", null)
      .not("admin_approved_1_at", "is", null)
      .not("approved_at", "is", null)
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

    console.log(`Found ${pendingPayouts.length} NEW payout(s) to process`);

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < pendingPayouts.length; i++) {
      const withdrawal = pendingPayouts[i];
      
      // Rate limit: wait 5 seconds between transfers
      if (i > 0) {
        console.log("Waiting 5s between Yo Payments transfers...");
        await new Promise(r => setTimeout(r, 5000));
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

      const cleanPhone = normalizePhone(phone);

      // Mark as processing IMMEDIATELY to prevent double-sends
      const { error: lockError } = await supabase.from("withdrawal_requests").update({
        payout_status: "processing",
        payout_attempted_at: new Date().toISOString()
      }).eq("id", withdrawal.id)
        .eq("payout_status", "pending")
        .is("payout_attempted_at", null);

      if (lockError) {
        console.error(`Failed to lock withdrawal ${withdrawal.id}, skipping`);
        continue;
      }

      try {
        console.log(`Processing payout: ${withdrawal.id} - UGX ${withdrawal.amount} to ${cleanPhone}`);

        const result = await yoPayout({
          phone: cleanPhone,
          amount: withdrawal.amount,
          narrative: `Wallet withdrawal - ${withdrawal.request_ref || withdrawal.id}`,
        });

        if (result.success) {
          const txRef = result.transactionRef || withdrawal.request_ref || `YO-${Date.now()}`;
          
          await supabase.from("withdrawal_requests").update({
            payout_status: "sent",
            payout_ref: txRef,
            payout_attempted_at: new Date().toISOString(),
            payout_error: null
          }).eq("id", withdrawal.id);

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

          // Send SMS notification
          if (yoolaSmsApiKey && employeeSystemPhone) {
            let smsPhone = employeeSystemPhone.replace(/\D/g, "");
            if (smsPhone.startsWith("0")) smsPhone = "+256" + smsPhone.slice(1);
            else if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;
            else if (!smsPhone.startsWith("+")) smsPhone = "+256" + smsPhone;

            const smsMessage = `Dear ${employeeName}, your withdrawal of UGX ${withdrawal.amount.toLocaleString()} has been APPROVED and sent to your Mobile Money number ${phone}. Ref: ${txRef}. Great Agro Coffee.`;

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
          await supabase.from("withdrawal_requests").update({
            payout_status: "failed",
            payout_error: result.errorMessage || "Transfer rejected by Yo Payments",
            payout_attempted_at: new Date().toISOString()
          }).eq("id", withdrawal.id);
          failed++;
          console.error(`Payout FAILED for ${withdrawal.id}: ${result.errorMessage}`);
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

    console.log(`Auto-disburse complete: ${processed} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ status: "ok", processed, failed, total: pendingPayouts.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-disburse error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? (error as Error).message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
