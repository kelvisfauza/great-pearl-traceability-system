import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Identify caller
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { investmentId } = await req.json();
    if (!investmentId) {
      return new Response(JSON.stringify({ ok: false, error: "investmentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inv, error: invErr } = await admin
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .maybeSingle();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ ok: false, error: "Investment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the owner can early-withdraw
    if (inv.user_id !== userData.user.id && inv.user_email?.toLowerCase() !== userData.user.email?.toLowerCase()) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inv.status !== "active") {
      return new Response(JSON.stringify({ ok: false, error: `Investment already ${inv.status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const principal = Number(inv.amount);
    const totalDays = (Number(inv.maturity_months) || 3) * 30;
    const daysElapsed = Math.max(
      0,
      Math.floor((Date.now() - new Date(inv.start_date).getTime()) / (24 * 60 * 60 * 1000))
    );
    const reducedInterest = principal * 0.25 * (Math.min(daysElapsed, totalDays) / totalDays);
    const payout = principal + reducedInterest;
    const refundRef = `INVEST-EARLY-${String(inv.id).slice(0, 8)}`;

    // Unified id for ledger
    let unifiedId = inv.user_id;
    try {
      const { data: uid } = await admin.rpc("get_unified_user_id", { input_email: inv.user_email });
      if (uid) unifiedId = uid;
    } catch (_) {}

    // Idempotency
    const { data: existing } = await admin
      .from("ledger_entries")
      .select("id")
      .eq("reference", refundRef)
      .maybeSingle();

    if (!existing) {
      const { error: ledgerErr } = await admin.from("ledger_entries").insert([{
        user_id: unifiedId,
        entry_type: "DEPOSIT",
        amount: payout,
        reference: refundRef,
        source_category: "SYSTEM_AWARD",
        metadata: {
          description: `Early investment withdrawal (pro-rated 25%) - ${refundRef}`,
          type: "investment_early_withdrawal",
          investment_id: inv.id,
          principal,
          reduced_interest: reducedInterest,
          days_elapsed: daysElapsed,
          bypass_treasury_check: true,
        },
      }]);
      if (ledgerErr) throw ledgerErr;
    }

    const { error: updErr } = await admin
      .from("investments")
      .update({
        status: "withdrawn_early",
        earned_interest: reducedInterest,
        total_payout: payout,
        withdrawn_at: new Date().toISOString(),
      })
      .eq("id", inv.id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({
      ok: true,
      payout,
      reducedInterest,
      daysElapsed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("early withdraw error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});