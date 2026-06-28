import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({} as any));
    const action: "apply" | "release" = body?.action === "release" ? "release" : "apply";
    const pct: number = Number(body?.percentage ?? 35);
    const reason: string = body?.reason ||
      "35% of your wallet has been temporarily locked until all attendance records are fully entered into the system. Once attendance is complete, the lock will be released.";

    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, name, email")
      .eq("status", "Active")
      .eq("disabled", false);
    if (empErr) throw empErr;

    const results: any[] = [];

    for (const emp of employees || []) {
      if (!emp.email) continue;

      if (action === "release") {
        await supabase
          .from("employees")
          .update({
            wallet_locked_amount: 0,
            wallet_locked_reason: null,
            wallet_locked_at: null,
            wallet_locked_percentage: null,
          })
          .eq("id", emp.id);
        results.push({ id: emp.id, released: true });
        // Notify release
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "wallet-lock-released",
              recipientEmail: emp.email,
              idempotencyKey: `wallet-lock-release-${emp.id}-${Date.now()}`,
              templateData: { name: emp.name },
            },
          });
        } catch (_) {}
        continue;
      }

      // Compute balance via RPC
      let balance = 0;
      try {
        const { data: b } = await supabase.rpc("get_user_balance_safe", { user_email: emp.email });
        balance = Number((b as any)?.[0]?.wallet_balance || 0);
      } catch (_) {}

      const lockAmount = Math.max(0, Math.round((balance * pct) / 100));

      await supabase
        .from("employees")
        .update({
          wallet_locked_amount: lockAmount,
          wallet_locked_reason: reason,
          wallet_locked_at: new Date().toISOString(),
          wallet_locked_percentage: pct,
        })
        .eq("id", emp.id);

      results.push({ id: emp.id, name: emp.name, balance, lockAmount });

      // Email
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "wallet-lock-applied",
            recipientEmail: emp.email,
            idempotencyKey: `wallet-lock-apply-${emp.id}-${new Date().toISOString().slice(0,10)}`,
            templateData: {
              name: emp.name,
              percentage: pct,
              lockedAmount: lockAmount.toLocaleString(),
              walletBalance: balance.toLocaleString(),
              reason,
            },
          },
        });
      } catch (e) {
        console.warn("email failed for", emp.email, (e as Error).message);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, action, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[apply-attendance-wallet-lock]", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});