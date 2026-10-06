import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return respond(false, { error: "Unauthorized" });

    const supabaseAuth = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user?.email) return respond(false, { error: "Invalid token" });
    const adminEmail = userData.user.email;

    const supabase = createClient(supabaseUrl, svc);

    // Verify admin role
    const { data: adminEmp } = await supabase
      .from("employees").select("name, role, permissions").eq("email", adminEmail).maybeSingle();
    const role = (adminEmp?.role || "").toString();
    const perms: string[] = Array.isArray((adminEmp as any)?.permissions) ? (adminEmp as any).permissions : [];
    const isAdmin = ["Administrator", "Super Admin"].includes(role);
    const isFinance = role === "Finance" || perms.includes("Finance:approve") || perms.includes("Finance:process");

    const { instant_withdrawal_id, action, reason } = await req.json();

    if (action === "finance_list") {
      if (!isFinance && !isAdmin) return respond(false, { error: "Not allowed" });
      const { data: rows } = await supabase.from("instant_withdrawals").select("*")
        .eq("payout_status", "pending_finance").order("created_at", { ascending: true });
      const { data: recentRows } = await supabase.from("instant_withdrawals").select("*")
        .neq("payout_status", "pending_finance").order("created_at", { ascending: false }).limit(25);
      const nameOf = async (r: any) => {
        const { data: e } = await supabase.from("employees").select("name, email").or(`auth_user_id.eq.${r.user_id},id.eq.${r.user_id}`).maybeSingle();
        return { ...r, employee_name: e?.name || r.user_id, employee_email: e?.email || null };
      };
      const out = await Promise.all((rows || []).map(nameOf));
      const recent = await Promise.all((recentRows || []).map(nameOf));
      return respond(true, { withdrawals: out, recent });
    }
    if (!instant_withdrawal_id || instant_withdrawal_id === "x") return respond(false, { error: "Missing instant_withdrawal_id" });

    // Step 1 — admin approval only moves it to Finance; no money moves.
    if (action === "admin_approve") {
      if (!isAdmin) return respond(false, { error: "Only administrators can approve" });
      const { data: row } = await supabase.from("instant_withdrawals").select("user_id").eq("id", instant_withdrawal_id).maybeSingle();
      const { data: owner } = await supabase.from("employees").select("email").or(`auth_user_id.eq.${row?.user_id},id.eq.${row?.user_id}`).maybeSingle();
      if (owner?.email && owner.email === adminEmail) return respond(false, { error: "You cannot approve your own withdrawal" });
      const { data: upd } = await supabase.from("instant_withdrawals").update({
        payout_status: "pending_finance", admin_approved_by: adminEmp?.name || adminEmail, admin_approved_at: new Date().toISOString(),
      }).eq("id", instant_withdrawal_id).eq("payout_status", "pending_approval").select("id");
      if (!upd?.length) return respond(false, { error: "Already processed" });
      return respond(true, { awaiting_finance: true });
    }

    if (action === "finance_reject") {
      if (!isFinance) return respond(false, { error: "Only Finance can reject" });
      const { data: upd } = await supabase.from("instant_withdrawals").update({
        payout_status: "rejected", last_error: `Rejected by Finance: ${reason || "no reason given"}`.slice(0, 300),
        finance_released_by: adminEmp?.name || adminEmail, finance_released_at: new Date().toISOString(),
      }).eq("id", instant_withdrawal_id).in("payout_status", ["pending_finance", "pending_approval"]).select("*");
      if (!upd?.length) return respond(false, { error: "Already processed" });
      const iw = upd[0];
      // Refund every wallet debit held for this withdrawal (amount + fee)
      const { data: holds } = await supabase.from("ledger_entries").select("user_id, amount, reference")
        .eq("metadata->>instant_withdrawal_id", iw.id).lt("amount", 0);
      let refunded = 0;
      for (const h of holds || []) {
        const amt = Math.abs(Number(h.amount));
        const { error: rErr } = await supabase.from("ledger_entries").insert({
          user_id: h.user_id, entry_type: "DEPOSIT", amount: amt, source_category: "REFUND",
          reference: `REFUND-${h.reference}`,
          metadata: { type: "withdrawal_refund", instant_withdrawal_id: iw.id, bypass_treasury_check: true,
            description: `Refund — instant withdrawal rejected by Finance${reason ? ` (${reason})` : ""}`, initiated_by: adminEmail },
        });
        if (!rErr) refunded += amt;
        else console.error("refund insert failed", rErr);
      }
      const { data: owner } = await supabase.from("employees").select("name, email, phone").or(`auth_user_id.eq.${iw.user_id},id.eq.${iw.user_id}`).maybeSingle();
      await supabase.from("audit_logs").insert({ action: "FINANCE_REJECT_INSTANT_WITHDRAWAL", table_name: "instant_withdrawals", record_id: iw.id, performed_by: adminEmp?.name || adminEmail, reason: reason || null, record_data: { amount: iw.amount, refunded } });
      if (owner?.email) {
        try {
          await supabase.functions.invoke("send-transactional-email", { body: {
            templateName: "general-notification", recipientEmail: owner.email, idempotencyKey: `iw-reject-${iw.id}`,
            templateData: { title: "Withdrawal not approved", message: `Dear ${owner.name}, your withdrawal of UGX ${Number(iw.amount).toLocaleString()} was rejected by Finance. Reason: ${reason || "Not specified"}. UGX ${refunded.toLocaleString()} has been returned to your wallet. Great Agro Coffee.` },
          } });
        } catch (_) { /* non-blocking */ }
      }
      return respond(true, { refunded });
    }

    if (action === "send_back") {
      if (!isFinance) return respond(false, { error: "Only Finance can send back" });
      const { data: upd } = await supabase.from("instant_withdrawals").update({ payout_status: "pending_approval", admin_approved_by: null, admin_approved_at: null })
        .eq("id", instant_withdrawal_id).eq("payout_status", "pending_finance").select("id");
      if (!upd?.length) return respond(false, { error: "Already processed" });
      return respond(true, {});
    }

    // Step 2 — Finance releases the money.
    if (!isFinance) return respond(false, { error: "Only Finance can release this payout" });

    // Atomic claim: only proceed if still pending_approval
    const { data: iw, error: fetchErr } = await supabase
      .from("instant_withdrawals")
      .select("*")
      .eq("id", instant_withdrawal_id)
      .maybeSingle();
    if (fetchErr || !iw) return respond(false, { error: "Record not found" });
    if (iw.payout_status !== "pending_finance") {
      return respond(false, { error: "Already processed" });
    }
    if (iw.payment_provider !== "gosente") {
      return respond(false, { error: "Not a GosentePay withdrawal" });
    }

    // Fetch requester email for gosente
    const { data: reqEmp } = await supabase
      .from("employees").select("name, email")
      .or(`auth_user_id.eq.${iw.user_id},id.eq.${iw.user_id}`)
      .maybeSingle();

    // Self-approval guard
    if (reqEmp?.email && reqEmp.email === adminEmail) {
      return respond(false, { error: "You cannot release your own withdrawal" });
    }
    if (iw.admin_approved_by && [adminEmp?.name, adminEmail].includes(iw.admin_approved_by)) {
      return respond(false, { error: "You approved this as admin — another Finance officer must release it" });
    }

    const ref = iw.payout_ref || `INSTANT-WD-${iw.id}`;
    const amount = Number(iw.amount);
    console.log(`[dispatch-gosente-instant] admin=${adminEmail} amount=${amount} phone=${iw.phone_number} ref=${ref}`);

    const { status, body } = await gosenteWithdraw({
      phone: iw.phone_number,
      amount,
      email: reqEmp?.email || adminEmail,
      reason: `Instant withdrawal ${ref}`.slice(0, 120),
      ref,
    });

    const success = isGosenteSuccess(status, body);
    const inner = body?.data || body;
    const providerRef = body?.gateway_reference || inner?.ref || ref;
    const displayMsg = inner?.message || body?.message || (success ? "Payout accepted" : "Payout rejected");

    if (success) {
      await supabase.from("instant_withdrawals").update({
        payout_status: "success",
        payout_ref: providerRef,
        completed_at: new Date().toISOString(),
        finance_released_by: adminEmp?.name || adminEmail,
        finance_released_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", iw.id).eq("payout_status", "pending_finance");

      // Notify requester
      if (reqEmp?.email) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "instant-withdrawal-confirmation",
              recipientEmail: reqEmp.email,
              idempotencyKey: `iw-gp-approved-${iw.id}`,
              templateData: {
                employeeName: reqEmp.name || "there",
                amount, phone: iw.phone_number, ref: providerRef,
                status: "success",
              },
            },
          });
        } catch (_) { /* non-blocking */ }
      }

      return respond(true, { success: true, ref: providerRef, message: displayMsg });
    }

    // Failure — keep pending_approval so admin can retry, log the error
    await supabase.from("instant_withdrawals").update({ last_error: String(displayMsg).slice(0, 300) }).eq("id", iw.id);
    console.warn(`[dispatch-gosente-instant] Gosente failure status=${status} body=${JSON.stringify(body)}`);
    return respond(false, { error: `GosentePay payout failed: ${displayMsg}`, providerStatus: status });
  } catch (e) {
    console.error("[dispatch-gosente-instant] Unhandled:", e);
    return respond(false, { error: (e as Error).message || "Unknown error" });
  }
});