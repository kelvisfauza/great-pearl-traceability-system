import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";
import { treasuryReserve, treasuryRelease } from "../_shared/treasury.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown) =>
  new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_AMOUNT = 40000;
const TARGET = "finance_wallet_withdraw";

async function hash(code: string, salt: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${code}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ ok: false, error: "Please sign in" });
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: ud } = await admin.auth.getUser(token);
    const user = ud?.user;
    if (!user) return json({ ok: false, error: "Invalid session" });

    const { data: canFin } = await userClient.rpc("can_process_finance");
    if (!canFin) return json({ ok: false, error: "Only Finance can initiate wallet withdrawals" });

    const { data: me } = await admin.from("employees").select("name").ilike("email", user.email || "").maybeSingle();
    const myName = me?.name || user.email;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const email = String(body.employeeEmail || "").trim().toLowerCase();
    if (!email) return json({ ok: false, error: "Choose an employee" });
    if (email === (user.email || "").toLowerCase()) return json({ ok: false, error: "You cannot withdraw from your own wallet" });

    const { data: emp } = await admin.from("employees").select("id, name, phone, email").ilike("email", email).maybeSingle();
    if (!emp) return json({ ok: false, error: "Employee not found" });

    if (action === "send") {
      const amount = Math.round(Number(body.amount));
      const reason = String(body.reason || "").trim().slice(0, 200);
      if (!amount || amount <= 0) return json({ ok: false, error: "Enter an amount" });
      if (amount > MAX_AMOUNT) return json({ ok: false, error: `Maximum is UGX ${MAX_AMOUNT.toLocaleString()}` });
      if (!reason) return json({ ok: false, error: "Enter a reason" });
      if (!emp.phone) return json({ ok: false, error: "Employee has no phone number on file" });
      const { data: bal } = await admin.rpc("get_user_balance_safe", { user_email: emp.email });
      const available = Number((bal as any)?.[0]?.available_balance ?? (bal as any)?.available_balance ?? (bal as any)?.[0]?.wallet_balance ?? 0);
      if (available < amount) return json({ ok: false, error: `Insufficient wallet balance (UGX ${available.toLocaleString()})` });

      const code = String(Math.floor(1000 + Math.random() * 9000));
      const targetId = `${emp.email.toLowerCase()}:${amount}`;
      const { data: row, error } = await admin.from("admin_approval_codes").insert({
        target_type: TARGET,
        target_id: targetId,
        requested_by: user.id,
        requested_by_email: user.email,
        code_hash: await hash(code, `${TARGET}:${targetId}`),
        phone: emp.phone,
        amount,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }).select("id").single();
      if (error) return json({ ok: false, error: error.message });

      await fetch(`${url}/functions/v1/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anon, Authorization: authHeader },
        body: JSON.stringify({
          phone: emp.phone,
          message: `Great Agro Coffee: Finance (${myName}) wants to withdraw UGX ${amount.toLocaleString()} from your wallet for: ${reason}. Code: ${code}. Give this code only if you agree. Valid 10 min.`,
          userName: emp.name,
          recipientEmail: emp.email,
          messageType: "admin_approval_code",
        }),
      }).catch((e) => console.warn("sms failed", e));

      const masked = String(emp.phone).replace(/^(\+?\d{3})\d+(\d{3})$/, "$1*****$2");
      return json({ ok: true, codeId: row.id, phone: masked, reason });
    }

    if (action === "verify") {
      const amount = Math.round(Number(body.amount));
      const reason = String(body.reason || "").trim().slice(0, 200);
      const code = String(body.code || "").trim();
      const method = String(body.method || "cash");
      if (!["cash", "gosentepay", "yo"].includes(method)) return json({ ok: false, error: "Choose cash, GosentePay or Yo" });
      const payPhone = String(body.payPhone || emp.phone || "").trim();
      if (method !== "cash" && !/^(\+?256|0)?7\d{8}$/.test(payPhone.replace(/\s/g, ""))) return json({ ok: false, error: "Enter a valid mobile money number" });
      if (!/^\d{4}$/.test(code)) return json({ ok: false, error: "Enter the 4-digit code" });
      const targetId = `${emp.email.toLowerCase()}:${amount}`;
      const { data: rows } = await admin.from("admin_approval_codes").select("*")
        .eq("target_type", TARGET).eq("target_id", targetId).eq("requested_by", user.id)
        .is("used_at", null).order("created_at", { ascending: false }).limit(1);
      const row = rows?.[0];
      if (!row) return json({ ok: false, error: "No pending code. Send a new one." });
      if (new Date(row.expires_at).getTime() < Date.now()) return json({ ok: false, error: "Code expired. Send a new one." });
      if ((row.attempts || 0) >= 5) return json({ ok: false, error: "Too many attempts. Send a new code." });
      if ((await hash(code, `${TARGET}:${targetId}`)) !== row.code_hash) {
        await admin.from("admin_approval_codes").update({ attempts: (row.attempts || 0) + 1 }).eq("id", row.id);
        return json({ ok: false, error: "Incorrect code" });
      }
      // Lock the code first so it can't be used twice
      const { data: locked } = await admin.from("admin_approval_codes")
        .update({ used_at: new Date().toISOString() }).eq("id", row.id).is("used_at", null).select("id");
      if (!locked?.length) return json({ ok: false, error: "Code already used" });

      const { data: bal } = await admin.rpc("get_user_balance_safe", { user_email: emp.email });
      const available = Number((bal as any)?.[0]?.available_balance ?? (bal as any)?.available_balance ?? (bal as any)?.[0]?.wallet_balance ?? 0);
      if (available < amount) return json({ ok: false, error: `Insufficient wallet balance (UGX ${available.toLocaleString()})` });

      const reference = `FIN-WD-${row.id.substring(0, 8).toUpperCase()}`;
      const methodLabel = method === "cash" ? "cash" : method === "gosentepay" ? "GosentePay" : "Yo Payments";
      let providerRef: string | null = null;
      if (method !== "cash") {
        const r = await treasuryReserve({ account: "user_wallets", amount, reference, description: `Finance wallet withdrawal to ${emp.name}`, email: emp.email, name: emp.name, performedBy: myName, metadata: { code_id: row.id } });
        if (!r.ok) {
          await admin.from("admin_approval_codes").update({ used_at: null }).eq("id", row.id);
          return json({ ok: false, error: `Not sent: ${r.error || "pool account empty"}` });
        }
        let sent = false; let err = "";
        try {
          if (method === "gosentepay") {
            const g = await gosenteWithdraw({ phone: payPhone, amount, email: emp.email, reason: `Wallet withdrawal ${reference}`, ref: reference });
            sent = isGosenteSuccess(g.status, g.body); providerRef = reference;
            if (!sent) err = String(g.body?.message || g.body?.data?.message || `GosentePay error ${g.status}`);
          } else {
            const y = await yoPayout({ phone: normalizePhone(payPhone), amount, narrative: `Wallet withdrawal ${reference}` });
            sent = y.success; providerRef = (y as any).transactionReference || null;
            if (!sent) err = y.errorMessage || "Yo payout failed";
          }
        } catch (e) { err = (e as Error).message; }
        if (!sent) {
          await treasuryRelease({ account: "user_wallets", amount, reference, performedBy: myName });
          await admin.from("admin_approval_codes").update({ used_at: null }).eq("id", row.id);
          return json({ ok: false, error: `Money not sent: ${err}. Wallet not debited — you can try again.` });
        }
      }
      const { data: unifiedId } = await admin.rpc("get_unified_user_id", { input_email: emp.email });
      const { error: lErr } = await admin.from("ledger_entries").insert({
        user_id: unifiedId || emp.id,
        entry_type: "WITHDRAWAL",
        amount: -Math.abs(amount),
        reference,
        source_category: "WITHDRAWAL",
        metadata: {
          description: `Finance withdrawal (${methodLabel}): ${reason}`,
          payout_method: method, payout_phone: method === "cash" ? null : payPhone, provider_ref: providerRef,
          initiated_by: myName,
          initiated_by_email: user.email,
          type: "finance_cash_withdrawal",
          code_id: row.id,
        },
      });
      if (lErr) return json({ ok: false, error: lErr.message });

      if (method === "cash") try {
        await admin.rpc("record_treasury_entry", {
          p_amount: amount, p_category: "withdrawal", p_channel: "cash",
          p_description: `Finance cash withdrawal from ${emp.name}: ${reason}`,
          p_direction: "credit",
          p_metadata: { type: "finance_cash_withdrawal", code_id: row.id },
          p_performed_by: myName, p_reference: reference,
          p_related_user_email: emp.email, p_related_user_name: emp.name,
        });
      } catch (e) { console.warn("treasury", e); }

      await admin.from("audit_logs").insert({
        action: "finance_wallet_withdrawal", table_name: "ledger_entries", record_id: reference,
        performed_by: user.email, reason, new_values: { employee: emp.email, amount, method, payPhone },
      } as any).then(() => {}, () => {});

      await fetch(`${url}/functions/v1/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anon, Authorization: authHeader },
        body: JSON.stringify({
          phone: emp.phone,
          message: `Great Agro Coffee: UGX ${amount.toLocaleString()} withdrawn from your wallet by Finance (${myName}) for ${reason}, paid by ${methodLabel}${method === "cash" ? "" : ` to ${payPhone}`}. Ref ${reference}.`,
          userName: emp.name, recipientEmail: emp.email, messageType: "withdrawal_confirmation",
        }),
      }).catch(() => {});

      return json({ ok: true, reference });
    }
    return json({ ok: false, error: "Unknown action" });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message });
  }
});
