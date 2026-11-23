import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternalOrAdmin } from "../_shared/internal-auth.ts";
import { gosenteStatus, interpretGosenteTxStatus, payoutAccountingRpc } from "../_shared/gosentepay.ts";
import { treasuryAlertPresentation } from "../_shared/payout-accounting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://greatpearlcoffeesystem.site/admin/treasury";
const fmt = (n: number) => `UGX ${Math.round(Number(n || 0)).toLocaleString()}`;

/**
 * Hourly treasury watchdog:
 *  1. Syncs the Yo Payments float.
 *  2. Flags fund accounts that are empty or below their alert level.
 *  3. Compares Yo + GosentePay against the sum of all treasury accounts (drift).
 *  4. Emails + texts the Super Admin(s) about any new/unnotified alert.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  { const __deny = await requireInternalOrAdmin(req, corsHeaders); if (__deny) return __deny; }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results: Record<string, unknown> = {};

  try {
    // Accounting-only recovery: never call a payout endpoint from this watchdog.
    const { data: recovery, error: recoveryError } = await supabase.rpc("recover_gosentepay_payout_accounting");
    if (recoveryError) throw recoveryError;
    results.accounting_recovery = recovery;

    const { data: uncertain, error: uncertainError } = await supabase.from("gosentepay_payout_receipts")
      .select("reference").eq("status", "prepared").lt("created_at", new Date(Date.now() - 600000).toISOString()).limit(50);
    if (uncertainError) throw uncertainError;
    for (const receipt of uncertain || []) {
      try {
        const lookup = await gosenteStatus(receipt.reference);
        if (lookup.status < 200 || lookup.status >= 300) continue;
        const outcome = interpretGosenteTxStatus(lookup.body);
        if (outcome === "pending") continue;
        await payoutAccountingRpc("mark_gosentepay_payout_outcome", { p_reference: receipt.reference, p_accepted: outcome === "successful" });
        if (outcome === "successful") await payoutAccountingRpc("settle_gosentepay_payout", { p_reference: receipt.reference });
      } catch { console.error("Payout status/accounting requires review", receipt.reference); }
    }

    // Legacy Finance payouts need real provider confirmation, not a saved "sent" label.
    const { data: legacy, error: legacyError } = await supabase.from("approval_requests")
      .select("id, amount, payout_ref").eq("payout_provider", "gosente").eq("payout_status", "sent")
      .gte("payout_completed_at", new Date(Date.now() - 30 * 86400000).toISOString()).order("payout_completed_at").limit(100);
    if (legacyError) throw legacyError;
    results.legacy_recovered = [];
    for (const payment of legacy || []) {
      const reference = String(payment.payout_ref || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 30);
      if (!reference) continue;
      const { data: log, error: logError } = await supabase.from("gosentepay_balance_log").select("id")
        .eq("reference", reference).eq("change_type", "payout_deduction").maybeSingle();
      if (logError) throw logError;
      if (log) continue;
      try {
        const lookup = await gosenteStatus(reference);
        if (lookup.status < 200 || lookup.status >= 300 || interpretGosenteTxStatus(lookup.body) !== "successful") continue;
        await payoutAccountingRpc("prepare_gosentepay_payout", { p_reference: reference, p_amount: Number(payment.amount) });
        await payoutAccountingRpc("mark_gosentepay_payout_outcome", { p_reference: reference, p_accepted: true });
        await payoutAccountingRpc("settle_gosentepay_payout", { p_reference: reference });
        (results.legacy_recovered as string[]).push(payment.id);
      } catch { console.error("Legacy payout needs provider/accounting review", payment.id); }
    }

    // A failed sync must not manufacture a new real-money mismatch from stale data.
    const { data: sync, error: syncError } = await supabase.functions.invoke("sync-yo-balance", { body: {} });
    if (syncError || sync?.ok !== true) throw new Error("Yo balance refresh failed; reconciliation was not updated");
    results.yo_sync = { ok: true };

    const { data: accounts, error: accErr } = await supabase.from("treasury_accounts").select("*").eq("is_active", true);
    if (accErr) throw accErr;

    const newAlerts: Array<{ account_code: string | null; alert_type: string; amount_required: number | null; balance_at_alert: number | null; message: string; metadata: Record<string, unknown> }> = [];

    // 2. Empty / low fund accounts (dedupe: one open alert per account+type)
    const { data: openAlerts, error: alertReadError } = await supabase.from("treasury_alerts").select("account_code, alert_type").is("resolved_at", null);
    if (alertReadError) throw alertReadError;
    const openKeys = new Set((openAlerts || []).map((a: any) => `${a.account_code}:${a.alert_type}`));

    for (const a of accounts || []) {
      if (!["fund", "income"].includes(a.kind)) continue;
      const bal = Number(a.balance);
      const thr = Number(a.low_balance_threshold);
      if (bal <= 0 && !openKeys.has(`${a.code}:insufficient`)) {
        newAlerts.push({ account_code: a.code, alert_type: "insufficient", amount_required: null, balance_at_alert: bal,
          message: `${a.name} is EMPTY (${fmt(bal)}). All payments drawn from it are blocked until it is funded.`, metadata: { auto: true } });
      } else if (bal > 0 && thr > 0 && bal < thr && !openKeys.has(`${a.code}:low_balance`)) {
        newAlerts.push({ account_code: a.code, alert_type: "low_balance", amount_required: thr, balance_at_alert: bal,
          message: `${a.name} is running low: ${fmt(bal)} (alert level ${fmt(thr)}).`, metadata: { auto: true } });
      }
    }
    // Auto-resolve alerts for accounts that are healthy again
    for (const a of accounts || []) {
      const bal = Number(a.balance);
      const thr = Number(a.low_balance_threshold);
      if (bal > 0 && openKeys.has(`${a.code}:insufficient`)) {
        await supabase.from("treasury_alerts").update({ resolved_at: new Date().toISOString() }).eq("account_code", a.code).eq("alert_type", "insufficient").is("resolved_at", null);
      }
      if (bal >= thr && openKeys.has(`${a.code}:low_balance`)) {
        await supabase.from("treasury_alerts").update({ resolved_at: new Date().toISOString() }).eq("account_code", a.code).eq("alert_type", "low_balance").is("resolved_at", null);
      }
    }

    // 3. Drift check
    const { data: snapshot, error: snapshotError } = await supabase.rpc("treasury_reconciliation_snapshot");
    if (snapshotError || !snapshot || [snapshot.expected, snapshot.bank, snapshot.yo, snapshot.gosente].some(value => value === null || !Number.isFinite(Number(value)))) {
      throw new Error("Treasury balances could not be read; no reconciliation figure was produced");
    }
    const expected = Number(snapshot.expected);
    const bank = Number(snapshot.bank);
    const { data: thrRow, error: thresholdError } = await supabase.from("system_settings").select("setting_value").eq("setting_key", "treasury_drift_threshold").maybeSingle();
    if (thresholdError) throw thresholdError;
    const driftThreshold = Number((thrRow?.setting_value as any)?.amount ?? 50000);
    const actual = Number(snapshot.yo) + Number(snapshot.gosente) + bank;
    const drift = actual - expected;
    results.drift = { expected, actual, drift, threshold: driftThreshold };

    if (Math.abs(drift) >= driftThreshold) {
      const message = `Recorded provider balances (Yo ${fmt(Number(snapshot.yo))} + GosentePay ${fmt(Number(snapshot.gosente))}) plus saved Cash at Bank ${fmt(bank)} total ${fmt(actual)}; system accounts total ${fmt(expected)}; difference ${drift >= 0 ? "+" : "−"}${fmt(Math.abs(drift))}. Review payout records and cash paid out of money still counted at the bank. Funding is not automatically required.`;
      const metadata = { expected, actual, drift, checked_at: new Date().toISOString(), pending_accounting: snapshot.pending_accounting, uncertain_payouts: snapshot.uncertain_payouts };
      if (!openKeys.has("null:drift") && !openKeys.has(":drift")) {
        newAlerts.push({ account_code: null, alert_type: "drift", amount_required: expected, balance_at_alert: actual,
          message, metadata });
      } else {
        const { error } = await supabase.from("treasury_alerts").update({ message, metadata, amount_required: expected, balance_at_alert: actual })
          .eq("alert_type", "drift").is("resolved_at", null);
        if (error) throw error;
      }
    } else {
      await supabase.from("treasury_alerts").update({ resolved_at: new Date().toISOString() }).eq("alert_type", "drift").is("resolved_at", null);
    }

    if (newAlerts.length) {
      await supabase.from("treasury_alerts").insert(newAlerts);
    }

    // 4. Notify Super Admin(s) about alerts not yet notified
    const { data: pending } = await supabase.from("treasury_alerts").select("*").is("notified_at", null).is("resolved_at", null).order("created_at", { ascending: true }).limit(20);
    results.pending_notifications = pending?.length || 0;

    if (pending && pending.length) {
      const { data: admins } = await supabase.from("employees").select("name, email, phone, role")
        .eq("status", "Active").or("role.eq.Super Admin,email.ilike.fauzakusa@greatpearlcoffee.com").eq("disabled", false);
      const recipients = (admins || []).filter((a: any) => a.email && !a.disabled);
      const lines = pending.map((p: any) => `• ${p.message}`).join("\n");
      const presentation = treasuryAlertPresentation(pending.map((p: any) => p.alert_type));
      const summary = `${pending.length} treasury alert${pending.length > 1 ? "s" : ""} need your attention:\n\n${lines}\n\n${presentation.instruction}`;

      for (const r of recipients) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "general-notification",
              recipientEmail: r.email,
              idempotencyKey: `treasury-alert-${pending.map((p: any) => p.id.slice(0, 8)).join("-")}-${r.email}`,
              templateData: {
                subject: `Treasury alert: ${pending.length} account issue${pending.length > 1 ? "s" : ""}`,
                title: presentation.title,
                recipientName: r.name,
                message: summary,
                ctaUrl: APP_URL,
                ctaLabel: "Open Treasury",
              },
            },
          });
        } catch (e) { console.error("email failed", r.email, e); }
        if (r.phone) {
          try {
            await supabase.functions.invoke("send-sms", {
              body: {
                phone: r.phone,
                userName: r.name,
                recipientEmail: r.email,
                messageType: "treasury_alert",
                message: `TREASURY ALERT: ${pending[0].message}${pending.length > 1 ? ` (+${pending.length - 1} more)` : ""} Review ${APP_URL}. - Great Agro Coffee`,
              },
            });
          } catch (e) { console.error("sms failed", r.phone, e); }
        }
      }
      await supabase.from("treasury_alerts").update({ notified_at: new Date().toISOString() }).in("id", pending.map((p: any) => p.id));
      results.notified = recipients.map((r: any) => r.email);
    }

    return new Response(JSON.stringify({ ok: true, ...results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("treasury-monitor error:", err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err), ...results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
