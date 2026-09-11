import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const results: Record<string, unknown> = {};

  try {
    // 1. Refresh Yo float (best-effort)
    try {
      const { data } = await supabase.functions.invoke("sync-yo-balance", { body: {} });
      results.yo_sync = data;
    } catch (e) {
      results.yo_sync_error = String(e);
    }

    const { data: accounts, error: accErr } = await supabase.from("treasury_accounts").select("*").eq("is_active", true);
    if (accErr) throw accErr;

    const newAlerts: Array<{ account_code: string | null; alert_type: string; amount_required: number | null; balance_at_alert: number | null; message: string; metadata: Record<string, unknown> }> = [];

    // 2. Empty / low fund accounts (dedupe: one open alert per account+type)
    const { data: openAlerts } = await supabase.from("treasury_alerts").select("account_code, alert_type").is("resolved_at", null);
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
    const expected = (accounts || []).reduce((s: number, a: any) => s + Number(a.balance), 0);
    const { data: pool } = await supabase.from("treasury_pool_balance").select("last_yo_synced_balance").eq("id", 1).maybeSingle();
    const { data: gos } = await supabase.from("gosentepay_balance").select("balance").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const { data: thrRow } = await supabase.from("system_settings").select("setting_value").eq("setting_key", "treasury_drift_threshold").maybeSingle();
    const driftThreshold = Number((thrRow?.setting_value as any)?.amount ?? 50000);
    const actual = Number(pool?.last_yo_synced_balance || 0) + Number(gos?.balance || 0);
    const drift = actual - expected;
    results.drift = { expected, actual, drift, threshold: driftThreshold };

    if (Math.abs(drift) >= driftThreshold) {
      if (!openKeys.has("null:drift") && !openKeys.has(":drift")) {
        newAlerts.push({ account_code: null, alert_type: "drift", amount_required: expected, balance_at_alert: actual,
          message: `Real money (Yo ${fmt(Number(pool?.last_yo_synced_balance || 0))} + GosentePay ${fmt(Number(gos?.balance || 0))} = ${fmt(actual)}) differs from the system total (${fmt(expected)}) by ${drift >= 0 ? "+" : "−"}${fmt(Math.abs(drift))}.`,
          metadata: { expected, actual, drift } });
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
        .eq("status", "Active").or("role.eq.Super Admin,email.ilike.fauzakusa@greatpearlcoffee.com");
      const recipients = (admins || []).filter((a: any) => a.email && !a.disabled);
      const lines = pending.map((p: any) => `• ${p.message}`).join("\n");
      const summary = `${pending.length} treasury alert${pending.length > 1 ? "s" : ""} need your attention:\n\n${lines}\n\nOpen the Treasury page to fund the affected account(s).`;

      for (const r of recipients) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "general-notification",
              recipientEmail: r.email,
              idempotencyKey: `treasury-alert-${pending.map((p: any) => p.id.slice(0, 8)).join("-")}-${r.email}`,
              templateData: {
                subject: `Treasury alert: ${pending.length} account issue${pending.length > 1 ? "s" : ""}`,
                title: "Treasury needs funding",
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
                message: `TREASURY ALERT: ${pending[0].message}${pending.length > 1 ? ` (+${pending.length - 1} more)` : ""} Open ${APP_URL} to fund. - Great Agro Coffee`,
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
