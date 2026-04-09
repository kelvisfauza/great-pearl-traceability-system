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
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // Find matured investments
    const { data: matured, error: fetchErr } = await supabase
      .from("investments")
      .select("*")
      .eq("status", "active")
      .lte("maturity_date", today);

    if (fetchErr) throw fetchErr;

    let processed = 0;

    for (const inv of matured || []) {
      const interest = Number(inv.amount) * (Number(inv.interest_rate) / 100);
      const payout = Number(inv.amount) + interest;

      // Get unified user ID
      const { data: unifiedId } = await supabase.rpc("get_unified_user_id", { input_email: inv.user_email });
      const userId = unifiedId || inv.user_id;

      const ref = `INVEST-MATURED-${inv.id.slice(0, 8)}`;

      // Credit wallet
      const { error: ledgerErr } = await supabase.from("ledger_entries").insert([{
        user_id: userId,
        entry_type: "DEPOSIT",
        amount: payout,
        reference: ref,
        source_category: "SYSTEM_AWARD",
        metadata: {
          description: `Investment matured - ${Number(inv.interest_rate)}% interest earned`,
          type: 'investment_matured',
          investment_id: inv.id,
          interest,
        },
      }]);

      if (ledgerErr) {
        console.error(`Failed to credit ${inv.user_email}:`, ledgerErr);
        continue;
      }

      // Update investment
      await supabase.from("investments").update({
        status: "matured",
        earned_interest: interest,
        total_payout: payout,
        withdrawn_at: new Date().toISOString(),
      }).eq("id", inv.id);

      processed++;
      console.log(`✅ Matured investment for ${inv.user_email}: ${payout} credited`);
    }

    return new Response(JSON.stringify({ ok: true, processed, total: matured?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error processing investments:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
