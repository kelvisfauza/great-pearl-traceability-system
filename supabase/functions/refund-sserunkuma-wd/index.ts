import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const wdId = "71f76a57-ad39-434a-ba7f-f8f7841841f4";
  const payoutRef = "INSTANT-WD-1779720281996";
  const userId = "5ac019de-199c-4a3f-97de-96de786f55dc";
  const reversalRef = `INSTANT-WD-${wdId}-REVERSAL`;

  const { data: existing } = await sb.from("ledger_entries").select("id").eq("reference", reversalRef).maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ ok: true, already_refunded: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { error: ledErr } = await sb.from("ledger_entries").insert({
    user_id: userId,
    entry_type: "REVERSAL",
    amount: 60000,
    reference: reversalRef,
    source_category: "WITHDRAWAL_REVERSAL",
    metadata: {
      description: "Refund: instant withdrawal rejected — Yo Payments never registered the transaction (StatusCode -30). Admin reversal.",
      original_payout_ref: payoutRef,
      instant_withdrawal_id: wdId,
      phone: "256764340901",
      reason: "yo_not_found_admin_rejected",
    },
  });

  const { error: updErr } = await sb.from("instant_withdrawals")
    .update({ payout_status: "failed", completed_at: new Date().toISOString() })
    .eq("id", wdId);

  return new Response(JSON.stringify({ ok: !ledErr && !updErr, ledErr, updErr }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});