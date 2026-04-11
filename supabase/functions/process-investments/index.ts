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
      const newPrincipal = principal + interest;

      // Auto-compound: add interest to principal and extend by another 3 months
      const newMaturity = new Date();
      newMaturity.setMonth(newMaturity.getMonth() + 3);
      const newMaturityDate = newMaturity.toISOString().split("T")[0];

      const { error: updateErr } = await supabase.from("investments").update({
        amount: newPrincipal,
        start_date: today,
        maturity_date: newMaturityDate,
        earned_interest: (Number(inv.earned_interest) || 0) + interest,
      }).eq("id", inv.id);

      if (updateErr) {
        console.error(`Failed to compound ${inv.user_email}:`, updateErr);
        continue;
      }

      processed++;
      console.log(`🔄 Compounded investment for ${inv.user_email}: ${principal} → ${newPrincipal} (+ ${interest} interest), next maturity: ${newMaturityDate}`);
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
