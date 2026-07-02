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
      const principal = Number(inv.amount);
      const rate = Number(inv.interest_rate) / 100;
      const interest = principal * rate;
      const payout = principal + interest;
      const payoutRef = `INVEST-MATURE-${String(inv.id).slice(0, 8)}`;

      // Resolve unified user id for ledger
      let unifiedId = inv.user_id;
      try {
        const { data: uid } = await supabase.rpc("get_unified_user_id", { input_email: inv.user_email });
        if (uid) unifiedId = uid;
      } catch (_) {}

      // Idempotency: skip if ledger entry already exists
      const { data: existing } = await supabase
        .from("ledger_entries")
        .select("id")
        .eq("reference", payoutRef)
        .maybeSingle();

      if (!existing) {
        const { error: ledgerErr } = await supabase.from("ledger_entries").insert([{
          user_id: unifiedId,
          entry_type: "DEPOSIT",
          amount: payout,
          reference: payoutRef,
          source_category: "SYSTEM_AWARD",
          metadata: {
            description: `Investment matured - principal UGX ${principal.toLocaleString()} + interest UGX ${Math.round(interest).toLocaleString()} @ 25% - ${payoutRef}`,
            type: "investment_maturity_payout",
            investment_id: inv.id,
            principal,
            interest,
            bypass_treasury_check: true,
          },
        }]);
        if (ledgerErr) {
          console.error(`Failed to credit ${inv.user_email}:`, ledgerErr);
          continue;
        }
      }

      // Mark investment matured
      const { error: updateErr } = await supabase.from("investments").update({
        status: "matured",
        earned_interest: interest,
        total_payout: payout,
        withdrawn_at: new Date().toISOString(),
      }).eq("id", inv.id);

      if (updateErr) {
        console.error(`Failed to mark matured ${inv.user_email}:`, updateErr);
        continue;
      }

      // Notify via email + SMS
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "investment-matured",
            recipientEmail: inv.user_email,
            idempotencyKey: `invest-matured-${inv.id}`,
            templateData: {
              employeeName: inv.employee_name || inv.user_email,
              principal,
              interest: Math.round(interest),
              payout: Math.round(payout),
              interestRate: 25,
              maturityDate: inv.maturity_date,
              investmentRef: payoutRef,
            },
          },
        });
      } catch (emailErr) {
        console.warn(`Email failed for ${inv.user_email}:`, emailErr);
      }

      processed++;
      console.log(`✅ Matured & credited ${inv.user_email}: UGX ${payout} (principal ${principal} + interest ${interest})`);
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
