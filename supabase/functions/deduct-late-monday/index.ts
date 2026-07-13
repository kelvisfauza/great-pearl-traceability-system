import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const DEDUCTION = 5000;
    const today = new Date().toISOString().split("T")[0];
    const EXCLUDE_NAME = "Bwambale Benson";

    const { data: employees, error: empErr } = await admin
      .from("employees")
      .select("id, name, email, phone, status")
      .eq("status", "Active");
    if (empErr) throw empErr;

    const targets = (employees || []).filter(
      (e) => e.name !== EXCLUDE_NAME && e.email && String(e.email).includes("@")
    );

    const results: any[] = [];

    for (const emp of targets) {
      try {
        const { data: uidData } = await admin.rpc("get_unified_user_id", { input_email: emp.email });
        const userId = (uidData as string) || emp.id;

        const referenceKey = `LATE-MONDAY-${today}-${emp.id}`;

        // Dedupe
        const { data: existing } = await admin
          .from("ledger_entries")
          .select("id")
          .eq("reference", referenceKey)
          .maybeSingle();
        if (existing) {
          results.push({ name: emp.name, status: "already_deducted" });
          continue;
        }

        // Get current balance
        const { data: balData } = await admin.rpc("get_user_balance_safe", { p_user_id: userId });
        const balance = Number(balData) || 0;

        let overdraftUsed = 0;
        let overdraftFee = 0;

        if (balance < DEDUCTION) {
          const deficit = DEDUCTION - balance;
          // Ensure an active overdraft account exists; auto-create with 50k limit if missing
          const { data: odAcct } = await admin
            .from("overdraft_accounts")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle();
          if (!odAcct) {
            await admin.from("overdraft_accounts").insert({
              user_id: userId,
              employee_email: emp.email,
              employee_name: emp.name,
              approved_limit: 50000,
              status: "active",
              approved_by: "SYSTEM_AUTO_LATE_DEDUCTION",
              activation_fee_paid: true,
            });
          }
          // Draw deficit from overdraft (adds deficit + 2.75% fee to outstanding, credits wallet with deficit)
          const { data: drawRes, error: drawErr } = await admin.functions.invoke("overdraft-draw", {
            body: {
              user_email: emp.email,
              amount: deficit,
              reason: `Auto overdraft for Monday late deduction ${today}`,
            },
          });
          if (drawErr || !drawRes?.ok) {
            results.push({ name: emp.name, status: "overdraft_failed", error: drawRes?.error || drawErr?.message });
            continue;
          }
          overdraftUsed = deficit;
          overdraftFee = drawRes.fee || 0;
        }

        // Deduct 5000 via ledger
        const { error: ledgerErr } = await admin.from("ledger_entries").insert({
          user_id: userId,
          entry_type: "ADJUSTMENT",
          amount: -DEDUCTION,
          reference: referenceKey,
          source_category: "ADJUSTMENT",
          metadata: {
            type: "late_arrival_deduction",
            bypass_treasury_check: true,
            employee_name: emp.name,
            employee_email: emp.email,
            date: today,
            reason: "Late arrival Monday",
            description: `Late arrival deduction UGX ${DEDUCTION.toLocaleString()} for ${today}`,
          },
        });
        if (ledgerErr) {
          results.push({ name: emp.name, status: "ledger_failed", error: ledgerErr.message });
          continue;
        }

        // Email confirmation
        try {
          const overdraftLine = overdraftUsed > 0
            ? `<p><strong>Insufficient balance:</strong> UGX ${overdraftUsed.toLocaleString()} was drawn from your overdraft (2.75% access fee of UGX ${overdraftFee.toLocaleString()} added to outstanding).</p>`
            : "";
          await admin.functions.invoke("send-transactional-email", {
            body: {
              to: emp.email,
              cc: "operations@greatpearlcoffee.com",
              subject: "Late Arrival Deduction — UGX 5,000",
              html: `<p>Dear ${emp.name},</p>
                <p>A deduction of <strong>UGX ${DEDUCTION.toLocaleString()}</strong> has been applied to your wallet today (${today}) for late arrival on Monday.</p>
                ${overdraftLine}
                <p>Please ensure punctual arrival going forward. If you believe this is in error, contact HR/Admin.</p>
                <p>— Great Agro Coffee</p>`,
            },
          });
        } catch (_) {}

        results.push({
          name: emp.name,
          status: "deducted",
          overdraft_drawn: overdraftUsed,
          overdraft_fee: overdraftFee,
        });
      } catch (e: any) {
        results.push({ name: emp.name, status: "error", error: e.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});