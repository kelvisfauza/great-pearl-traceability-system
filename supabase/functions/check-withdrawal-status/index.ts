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
      console.error("[WD Poller] Yo API credentials not configured");
      return new Response(JSON.stringify({ error: "Yo credentials missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all pending_approval instant withdrawals
    const { data: pendingWds, error: fetchErr } = await supabase
      .from("instant_withdrawals")
      .select("*")
      .eq("payout_status", "pending_approval")
      .order("created_at", { ascending: true });

    if (fetchErr) {
      console.error("[WD Poller] Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingWds || pendingWds.length === 0) {
      console.log("[WD Poller] No pending withdrawals to check");
      return new Response(JSON.stringify({ checked: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[WD Poller] Checking ${pendingWds.length} pending withdrawals`);

    let resolved = 0;
    let refunded = 0;
    let completed = 0;

    for (const wd of pendingWds) {
      const references = [wd.payout_ref, wd.ledger_reference];

      const result = await resolveYoTransactionStatus(username, password, references);
      console.log(`[WD Poller] ${wd.id} (${wd.payout_ref}): ${result.resolvedStatus}`);

      if (result.resolvedStatus === "completed") {
        // Only mark success if still pending (optimistic lock)
        const { data: updated } = await supabase
          .from("instant_withdrawals")
          .update({ payout_status: "success", completed_at: new Date().toISOString() })
          .eq("id", wd.id)
          .eq("payout_status", "pending_approval")
          .select("id");

        if (updated && updated.length > 0) {
          completed++;
          resolved++;
          console.log(`[WD Poller] Marked ${wd.payout_ref} as SUCCESS`);
        } else {
          console.log(`[WD Poller] ${wd.payout_ref} already processed, skipping`);
        }

      } else if (result.resolvedStatus === "failed") {
        // Only mark failed if still pending (optimistic lock — prevents double processing)
        const { data: updated } = await supabase
          .from("instant_withdrawals")
          .update({ payout_status: "failed", completed_at: new Date().toISOString() })
          .eq("id", wd.id)
          .eq("payout_status", "pending_approval")
          .select("id");

        // CRITICAL: Only refund if WE actually changed the status right now
        // This prevents double refunds if the poller runs concurrently
        if (updated && updated.length > 0 && wd.ledger_reference) {
          const refundRef = `REFUND-${wd.ledger_reference}`;
          const { error: ledgerErr } = await supabase
            .from("ledger_entries")
            .insert({
              user_id: wd.user_id,
              entry_type: "DEPOSIT",
              amount: wd.amount,
              reference: refundRef,
              source_category: "SYSTEM_AWARD",
              metadata: {
                type: "instant_withdrawal_refund",
                original_ref: wd.payout_ref,
                reason: "Declined/failed at Yo Payments",
                yo_status: result.statusMessage,
                checked_reference: result.checkedReference,
              },
            });

          if (ledgerErr && ledgerErr.code !== "23505") {
            console.error(`[WD Poller] Refund error for ${wd.payout_ref}:`, ledgerErr);
          } else {
            console.log(`[WD Poller] Refunded UGX ${wd.amount} for ${wd.payout_ref}`);
            refunded++;
          }
          resolved++;
        } else if (updated && updated.length === 0) {
          console.log(`[WD Poller] ${wd.payout_ref} already processed, skipping refund`);
        }

      } else {
        // Still pending — check 24-hour auto-expiry
        const hoursOld = (Date.now() - new Date(wd.created_at).getTime()) / (1000 * 60 * 60);

        if (hoursOld > 24) {
          console.log(`[WD Poller] ${wd.payout_ref} is over 24h old, auto-expiring`);

          await supabase
            .from("instant_withdrawals")
            .update({ payout_status: "failed", completed_at: new Date().toISOString() })
            .eq("id", wd.id)
            .eq("payout_status", "pending_approval");

          if (wd.ledger_reference) {
            const refundRef = `REFUND-EXPIRED-${wd.ledger_reference}`;
            const { error: ledgerErr } = await supabase
              .from("ledger_entries")
              .insert({
                user_id: wd.user_id,
                entry_type: "DEPOSIT",
                amount: wd.amount,
                reference: refundRef,
                source_category: "SYSTEM_AWARD",
                metadata: {
                  type: "instant_withdrawal_refund",
                  original_ref: wd.payout_ref,
                  reason: "Auto-expired after 24 hours without authorization",
                },
              });

            if (ledgerErr && ledgerErr.code !== "23505") {
              console.error(`[WD Poller] Expiry refund error:`, ledgerErr);
            }
          }

          refunded++;
          resolved++;
        }
      }
    }

    const summary = { checked: pendingWds.length, resolved, completed, refunded };
    console.log(`[WD Poller] Summary:`, summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WD Poller] Error:", error);
    return new Response(JSON.stringify({ error: "Poller failed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
