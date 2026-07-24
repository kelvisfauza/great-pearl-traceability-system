import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const fmt = (n: number) => Math.round(Number(n) || 0).toLocaleString();

/**
 * Sends a penalty-warning email to overdraft holders on day 6 of their
 * outstanding balance. Day 5+ triggers 10%/day penalty interest, so day 6
 * is the first full day inside the penalty zone — perfect time to warn.
 *
 * Modes:
 *  - body { test: true, email?: string }  => sends ONE preview email with
 *    sample numbers to `email` (defaults to operations@greatpearlcoffee.com)
 *  - body { } (cron call)                 => scans all active OD accounts
 *    with first_negative_at::date = today - 6 days and emails each holder,
 *    CC'ing operations. Idempotency key prevents duplicates.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch (_) { /* GET / cron */ }

    // ── TEST / PREVIEW MODE ────────────────────────────────────────────
    if (body?.test === true) {
      const recipient = String(body.email || "fauzakusa@greatpearlcoffee.com").trim();
      const outstanding = Number(body.outstanding ?? 250_000);
      const rate = 0.10; // 10%/day
      const todayPenalty = Math.round(outstanding * rate);
      // compound 3 days
      let bal = outstanding;
      for (let i = 0; i < 3; i++) bal = bal + Math.round(bal * rate);
      const in3Days = bal - outstanding;

      const { error } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "overdraft-penalty-warning",
          recipientEmail: recipient,
          idempotencyKey: `od-penalty-warning-TEST-${Date.now()}`,
          templateData: {
            employeeName: String(body.name || "Admin"),
            outstanding: fmt(outstanding),
            daysOutstanding: "6",
            projectedPenaltyToday: fmt(todayPenalty),
            projectedIn3Days: fmt(in3Days),
            isTest: true,
          },
        },
      });
      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true, mode: "test", sent_to: recipient }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── PRODUCTION SWEEP — day 6 holders ───────────────────────────────
    const { data: accounts, error: accErr } = await admin
      .from("overdraft_accounts")
      .select("id, user_id, employee_email, employee_name, outstanding_balance, first_negative_at, frozen, status")
      .eq("status", "active")
      .not("first_negative_at", "is", null);
    if (accErr) throw accErr;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const sent: string[] = [];
    const skipped: string[] = [];

    for (const a of accounts || []) {
      if (a.frozen) { skipped.push(`${a.employee_email}:frozen`); continue; }
      if (!a.employee_email) { skipped.push(`${a.id}:no_email`); continue; }

      const negAt = new Date(a.first_negative_at as string);
      negAt.setUTCHours(0, 0, 0, 0);
      const days = Math.floor((today.getTime() - negAt.getTime()) / 86_400_000);
      if (days !== 6) { skipped.push(`${a.employee_email}:day${days}`); continue; }

      const { data: walletBalanceValue } = await admin.rpc("get_wallet_ledger_balance", { p_user_id: a.user_id });
      const walletBalance = Number(walletBalanceValue) || 0;
      const outstanding = Math.max(Number(a.outstanding_balance) || 0, Math.max(0, -walletBalance));
      if (outstanding <= 0) { skipped.push(`${a.employee_email}:settled`); continue; }
      const todayPenalty = Math.round(outstanding * 0.10);
      let bal = outstanding;
      for (let i = 0; i < 3; i++) bal = bal + Math.round(bal * 0.10);
      const in3Days = bal - outstanding;

      const dayKey = today.toISOString().slice(0, 10);
      const idem = `od-penalty-warning-${a.id}-${dayKey}`;

      const { error } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "overdraft-penalty-warning",
          recipientEmail: a.employee_email,
          ccEmails: ["operations@greatpearlcoffee.com"],
          idempotencyKey: idem,
          templateData: {
            employeeName: a.employee_name || "there",
            outstanding: fmt(outstanding),
            daysOutstanding: "6",
            projectedPenaltyToday: fmt(todayPenalty),
            projectedIn3Days: fmt(in3Days),
            isTest: false,
          },
        },
      });
      if (error) { skipped.push(`${a.employee_email}:err`); continue; }
      sent.push(a.employee_email);
    }

    return new Response(
      JSON.stringify({ ok: true, mode: "sweep", sent_count: sent.length, sent, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});