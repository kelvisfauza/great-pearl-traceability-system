import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { treasuryReserve, treasuryRelease } from "../_shared/treasury.ts";
import { yoPayout } from "../_shared/yo-payments.ts";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";

type SourceType = "provider" | "withdrawal" | "supplier" | "expense";
// Methods that actually send money now (others only record money handed over)
const SEND_METHODS = ["yo", "gosentepay"];
const respond = (ok: boolean, body: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ ok, ...body }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;
const normalizePhone = (p?: string | null) => {
  if (!p) return null;
  let d = String(p).replace(/\D/g, "");
  if (d.startsWith("0")) d = "256" + d.slice(1);
  if (d.length === 9) d = "256" + d;
  return d;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: u } = await anon.auth.getUser(token);
    const email = u?.user?.email;
    if (!email) return respond(false, { error: "Please sign in again" });
    const db = createClient(url, svc);
    const { data: me } = await db.from("employees").select("name, role, permissions, department").ilike("email", email).maybeSingle();
    const perms = JSON.stringify((me as any)?.permissions || "");
    const isFinance = (me?.role || "").toLowerCase() === "finance" || perms.includes("Finance:approve") || perms.includes("Finance:process");

    const body = await req.json();
    const action = body?.action;
    const sourceType = body?.sourceType as SourceType;
    const sourceId = String(body?.sourceId || "");

    if (action === "get") {
      const ids: string[] = Array.isArray(body?.sourceIds) ? body.sourceIds.map(String) : [];
      if (!ids.length) return respond(true, { payments: [] });
      const { data } = await db.from("partial_payments").select("*, partial_payment_installments(*)").eq("source_type", sourceType).in("source_id", ids);
      return respond(true, { payments: data || [] });
    }

    if (action !== "pay") return respond(false, { error: "Unknown action" });
    if (!isFinance) return respond(false, { error: "Only Finance can record payments" });
    if (!["provider", "withdrawal", "supplier", "expense"].includes(sourceType) || !sourceId) return respond(false, { error: "Missing payment details" });
    const amount = Math.round(Number(body?.amount));
    const method = String(body?.method || "cash").slice(0, 40);
    const reference = body?.reference ? String(body.reference).slice(0, 120) : null;
    const notes = body?.notes ? String(body.notes).slice(0, 500) : null;
    if (!Number.isFinite(amount) || amount <= 0) return respond(false, { error: "Enter an amount above zero" });

    // Load the source item from the database (never trust client totals)
    let lotId = "";
    let title = "", total = 0, payeeName = "", payeeEmail: string | null = null, payeePhone: string | null = null, approver = "";
    if (sourceType === "provider") {
      const { data: s } = await db.from("provider_submission_requests").select("*").eq("id", sourceId).maybeSingle();
      if (!s) return respond(false, { error: "Request not found" });
      if (s.status !== "awaiting_finance") return respond(false, { error: "This request is no longer waiting for Finance" });
      total = Number(s.admin_approved_amount ?? s.amount) + Number(s.admin_approved_charge ?? 0);
      title = s.request_type === "meal_plan" ? "Meal Plan Payment" : s.request_type === "support_staff_per_diem" ? "Support Staff Per-Diem" : "Service Provider Payment";
      payeeName = s.provider_name; payeeEmail = s.email; payeePhone = s.phone; approver = s.admin_approved_by_name || s.reviewed_by || "";
    } else if (sourceType === "withdrawal") {
      const { data: w } = await db.from("instant_withdrawals").select("*").eq("id", sourceId).maybeSingle();
      if (!w) return respond(false, { error: "Withdrawal not found" });
      if (w.payout_status !== "pending_finance") return respond(false, { error: "This withdrawal is no longer waiting for Finance" });
      const { data: e } = await db.from("employees").select("name, email, phone").or(`auth_user_id.eq.${w.user_id},id.eq.${w.user_id}`).maybeSingle();
      total = Number(w.amount); title = "Withdrawal";
      payeeName = e?.name || "Staff member"; payeeEmail = e?.email || null; payeePhone = w.phone_number || e?.phone || null; approver = w.admin_approved_by || "";
    } else if (sourceType === "supplier") {
      // sourceId is the coffee record id (falls back to lot id)
      let { data: l } = await db.from("finance_coffee_lots").select("*").eq("coffee_record_id", sourceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!l) ({ data: l } = await db.from("finance_coffee_lots").select("*").eq("id", sourceId).maybeSingle());
      if (!l) return respond(false, { error: "This coffee has no Finance lot yet — use Process Payment" });
      if (!(Number(l.total_amount_ugx) > 0)) return respond(false, { error: "This lot has no price yet — set the price first" });
      lotId = l.id;
      if (l.payment_status === "FULLY_PAID") return respond(false, { error: "This lot is already fully paid" });
      const { data: sup } = l.supplier_id ? await db.from("suppliers").select("name, phone, email").eq("id", l.supplier_id).maybeSingle() : { data: null } as any;
      total = Number(l.total_amount_ugx || 0) - Number(l.advance_recovered_ugx || 0);
      title = `Coffee Supplier Payment${l.batch_number ? ` — ${l.batch_number}` : ""}`;
      payeeName = sup?.name || "Supplier"; payeePhone = sup?.phone || null; payeeEmail = sup?.email || null; approver = l.assessed_by || "";
    } else {
      const { data: r } = await db.from("approval_requests").select("*").eq("id", sourceId).maybeSingle();
      if (!r) return respond(false, { error: "Request not found" });
      if (String(r.status).toLowerCase() === "approved" && r.finance_approved) return respond(false, { error: "This request is already paid" });
      const { data: e } = await db.from("employees").select("name, email, phone").ilike("email", r.requestedby || "").maybeSingle();
      total = Number(r.amount); title = r.title || r.type || "Expense Request";
      payeeName = r.requestedby_name || e?.name || r.requestedby; payeeEmail = e?.email || r.requestedby; payeePhone = e?.phone || null;
      approver = r.admin_approved_by || r.admin_approved_1_by || "";
    }
    if (!(total > 0)) return respond(false, { error: "This payment has no amount to pay" });

    // Find or create the tracker
    let { data: pp } = await db.from("partial_payments").select("*").eq("source_type", sourceType).eq("source_id", sourceId).maybeSingle();
    if (!pp) {
      const { data: created, error } = await db.from("partial_payments").insert({
        source_type: sourceType, source_id: sourceId, title, payee_name: payeeName, payee_email: payeeEmail, payee_phone: payeePhone,
        total_amount: total, approved_by_name: approver,
      }).select("*").single();
      if (error) return respond(false, { error: error.message });
      pp = created;
    }
    if (pp.status === "fully_paid") return respond(false, { error: "This payment is already fully paid" });
    const balanceBefore = Number(pp.total_amount) - Number(pp.paid_amount);
    if (amount > balanceBefore) return respond(false, { error: `Amount is more than the balance left (${ugx(balanceBefore)})` });
    const newPaid = Number(pp.paid_amount) + amount;
    const balanceAfter = Number(pp.total_amount) - newPaid;
    const full = balanceAfter <= 0;

    // Optimistic update guards against double-click double payment
    const { data: upd } = await db.from("partial_payments").update({ paid_amount: newPaid, status: full ? "fully_paid" : "part_paid" })
      .eq("id", pp.id).eq("paid_amount", pp.paid_amount).select("id");
    if (!upd?.length) return respond(false, { error: "Another payment was just recorded — refresh and try again" });

    // Send the money now when Finance picked a live channel
    let sendRef: string | null = null;
    let sendNote = "";
    if (SEND_METHODS.includes(method)) {
      const rollback = () => db.from("partial_payments").update({ paid_amount: pp.paid_amount, status: "part_paid" }).eq("id", pp.id);
      if (!["provider", "withdrawal"].includes(sourceType)) { await rollback(); return respond(false, { error: "Sending through Yo or GosentePay is only for meal plans, providers and staff withdrawals. Pay this by cash or bank and record it." }); }
      if (!payeePhone) { await rollback(); return respond(false, { error: "No phone number on this request to send money to" }); }
      const phone = normalizePhone(payeePhone)!;
      const n = ((await db.from("partial_payment_installments").select("id", { count: "exact", head: true }).eq("partial_payment_id", pp.id)).count || 0) + 1;
      const treasuryRef = `PART-${sourceId.slice(0, 8)}-${n}-${Date.now()}`;
      if (sourceType === "provider") {
        const r = await treasuryReserve({ account: "operations", amount, reference: treasuryRef, description: `Part payment ${title} - ${payeeName}`, email: payeeEmail, name: payeeName, performedBy: me?.name || email, metadata: { provider_submission_id: sourceId, part: n } });
        if (!r.ok) { await rollback(); return respond(false, { code: "TREASURY_INSUFFICIENT", error: `Not funded: ${r.error || "Operations account cannot cover this part"}` }); }
      }
      let sent = false, detail = "";
      if (method === "gosentepay") {
        sendRef = `GSP-${sourceId.slice(0, 6)}-${n}-${Date.now()}`.slice(0, 30);
        try {
          const g = await gosenteWithdraw({ phone, amount, email: payeeEmail && /@/.test(payeeEmail) ? payeeEmail : "finance@greatpearlcoffee.com", reason: `Part payment ${payeeName}`, ref: sendRef });
          sent = isGosenteSuccess(g.status, g.body);
          if (!sent) detail = `GosentePay: ${String(g.body?.message || g.body?.data?.message || g.body?.error || g.status).slice(0, 200)}`;
        } catch (e) { detail = `GosentePay error: ${(e as Error).message}`; }
        sendNote = "sent via GosentePay";
      } else {
        sendRef = `PART-${sourceId.slice(0, 8)}-${n}-${Date.now()}`;
        const y = await yoPayout({ phone, amount, narrative: `Part payment ${title} - ${payeeName}`, privateRef: sendRef });
        const pending22 = String(y.statusMessage || "").includes("-22") || String(y.rawResponse || "").includes("<StatusCode>-22</StatusCode>");
        sent = y.success || pending22;
        if (!sent) detail = y.errorMessage || "Yo Payments rejected the payment";
        sendRef = y.transactionRef || sendRef;
        sendNote = pending22 ? "sent via Yo Payments (awaiting Yo authorization)" : "sent via Yo Payments";
      }
      if (!sent) {
        if (sourceType === "provider") await treasuryRelease({ account: "operations", amount, reference: treasuryRef, description: "Part payment failed — funds returned", performedBy: me?.name || email });
        await rollback();
        return respond(false, { error: detail || "Payment did not go through" });
      }
    }

    await db.from("partial_payment_installments").insert({
      partial_payment_id: pp.id, amount, method, reference: reference || sendRef, notes: sendNote || notes, balance_after: balanceAfter, paid_by_name: me?.name || email, paid_by_email: email,
    });

    // Update the source item
    const now = new Date().toISOString();
    const financeName = me?.name || email;
    let sourceWarning: string | null = null;
    try {
      if (sourceType === "provider" && full) {
        const { error } = await db.from("provider_submission_requests").update({ status: "paid" }).eq("id", sourceId);
        if (error) sourceWarning = error.message;
      } else if (sourceType === "withdrawal" && full) {
        const { error } = await db.from("instant_withdrawals").update({ payout_status: "success", finance_released_by: financeName, finance_released_at: now, completed_at: now }).eq("id", sourceId);
        if (error) sourceWarning = error.message;
      } else if (sourceType === "supplier") {
        const { data: l } = await db.from("finance_coffee_lots").select("amount_paid_ugx").eq("id", lotId).maybeSingle();
        const patch: any = { amount_paid_ugx: Number(l?.amount_paid_ugx || 0) + amount, payment_status: full ? "FULLY_PAID" : "PARTIALLY_PAID" };
        if (full) patch.finance_status = "PAID";
        const { error } = await db.from("finance_coffee_lots").update(patch).eq("id", lotId);
        if (full) await db.from("coffee_records").update({ status: "inventory" }).eq("id", sourceId);
        if (error) sourceWarning = error.message;
      } else if (sourceType === "expense" && full) {
        const { error } = await db.from("approval_requests").update({ status: "Approved", finance_approved: true, finance_approved_by: financeName, finance_approved_at: now }).eq("id", sourceId);
        if (error) sourceWarning = error.message;
      }
    } catch (e) { sourceWarning = (e as Error).message; }

    await db.from("audit_logs").insert({
      action: full ? "FINANCE_FINAL_PAYMENT" : "FINANCE_PART_PAYMENT", table_name: "partial_payments", record_id: pp.id,
      performed_by: email, department: "Finance",
      reason: `${title} for ${payeeName}: paid ${ugx(amount)} by ${method}, balance ${ugx(balanceAfter)}`,
      record_data: { source_type: sourceType, source_id: sourceId, amount, balance_after: balanceAfter, reference },
    } as any).then(() => {}, () => {});

    // Confirmation messages
    const stage = full ? (Number(pp.paid_amount) > 0 ? "BALANCE PAID — fully paid" : "FULLY PAID") : "PART PAYMENT";
    const msg = full
      ? `${title}: ${ugx(amount)} paid by Finance (${method}). Total ${ugx(Number(pp.total_amount))} is now fully paid.`
      : `${title}: ${ugx(amount)} paid by Finance (${method}). Paid so far ${ugx(newPaid)} of ${ugx(Number(pp.total_amount))}. Balance left ${ugx(balanceAfter)} will be paid once accounts are funded.`;
    const recipients = new Map<string, string>();
    if (payeeEmail) recipients.set(payeeEmail.toLowerCase(), payeeName);
    if (approver) {
      const { data: a } = await db.from("employees").select("email, name").or(`name.ilike.${approver.replace(/[,()]/g, "")},email.ilike.${approver.replace(/[,()]/g, "")}`).limit(1).maybeSingle();
      if (a?.email) recipients.set(a.email.toLowerCase(), a.name);
    }
    const { data: proc } = await db.from("employees").select("email, name").ilike("department", "%procurement%").eq("status", "Active");
    for (const p of proc || []) if (p.email) recipients.set(p.email.toLowerCase(), p.name);
    const installNo = ((await db.from("partial_payment_installments").select("id", { count: "exact", head: true }).eq("partial_payment_id", pp.id)).count) || 1;
    for (const [to, name] of recipients) {
      try {
        await db.functions.invoke("send-transactional-email", {
          body: {
            templateName: "general-notification", recipientEmail: to,
            idempotencyKey: `partpay-${pp.id}-${installNo}-${to}`,
            templateData: { subject: `${title} — ${stage}`, title: `${title} — ${stage}`, recipientName: name,
              message: `Payee: ${payeeName}\n${msg}${reference ? `\nReference: ${reference}` : ""}\nRecorded by: ${financeName}` },
          },
        });
      } catch (e) { console.warn("email failed", to, (e as Error).message); }
    }
    // Payee without email still gets a text
    if (!payeeEmail && payeePhone) {
      try {
        await db.functions.invoke("send-sms", { body: { phone: normalizePhone(payeePhone), message: `Dear ${payeeName}, Great Agro Coffee: ${msg}`, userName: payeeName, messageType: "payout_confirmation", department: "Finance" } });
      } catch (e) { console.warn("sms failed", (e as Error).message); }
    }

    return respond(true, { fullyPaid: full, paid: newPaid, balance: balanceAfter, total: Number(pp.total_amount), sourceWarning });
  } catch (e) {
    return respond(false, { error: (e as Error).message });
  }
});
