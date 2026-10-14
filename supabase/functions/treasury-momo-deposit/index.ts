// Admin deposits money into the Treasury Pool from their own mobile money
// number, via Yo Payments or GosentePay. The pool is credited only after the
// provider confirms the payment (action "status").
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { normalizePhone } from "../_shared/yo-payments.ts";
import { gosenteDeposit, gosenteStatus, interpretGosenteTxStatus, isGosenteSuccess } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";
const ACCOUNTS = ["general", "operations", "loans_overdrafts", "invest_earn", "profits", "fees_income", "loyalty_fund"];

const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const tag = (xml: string, t: string) => xml.match(new RegExp(`<${t}>(.*?)</${t}>`))?.[1]?.trim();

function providerCode(phone: string) {
  const local = "0" + phone.slice(3);
  return /^07(0|4|5)/.test(local) ? "AIRTEL" : "MTN";
}

async function yoCall(inner: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><AutoCreate><Request><APIUsername>${Deno.env.get("YO_API_USERNAME")}</APIUsername><APIPassword>${Deno.env.get("YO_API_PASSWORD")}</APIPassword>${inner}</Request></AutoCreate>`;
  const r = await fetch(YO_API_URL, { method: "POST", headers: { "Content-Type": "text/xml", "Content-Transfer-Encoding": "text" }, body: xml });
  return await r.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    const email = u?.user?.email;
    if (!email) return json({ ok: false, error: "Please sign in again" });
    const { data: isAdmin } = await userClient.rpc("is_current_user_admin");
    if (!isAdmin) return json({ ok: false, error: "Only admins can deposit into the pool" });

    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));

    if (body.action === "status") {
      const ref = String(body.reference || "");
      const { data: d } = await svc.from("treasury_momo_deposits").select("*").eq("reference", ref).maybeSingle();
      if (!d) return json({ ok: false, error: "Deposit not found" });
      if (d.status !== "pending") return json({ ok: true, status: d.status, error_message: d.error_message });

      let outcome: "completed" | "failed" | "pending" = "pending";
      let err: string | null = null;
      if (d.provider === "yo") {
        const x = await yoCall(`<Method>actransactioncheckstatus</Method><PrivateTransactionReference>${esc(ref)}</PrivateTransactionReference>`);
        const ts = (tag(x, "TransactionStatus") || "").toUpperCase();
        if (ts === "SUCCEEDED") outcome = "completed";
        else if (ts === "FAILED") { outcome = "failed"; err = tag(x, "StatusMessage") || "Payment failed"; }
      } else {
        const r = await gosenteStatus(ref);
        const s = interpretGosenteTxStatus(r.body);
        if (s === "successful") outcome = "completed";
        else if (s === "failed") { outcome = "failed"; err = String(r.body?.data?.message ?? r.body?.message ?? "Payment failed"); }
      }
      // Give up after 30 minutes without a final answer
      if (outcome === "pending" && Date.now() - new Date(d.created_at).getTime() > 30 * 60_000) {
        outcome = "failed"; err = "No confirmation from the provider within 30 minutes";
      }
      if (outcome !== "pending") {
        const { error } = await svc.rpc("finalize_treasury_momo_deposit", { p_reference: ref, p_status: outcome, p_error: err });
        if (error) return json({ ok: false, error: error.message });
      }
      return json({ ok: true, status: outcome, error_message: err });
    }

    // Start a deposit
    const provider = body.provider === "yo" ? "yo" : body.provider === "gosente" ? "gosente" : null;
    const amount = Math.round(Number(body.amount));
    const phone = normalizePhone(String(body.phone || ""));
    const account = ACCOUNTS.includes(body.account) ? body.account : "operations";
    const note = body.note ? String(body.note).slice(0, 200) : null;
    if (!provider) return json({ ok: false, error: "Choose Yo Payments or GosentePay" });
    if (!amount || amount < 500) return json({ ok: false, error: "Amount must be at least UGX 500" });
    if (phone.length !== 12) return json({ ok: false, error: "Enter a valid phone number" });

    const reference = `POOLDEP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    await svc.from("treasury_momo_deposits").insert({ reference, provider, phone, amount, account_code: account, note, initiated_by: email });

    let started = false; let providerRef: string | null = null; let errMsg = "";
    if (provider === "yo") {
      const x = await yoCall(`<Method>acdepositfunds</Method><NonBlocking>TRUE</NonBlocking><Amount>${amount}</Amount><Account>${phone}</Account><AccountProviderCode>${providerCode(phone)}</AccountProviderCode><Narrative>${esc(`Treasury pool deposit ${reference}`)}</Narrative><ExternalReference>${esc(reference)}</ExternalReference><PrivateTransactionReference>${esc(reference)}</PrivateTransactionReference><ProviderReferenceText>${esc(`Pool deposit UGX ${amount}`)}</ProviderReferenceText>`);
      started = tag(x, "Status") === "OK" || tag(x, "StatusCode") === "-22" || tag(x, "StatusCode") === "1";
      providerRef = tag(x, "TransactionReference") || null;
      errMsg = tag(x, "StatusMessage") || tag(x, "ErrorMessage") || "Yo Payments rejected the request";
    } else {
      const r = await gosenteDeposit({ phone, amount, email, ref: reference, callback: `${url}/functions/v1/gosentepay-callback` });
      started = isGosenteSuccess(r.status, r.body);
      errMsg = String(r.body?.data?.message ?? r.body?.message ?? `GosentePay rejected the request (HTTP ${r.status})`);
    }
    if (!started) {
      await svc.rpc("finalize_treasury_momo_deposit", { p_reference: reference, p_status: "failed", p_error: errMsg });
      return json({ ok: false, error: errMsg });
    }
    if (providerRef) await svc.from("treasury_momo_deposits").update({ provider_reference: providerRef }).eq("reference", reference);
    return json({ ok: true, reference, message: "A payment prompt has been sent to the phone. Enter your PIN to confirm." });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
