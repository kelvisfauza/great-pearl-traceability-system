// Daily reconciliation: ensures every confirmed MoMo direct loan repayment
// has a paired (+DEPOSIT, -LOAN_REPAYMENT) ledger entry so the wallet is
// never wrongly debited. Auto-posts the missing DEPOSIT when an orphan
// negative LOAN_REPAYMENT is found whose mobile_money_transactions row is
// 'completed' and has no existing pair or prior refund.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const summary = { scanned: 0, repaired: 0, refunded: 0, errors: [] as string[] };

  try {
    // 1) Pull recent (last 60 days) negative LOAN_REPAYMENT mobile_money entries
    const sinceIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: entries, error } = await supabase
      .from("ledger_entries")
      .select("id, user_id, amount, created_at, metadata")
      .eq("entry_type", "LOAN_REPAYMENT")
      .gte("created_at", sinceIso);

    if (error) throw error;

    for (const le of entries || []) {
      const meta: any = le.metadata || {};
      if (meta.method !== "mobile_money" || !meta.transaction_ref) continue;
      summary.scanned++;

      const txRef = meta.transaction_ref as string;

      // Confirm the MoMo transaction succeeded
      const { data: mmt } = await supabase
        .from("mobile_money_transactions")
        .select("status, amount, phone")
        .eq("transaction_ref", txRef)
        .maybeSingle();
      if (!mmt || mmt.status !== "completed") continue;

      // Skip if a paired DEPOSIT already exists
      const { data: pair } = await supabase
        .from("ledger_entries")
        .select("id")
        .eq("user_id", le.user_id)
        .eq("entry_type", "DEPOSIT")
        .filter("metadata->>transaction_ref", "eq", txRef)
        .filter("metadata->>pair", "eq", "loan_repayment_in")
        .maybeSingle();
      if (pair) continue;

      // Skip if a corrective refund already exists for this orphan
      const { data: refund } = await supabase
        .from("ledger_entries")
        .select("id")
        .eq("user_id", le.user_id)
        .eq("entry_type", "DEPOSIT")
        .filter("metadata->>original_ledger_id", "eq", le.id)
        .maybeSingle();
      if (refund) continue;

      // Post the missing paired DEPOSIT to make the wallet net-zero
      const amount = Math.abs(Number(le.amount) || 0);
      const { error: insErr } = await supabase.from("ledger_entries").insert({
        user_id: le.user_id,
        entry_type: "DEPOSIT",
        amount,
        reference: `LOAN-MOMO-IN-RECON-${le.id}-${Date.now()}`,
        metadata: {
          description: `Reconciliation: missing MoMo deposit for confirmed loan repayment (UGX ${amount.toLocaleString()}).`,
          source: "momo_loan_repayment_in",
          loan_id: meta.loan_id,
          method: "mobile_money",
          phone: meta.phone || mmt.phone,
          transaction_ref: txRef,
          pair: "loan_repayment_in",
          reconciliation: true,
          original_ledger_id: le.id,
        },
      });
      if (insErr) {
        summary.errors.push(`${txRef}: ${insErr.message}`);
        continue;
      }
      summary.repaired++;
    }
  } catch (e: any) {
    summary.errors.push(e?.message || String(e));
  }

  console.log("[Reconcile MoMo Loan Repayments]", summary);
  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
