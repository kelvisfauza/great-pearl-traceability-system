import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const { data: ops } = await supabase
    .from("admin_wallet_operations")
    .select("id, amount, destination_phone, ledger_reference, gateway_reference")
    .like("gateway_reference", "YO-MANUAL-%");

  const results: unknown[] = [];
  for (const op of ops || []) {
    const res = await yoPayout({
      phone: normalizePhone(op.destination_phone),
      amount: Number(op.amount),
      narrative: `Wallet withdrawal - ${op.ledger_reference}`.slice(0, 120),
    });
    if (res.success) {
      await supabase.from("admin_wallet_operations")
        .update({ gateway_reference: res.transactionRef || `YO-${Date.now()}` })
        .eq("id", op.id);
    } else {
      await supabase.from("admin_wallet_operations")
        .update({ execution_error: res.errorMessage || "Yo payout failed" })
        .eq("id", op.id);
    }
    results.push({ id: op.id, success: res.success, ref: res.transactionRef, error: res.errorMessage });
  }
  return new Response(JSON.stringify({ ok: true, results }), { headers: { "Content-Type": "application/json" } });
});
