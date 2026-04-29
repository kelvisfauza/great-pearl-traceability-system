import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout } from "../_shared/yo-payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!Deno.env.get("YO_API_USERNAME") || !Deno.env.get("YO_API_PASSWORD")) {
    return new Response(JSON.stringify({ ok: false, error: "Yo Payments not configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Find approved USSD Advance Requests not yet disbursed
    const { data: pending, error } = await supabase
      .from("ussd_advance_requests")
      .select("*, approval_requests:approval_request_id(id, status, amount, admin_approved, finance_approved)")
      .eq("disbursement_status", "pending")
      .not("approval_request_id", "is", null)
      .limit(10);

    if (error) {
      console.error("[USSD Advance Disburse] fetch error:", error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let skipped = 0;

    for (const row of pending || []) {
      const ar = (row as any).approval_requests;
      if (!ar) { skipped++; continue; }
      if (ar.status !== "Approved") { skipped++; continue; }

      // Mark attempted to avoid double-disburse
      const { error: lockError } = await supabase
        .from("ussd_advance_requests")
        .update({
          disbursement_status: "in_progress",
          disbursement_attempted_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("disbursement_status", "pending");

      if (lockError) { console.error("Lock failed:", lockError); continue; }

      const disburseAmount = Number(ar.amount || row.amount);
      try {
        const result = await yoPayout({
          phone: row.phone,
          amount: disburseAmount,
          narrative: `Approved USSD advance for ${row.requester_name || row.phone}`,
        });

        if (result.success) {
          await supabase.from("ussd_advance_requests").update({
            disbursement_status: "completed",
            disbursement_completed_at: new Date().toISOString(),
            disbursement_reference: result.transactionRef || null,
            status: "disbursed",
          }).eq("id", row.id);
          processed++;
          console.log(`[USSD Advance Disburse] ✅ Sent UGX ${disburseAmount} to ${row.phone}`);
        } else {
          await supabase.from("ussd_advance_requests").update({
            disbursement_status: "failed",
            disbursement_error: result.errorMessage || result.statusMessage || "Unknown error",
          }).eq("id", row.id);
          console.error(`[USSD Advance Disburse] ❌ ${row.phone}:`, result.errorMessage);
        }
      } catch (e: any) {
        await supabase.from("ussd_advance_requests").update({
          disbursement_status: "failed",
          disbursement_error: String(e?.message || e),
        }).eq("id", row.id);
      }

      // Rate limit: 5s between Yo calls
      await new Promise((r) => setTimeout(r, 5000));
    }

    return new Response(JSON.stringify({ ok: true, processed, skipped }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[USSD Advance Disburse] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});