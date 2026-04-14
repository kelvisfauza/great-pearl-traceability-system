import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { resolveYoTransactionStatus } from "../_shared/yo-status.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const username = Deno.env.get("YO_API_USERNAME");
    const password = Deno.env.get("YO_API_PASSWORD");

    if (!username || !password) {
      console.error("[Payout Poller] Yo API credentials not configured");
      return new Response(JSON.stringify({ error: "Yo credentials missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalChecked = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    // ─── Check Meal Disbursements ───
    const { data: pendingMeals } = await supabase
      .from("meal_disbursements")
      .select("*")
      .eq("yo_status", "pending_approval")
      .order("created_at", { ascending: true });

    if (pendingMeals && pendingMeals.length > 0) {
      console.log(`[Payout Poller] Checking ${pendingMeals.length} pending meal disbursements`);

      for (const record of pendingMeals) {
        totalChecked++;
        const refs = [record.yo_reference].filter(Boolean);
        const result = await resolveYoTransactionStatus(username, password, refs);
        console.log(`[Payout Poller] Meal ${record.id} (${record.yo_reference}): ${result.resolvedStatus}`);

        if (result.resolvedStatus === "completed") {
          const { data: updated } = await supabase
            .from("meal_disbursements")
            .update({ yo_status: "success", updated_at: new Date().toISOString() })
            .eq("id", record.id)
            .eq("yo_status", "pending_approval")
            .select("id");

          if (updated && updated.length > 0) {
            totalCompleted++;
            // Send SMS to receiver
            await sendReceiverSms(supabase, {
              phone: record.receiver_phone,
              name: record.receiver_name,
              amount: record.total_amount,
              type: "meal",
              description: record.description,
              ref: record.yo_reference,
            });
          }
        } else if (result.resolvedStatus === "failed") {
          const { data: updated } = await supabase
            .from("meal_disbursements")
            .update({ yo_status: "failed", updated_at: new Date().toISOString() })
            .eq("id", record.id)
            .eq("yo_status", "pending_approval")
            .select("id");

          if (updated && updated.length > 0) totalFailed++;
        } else {
          // Auto-expire after 24h
          const hoursOld = (Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursOld > 24) {
            await supabase
              .from("meal_disbursements")
              .update({ yo_status: "failed", updated_at: new Date().toISOString() })
              .eq("id", record.id)
              .eq("yo_status", "pending_approval");
            totalFailed++;
            console.log(`[Payout Poller] Meal ${record.yo_reference} auto-expired after 24h`);
          }
        }
      }
    }

    // ─── Check Service Provider Payments ───
    const { data: pendingSP } = await supabase
      .from("service_provider_payments")
      .select("*")
      .eq("yo_status", "pending_approval")
      .order("created_at", { ascending: true });

    if (pendingSP && pendingSP.length > 0) {
      console.log(`[Payout Poller] Checking ${pendingSP.length} pending service provider payments`);

      for (const record of pendingSP) {
        totalChecked++;
        const refs = [record.yo_reference].filter(Boolean);
        const result = await resolveYoTransactionStatus(username, password, refs);
        console.log(`[Payout Poller] SP ${record.id} (${record.yo_reference}): ${result.resolvedStatus}`);

        if (result.resolvedStatus === "completed") {
          const { data: updated } = await supabase
            .from("service_provider_payments")
            .update({ yo_status: "success", updated_at: new Date().toISOString() })
            .eq("id", record.id)
            .eq("yo_status", "pending_approval")
            .select("id");

          if (updated && updated.length > 0) {
            totalCompleted++;
            // Send SMS to receiver
            await sendReceiverSms(supabase, {
              phone: record.receiver_phone,
              name: record.receiver_name,
              amount: record.total_amount,
              type: "service",
              description: record.service_description,
              ref: record.yo_reference,
            });
          }
        } else if (result.resolvedStatus === "failed") {
          const { data: updated } = await supabase
            .from("service_provider_payments")
            .update({ yo_status: "failed", updated_at: new Date().toISOString() })
            .eq("id", record.id)
            .eq("yo_status", "pending_approval")
            .select("id");

          if (updated && updated.length > 0) totalFailed++;
        } else {
          const hoursOld = (Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursOld > 24) {
            await supabase
              .from("service_provider_payments")
              .update({ yo_status: "failed", updated_at: new Date().toISOString() })
              .eq("id", record.id)
              .eq("yo_status", "pending_approval");
            totalFailed++;
            console.log(`[Payout Poller] SP ${record.yo_reference} auto-expired after 24h`);
          }
        }
      }
    }

    if (totalChecked === 0) {
      console.log("[Payout Poller] No pending payouts to check");
    }

    const summary = { checked: totalChecked, completed: totalCompleted, failed: totalFailed };
    console.log("[Payout Poller] Summary:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Payout Poller] Error:", error);
    return new Response(JSON.stringify({ error: "Poller failed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Send SMS notification to the payment receiver
 */
async function sendReceiverSms(
  supabase: any,
  opts: { phone: string; name: string | null; amount: number; type: string; description: string; ref: string | null }
) {
  try {
    const label = opts.type === "meal" ? "Meal allowance" : "Service payment";
    const formattedAmount = `UGX ${Number(opts.amount).toLocaleString()}`;
    const greeting = opts.name ? `Dear ${opts.name}, ` : "";
    const refText = opts.ref ? ` Ref: ${opts.ref}` : "";

    const message = `${greeting}You have received ${formattedAmount} for ${opts.description}. ${label} from Great Agro Coffee.${refText}`;

    // Format phone for SMS
    let smsPhone = opts.phone.replace(/\D/g, "");
    if (smsPhone.startsWith("0")) smsPhone = "256" + smsPhone.slice(1);
    if (!smsPhone.startsWith("256")) smsPhone = "256" + smsPhone;

    await supabase.functions.invoke("send-sms", {
      body: {
        phone: smsPhone,
        message,
        userName: opts.name || "Receiver",
        messageType: "payout_confirmation",
        triggeredBy: "system",
        department: "admin",
      },
    });

    console.log(`[Payout Poller] SMS sent to ${smsPhone} for ${label}`);
  } catch (err) {
    console.error(`[Payout Poller] Failed to send SMS to ${opts.phone}:`, err);
  }
}
