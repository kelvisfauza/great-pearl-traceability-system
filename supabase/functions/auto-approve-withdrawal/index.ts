import { readAutomationControls } from "../_shared/automation-controls.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { requireStaff } from "../_shared/internal-auth.ts";
import { gosenteWithdrawFee } from "../_shared/gosentepay-fees.ts";
import { evaluateWithdrawalAutoApproval, TRANSFER_CATEGORIES, POINTS_ENTRY_TYPES } from "../_shared/withdrawal-auto-approval.ts";

const reply = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const OWNER_EMAIL = "fauzakusa@greatpearlcoffee.com";
const AUTO = "AUTO System approval";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await requireStaff(req, corsHeaders);
    if (caller instanceof Response) return caller;
    const parsed = z.object({ requestId: z.string().uuid() }).safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return reply({ ok: false, error: "Choose a saved withdrawal request." });
    const url = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(url, svcKey);
    const { requestId } = parsed.data;

    const { data: r } = await db.from("approval_requests").select("*").eq("id", requestId).maybeSingle();
    if (!r) return reply({ ok: false, error: "Request not found" });
    const details = (r.details || {}) as Record<string, any>;
    if (!caller.internal && String(r.requestedby || "").toLowerCase() !== caller.email) return reply({ ok: false, error: "Not your request" });
    if (r.type !== "Withdrawal Request" || details.request_type !== "withdrawal") return reply({ ok: false, error: "Not a wallet withdrawal" });
    if (r.status !== "Pending Admin" || details.auto_review) return reply({ ok: true, decision: "manual", message: "Already reviewed" });
    if (Date.now() - new Date(r.created_at).getTime() > 15 * 60_000) return reply({ ok: true, decision: "manual", message: "Too old for automatic review" });

    const controls = await readAutomationControls(db);
    if (!controls.withdrawalAuto) {
      await db.from("approval_requests").update({ details: { ...details, auto_review: { decision: "manual", reasons: ["Automatic approval is turned off in Settings"], checked_at: new Date().toISOString() } } }).eq("id", requestId);
      return reply({ ok: true, decision: "manual", message: "Automatic approval is turned off" });
    }
    const amount = Number(r.amount || 0);
    const email = String(r.requestedby || "").toLowerCase();
    const userId = String(details.user_id || "");
    const since = new Date(Date.now() - controls.sourceDays * 86400_000).toISOString();
    const dayStart = new Date(new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10) + "T00:00:00+03:00").toISOString();

    const [{ data: fee }, { data: bal }, { data: credits }, { data: today }, { data: gp }, { data: emp }] = await Promise.all([
      db.rpc("withdrawal_service_charge", { p_amount: amount }),
      db.rpc("get_user_balance_safe", { user_email: email }),
      db.from("ledger_entries").select("amount, source_category, entry_type, created_at").eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: true }).limit(2000),
      db.from("approval_requests").select("id, status").eq("type", "Withdrawal Request").ilike("requestedby", email).gte("created_at", dayStart).neq("id", requestId),
      db.from("gosentepay_balance").select("balance").limit(1).maybeSingle(),
      db.from("employees").select("name, phone, wallet_frozen, status, disabled").ilike("email", email).maybeSingle(),
    ]);
    const todayStr = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
    const workSince = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [{ data: lastLogin }, { data: lastAtt }, { data: leaves }, { data: susp }] = await Promise.all([
      db.from("employee_login_tracker").select("created_at").ilike("employee_email", email).gte("created_at", workSince).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("attendance_time_records").select("created_at").ilike("employee_email", email).not("arrival_time", "is", null).gte("created_at", workSince).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("approval_requests").select("details").eq("type", "leave").eq("status", "approved").ilike("requestedby", email).limit(50),
      db.from("employee_suspensions").select("status, end_date, lifted_at").ilike("employee_email", email).is("lifted_at", null).limit(20),
    ]);
    const lastWork = [lastLogin?.created_at, lastAtt?.created_at].filter(Boolean).map((t: any) => new Date(t).getTime());
    const daysSinceLastWork = lastWork.length ? (Date.now() - Math.max(...lastWork)) / 86400_000 : null;
    const onLeave = (leaves || []).some((l: any) => l.details?.start_date <= todayStr && todayStr <= (l.details?.end_date || ""));
    const suspended = (susp || []).some((x: any) => !/lift|ended|cancel/i.test(String(x.status || "")) && (!x.end_date || x.end_date >= todayStr));
    // Money received that can still be in the wallet: any later withdrawal or charge counts as using it up first.
    const stillHeld = (pred: (c: any) => boolean) => {
      let left = 0;
      for (const c of credits || []) {
        const a = Number(c.amount || 0);
        if (a > 0 && pred(c)) left += a; else if (a < 0) left = Math.max(0, left + a);
      }
      return left;
    };
    const credit = stillHeld;
    const otherToday = (today || []).filter((t: any) => !/reject|cancel/i.test(String(t.status))).length;
    const chg = Number(fee || 0);
    const d = evaluateWithdrawalAutoApproval({
      amount, fee: chg, channel: String(details.payment_channel || ""),
      walletBalance: Number((bal as any)?.[0]?.wallet_balance || 0),
      availableBalance: Number((bal as any)?.[0]?.available_balance ?? (bal as any)?.[0]?.wallet_balance ?? 0),
      recentTransferIn: credit(c => TRANSFER_CATEGORIES.includes(c.source_category)),
      recentUnconfirmedPoints: credit(c => POINTS_ENTRY_TYPES.includes(c.entry_type)),
      otherWithdrawalsToday: otherToday,
      payoutBalance: Number((gp as any)?.balance || 0), payoutFee: gosenteWithdrawFee(amount),
      walletFrozen: !!(emp as any)?.wallet_frozen,
      employeeActive: !!emp && (emp as any).status === "Active" && !(emp as any).disabled,
      onLeave, suspended, daysSinceLastWork,
      limit: controls.withdrawalLimit, workDays: controls.workDays, maxPerDay: controls.maxPerDay,
    });
    const review = { decision: d.decision, reasons: d.reasons, checked_at: new Date().toISOString(), fee: chg, other_withdrawals_today: otherToday };
    const name = (emp as any)?.name || r.requestedby_name || "Staff";
    const sms = async (phone: string | null | undefined, message: string, userName: string, messageType = "payout_confirmation") => {
      if (!phone) return;
      try { await db.functions.invoke("send-sms", { body: { phone, message, userName, messageType, department: "Finance", requestId } }); } catch (e) { console.error("sms", e); }
    };
    const notifyOwner = async (message: string) => {
      const { data: o } = await db.from("employees").select("name, phone").ilike("email", OWNER_EMAIL).maybeSingle();
      await sms((o as any)?.phone, message, (o as any)?.name || "Admin", "treasury_alert");
    };
    await db.from("audit_logs").insert({ action: `AUTO_WITHDRAWAL_${d.decision.toUpperCase()}`, table_name: "approval_requests", record_id: requestId, performed_by: AUTO, reason: d.reasons.join("; ") || null, record_data: { amount, email, ...review } });

    if (d.decision === "reject") {
      const why = d.reasons.join("; ");
      await db.from("approval_requests").update({ status: "Rejected", approval_stage: "rejected", rejection_reason: `Automatic check: ${why}`, details: { ...details, auto_review: review }, updated_at: new Date().toISOString() }).eq("id", requestId).eq("status", "Pending Admin");
      await sms((emp as any)?.phone, `Dear ${name}, your withdrawal of UGX ${amount.toLocaleString()} was declined: money received from a fellow employee cannot be withdrawn. Great Agro Coffee.`, name);
      await notifyOwner(`Auto-check REJECTED ${name}'s withdrawal UGX ${amount.toLocaleString()}: ${why}.`);
      return reply({ ok: true, decision: "reject", message: why });
    }
    if (d.decision === "manual") {
      await db.from("approval_requests").update({ details: { ...details, auto_review: review } }).eq("id", requestId);
      if (d.watch) await notifyOwner(`Watch: ${name} requested UGX ${amount.toLocaleString()}, withdrawal number ${otherToday + 1} today. Sent for normal approval.`);
      return reply({ ok: true, decision: "manual", message: d.reasons.join("; ") });
    }

    const now = new Date().toISOString();
    const { data: claimed } = await db.from("approval_requests").update({
      status: "Approved", approval_stage: "approved", admin_approved: true, finance_approved: true,
      admin_approved_by: AUTO, finance_approved_by: AUTO, admin_approved_at: now, finance_approved_at: now,
      details: { ...details, auto_review: review }, updated_at: now,
    }).eq("id", requestId).eq("status", "Pending Admin").select("id").maybeSingle();
    if (!claimed) return reply({ ok: true, decision: "manual", message: "Already being handled" });

    const res = await fetch(`${url}/functions/v1/disburse-approval-request`, {
      method: "POST", headers: { Authorization: `Bearer ${svcKey}`, apikey: svcKey, "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, provider: "gosente", phone: r.disbursement_phone || (emp as any)?.phone || "" }),
    });
    const out = await res.json().catch(() => ({}));
    if (out?.ok) {
      await notifyOwner(`Auto-approved: ${name} withdrawal UGX ${amount.toLocaleString()} + charge UGX ${chg.toLocaleString()} paid via GosentePay. Ref ${out.payout_ref}.`);
      return reply({ ok: true, decision: "approve", paid: true, ref: out.payout_ref });
    }
    await notifyOwner(`Auto-approved ${name} withdrawal UGX ${amount.toLocaleString()} but GosentePay payout failed (${String(out?.error || "").slice(0, 60)}). Finance can retry.`);
    return reply({ ok: true, decision: "approve", paid: false, message: out?.error || "Payout failed; Finance will retry" });
  } catch (e) {
    console.error("auto-approve-withdrawal", e);
    return reply({ ok: false, error: "Automatic review could not run; your request will follow normal approval." });
  }
});
