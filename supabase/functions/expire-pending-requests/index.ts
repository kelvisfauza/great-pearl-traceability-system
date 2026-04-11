import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Find all approval_requests that are pending_finance or pending_admin
    // and older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`[expire-requests] Checking for requests older than: ${cutoff}`);

    const { data: expiredRequests, error: fetchErr } = await supabase
      .from("approval_requests")
      .select("*")
      .in("approval_stage", ["pending_finance", "pending_admin"])
      .in("status", ["Pending Finance", "Pending Admin", "pending"])
      .lt("created_at", cutoff);

    if (fetchErr) throw fetchErr;

    if (!expiredRequests || expiredRequests.length === 0) {
      console.log("[expire-requests] No expired requests found");
      return new Response(JSON.stringify({ ok: true, expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[expire-requests] Found ${expiredRequests.length} expired requests`);

    // Only these request types involve wallet deductions and need refunds
    const WALLET_FUNDED_TYPES = ["Withdrawal Request", "Salary Advance"];

    let processed = 0;

    for (const req of expiredRequests) {
      const email = req.requestedby;
      const amount = req.amount;
      const name = req.requestedby_name || email;
      const isWalletFunded = WALLET_FUNDED_TYPES.includes(req.type);

      // Update request status to expired
      const { error: updateErr } = await supabase
        .from("approval_requests")
        .update({
          status: "Expired",
          approval_stage: "expired",
          rejection_reason: "Auto-expired: No approval within 24 hours",
        })
        .eq("id", req.id);

      if (updateErr) {
        console.error(`[expire-requests] Error updating ${req.id}:`, updateErr);
        continue;
      }

      // Only refund wallet-funded request types (Withdrawals, Salary Advances)
      // Company expenses (Cash Requisition, Expense, etc.) don't deduct from wallets
      if (isWalletFunded) {
        // Resolve auth user ID for ledger
        const { data: emp } = await supabase
          .from("employees")
          .select("auth_user_id")
          .eq("email", email)
          .maybeSingle();

        const userId = emp?.auth_user_id;

        if (userId) {
          const ledgerRef = `REFUND-EXPIRED-${req.id.slice(0, 8).toUpperCase()}`;

          // Check if refund already issued (idempotency)
          const { data: existing } = await supabase
            .from("ledger_entries")
            .select("id")
            .eq("reference", ledgerRef)
            .maybeSingle();

          if (!existing) {
            await supabase.from("ledger_entries").insert({
              user_id: userId,
              entry_type: "DEPOSIT",
              amount: amount,
              reference: ledgerRef,
              metadata: {
                reason: "Refund: request expired (no approval within 24h)",
                original_request_id: req.id,
                request_type: req.type,
              },
              source_category: "system",
            });
            console.log(`[expire-requests] Refunded UGX ${amount} to ${email} (${ledgerRef})`);
          }
        } else {
          console.warn(`[expire-requests] No auth_user_id found for ${email}, skipping refund for ${req.id}`);
        }
      } else {
        console.log(`[expire-requests] Skipping refund for ${req.type} "${req.title}" — company expense, no wallet deduction`);
      }

      // Send email notification
      const requestDate = new Date(req.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "request-expired-refund",
            recipientEmail: email,
            idempotencyKey: `expired-refund-${req.id}`,
            templateData: {
              employeeName: name,
              requestType: req.type || "Request",
              amount: Number(amount).toLocaleString(),
              requestDate,
              refundAmount: Number(amount).toLocaleString(),
            },
          },
        });
        console.log(`[expire-requests] Email sent to ${email}`);
      } catch (emailErr) {
        console.error(`[expire-requests] Email failed for ${email}:`, emailErr);
      }

      processed++;
    }

    console.log(`[expire-requests] Done. Processed ${processed} expired requests.`);

    return new Response(
      JSON.stringify({ ok: true, expired: processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[expire-requests] Error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
