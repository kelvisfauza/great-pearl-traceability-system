import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";
import { treasuryReserve, treasuryRelease } from "../_shared/treasury.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ok(payload: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function fail(error: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: false, error, ...extra }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { reviewId, phone, approverEmail, customReference } = body || {};
    const action: "approve" | "finance_release" = body?.action === "finance_release" ? "finance_release" : "approve";
    let payoutMethod: string = body?.payoutMethod === "mobile_money" ? "yo" : body?.payoutMethod;

    if (!reviewId || !payoutMethod) return fail("Missing reviewId or payoutMethod");
    if (!["wallet", "gosentepay", "yo", "cash"].includes(payoutMethod)) {
      return fail("payoutMethod must be wallet, gosentepay, yo or cash");
    }

    const { data: review, error: revErr } = await supabase
      .from("monthly_overtime_reviews").select("*").eq("id", reviewId).maybeSingle();
    if (revErr) return fail(`Failed to load review: ${revErr.message}`);
    if (!review) return fail("Review not found");
    if (review.payout_status === "paid") return fail("Already paid", { reference: review.payout_reference });

    // Finance release: caller must be Finance or admin, and the item must be waiting for Finance
    let financeActor = approverEmail || "Finance";
    if (action === "finance_release") {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const { data: u } = await supabase.auth.getUser(token);
      if (!u?.user?.email) return fail("Please sign in again");
      const { data: me } = await supabase.from("employees").select("name, email, role, permissions, status")
        .ilike("email", u.user.email).maybeSingle();
      const perms: string[] = Array.isArray(me?.permissions) ? me!.permissions : [];
      const allowed = me && (["Super Admin", "Administrator"].includes(me.role) || perms.some((p) => String(p).startsWith("Finance")));
      if (!allowed) return fail("Only Finance can release this payment");
      financeActor = me!.name || me!.email;
      if (!["awaiting_finance", "failed"].includes(String(review.payout_status))) {
        return fail("This overtime is not waiting for Finance");
      }
      if (review.reviewed_by && String(review.reviewed_by).toLowerCase() === String(me!.email).toLowerCase() && !["Super Admin"].includes(me!.role)) {
        return fail("You approved this overtime — another Finance person must release it");
      }
    } else if (review.status !== "pending") {
      return fail("This overtime has already been decided");
    }
    const monthLabel = `${monthNames[review.month]} ${review.year}`;

    // Resolve unified user id (for wallet credit) + phone fallback
    // review.employee_email may actually be an employee CODE (e.g. "GAC-0002")
    // when attendance records lacked a real email. Fall back to lookup by name.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let userId: string | null = null;
    let employeePhone: string | null = phone || null;
    let resolvedEmail: string | null = null;
    try {
      let emp: any = null;
      // 1) Try match by email exact
      const r1 = await supabase
        .from("employees")
        .select("id, phone, email, auth_user_id, name")
        .ilike("email", review.employee_email)
        .maybeSingle();
      emp = r1.data;
      // 2) Fall back to matching by employee name
      if (!emp && review.employee_name) {
        const r2 = await supabase
          .from("employees")
          .select("id, phone, email, auth_user_id, name")
          .ilike("name", review.employee_name)
          .maybeSingle();
        emp = r2.data;
      }
      if (emp?.phone && !employeePhone) employeePhone = emp.phone;
      if (emp?.email) resolvedEmail = emp.email;
      if (emp?.auth_user_id && UUID_RE.test(String(emp.auth_user_id))) {
        userId = emp.auth_user_id;
      }

      if (!userId && resolvedEmail) {
        const { data: uid } = await supabase.rpc("get_unified_user_id", {
          input_email: resolvedEmail,
        });
        if (uid && UUID_RE.test(String(uid))) userId = uid as string;
      }
    } catch (_) { /* ignore */ }

    if (action === "approve" && payoutMethod !== "wallet") {
      const dest = payoutMethod === "cash" ? "cash" : (employeePhone ? normalizePhone(employeePhone) : null);
      if (payoutMethod !== "cash" && (!dest || dest.length < 12)) return fail("A valid phone number is needed for mobile money");
      await supabase.from("monthly_overtime_reviews").update({
        status: "approved",
        reviewed_by: approverEmail || "HR",
        reviewed_at: new Date().toISOString(),
        payout_method: payoutMethod,
        payout_destination: dest,
        payout_status: "awaiting_finance",
        payout_reference: (typeof customReference === "string" && customReference.trim()) || review.payout_reference || null,
      }).eq("id", reviewId);
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "general-notification",
            recipientEmail: "operations@greatpearlcoffee.com",
            idempotencyKey: `overtime-finance-${review.id}`,
            templateData: {
              title: `Overtime awaiting Finance — ${review.employee_name}`,
              message: `${review.employee_name}'s ${monthLabel} overtime of UGX ${amount.toLocaleString()} was approved by ${approverEmail || "Admin"} for payment by ${payoutMethod === "cash" ? "cash" : payoutMethod === "gosentepay" ? "GosentePay" : "Yo Payments"}${dest && dest !== "cash" ? ` to ${dest}` : ""}. Please release it in Finance.`,
              actionLabel: "Open Finance",
            },
          },
        });
      } catch (_) { /* ignore */ }
      return ok({ reviewId, payoutStatus: "awaiting_finance", amount });
    }
    if (action === "finance_release" && payoutMethod !== "cash" && !phone && review.payout_destination && review.payout_destination !== "cash") {
      employeePhone = review.payout_destination;
    }

    let payoutDestination = "wallet";
    let payoutReference = (typeof customReference === "string" && customReference.trim())
      ? customReference.trim()
      : `OT-${review.id.slice(0, 8)}-${Date.now()}`;
    let payoutStatus: "paid" | "failed" | "pending" = "pending";
    let payoutMessage = "";

    if (payoutMethod === "wallet") {
      if (!userId || !UUID_RE.test(userId)) {
        return fail("Could not resolve employee wallet (user_id). Make sure the employee has an auth account with a matching email.");
      }
      const { error: ledgerErr } = await supabase.from("ledger_entries").insert({
        user_id: userId,
        entry_type: "DEPOSIT",
        amount: amount,
        reference: payoutReference,
        metadata: {
          source: "overtime_reward",
          month: review.month,
          year: review.year,
          review_id: review.id,
          description: `Overtime reward — ${monthLabel}`,
          bypass_treasury_check: true,
          approved_by: approverEmail || null,
        },
      });
      if (ledgerErr) return fail(`Wallet credit failed: ${ledgerErr.message}`);
      payoutStatus = "paid";
      payoutDestination = "wallet";
      payoutMessage = `credited to your in-app wallet`;
    } else if (payoutMethod === "cash") {
      payoutStatus = "paid";
      payoutDestination = "cash";
      payoutMessage = "paid to you in cash";
    } else {
      if (!employeePhone) return fail("No phone number provided for mobile money payout");
      const cleanPhone = normalizePhone(employeePhone);
      if (cleanPhone.length < 12) return fail("Invalid phone number");
      payoutDestination = cleanPhone;
      const tRef = `OT-TR-${review.id.slice(0, 8)}-${Date.now()}`;
      const r = await treasuryReserve({ account: "operations", amount, reference: tRef, description: `Overtime ${monthLabel} - ${review.employee_name}`, email: resolvedEmail, name: review.employee_name, performedBy: financeActor, metadata: { overtime_review_id: review.id } });
      if (!r.ok) return fail(`Not funded: ${r.error || "Operations account cannot cover this payment"}`, { code: "TREASURY_INSUFFICIENT" });
      let sent = false, pendingYo = false, detail = "";
      if (payoutMethod === "gosentepay") {
        const gRef = `GSP-OT-${Date.now()}`.slice(0, 30);
        try {
          const g = await gosenteWithdraw({ phone: cleanPhone, amount, email: resolvedEmail && /@/.test(resolvedEmail) ? resolvedEmail : "finance@greatpearlcoffee.com", reason: `Overtime ${monthLabel}`, ref: gRef });
          sent = isGosenteSuccess(g.status, g.body);
          if (!sent) detail = `GosentePay: ${String(g.body?.message || g.body?.data?.message || g.body?.error || g.status).slice(0, 200)}`;
        } catch (e) { detail = `GosentePay error: ${(e as Error).message}`; }
        if (sent) payoutReference = gRef;
        payoutMessage = `sent to your mobile money (${cleanPhone}) via GosentePay`;
      } else {
        const yo = await yoPayout({ phone: cleanPhone, amount, narrative: `Overtime reward ${monthLabel} - ${review.employee_name}` });
        if (yo.success) { sent = true; payoutReference = yo.transactionRef || payoutReference; }
        else if (yo.statusMessage?.includes("StatusCode:-22")) { pendingYo = true; payoutReference = yo.transactionRef || payoutReference; }
        else detail = `Yo Payments: ${yo.errorMessage || yo.statusMessage}`;
        payoutMessage = pendingYo ? `queued to your mobile money (${cleanPhone}) — pending Yo authorization` : `sent to your mobile money (${cleanPhone})`;
      }
      if (sent) payoutStatus = "paid";
      else if (pendingYo) payoutStatus = "pending";
      else {
        await treasuryRelease({ account: "operations", amount, reference: tRef, performedBy: financeActor });
        await supabase.from("monthly_overtime_reviews").update({
          payout_method: payoutMethod, payout_destination: cleanPhone, payout_status: "failed",
          admin_notes: `${review.admin_notes || ""}\nPayout failed: ${detail}`.trim(),
        }).eq("id", reviewId);
        return fail(`Mobile money failed: ${detail}`);
      }
    }

    // Mark review approved + paid
    await supabase.from("monthly_overtime_reviews").update({
      ...(action === "approve" ? { status: "approved", reviewed_by: approverEmail || "HR", reviewed_at: new Date().toISOString() } : {}),
      payout_method: payoutMethod,
      payout_destination: payoutDestination,
      payout_status: payoutStatus,
      payout_reference: payoutReference,
      paid_at: payoutStatus === "paid" ? new Date().toISOString() : null,
    }).eq("id", reviewId);

    // Notify the employee via email (overtime-reward template)
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "overtime-reward",
          recipientEmail: resolvedEmail || review.employee_email,
          idempotencyKey: `overtime-paid-${review.id}`,
          ccEmails: ["operations@greatpearlcoffee.com"],
          templateData: {
            employeeName: review.employee_name,
            month: monthLabel,
            rewardAmount: amount,
            netOvertimeMinutes: review.net_overtime_minutes,
            netOvertimeHours: Math.ceil((review.net_overtime_minutes || 0) / 60),
            totalOvertimeMinutes: review.total_overtime_minutes,
            totalLateMinutes: review.total_late_minutes,
            payoutDestination: payoutMessage,
            payoutMethod,
            payoutReference,
          },
        },
      });
    } catch (e) {
      console.error("Email send failed:", (e as Error).message);
    }

    // Notify the employee via SMS (uses allowed type 'payout_confirmation')
    if (employeePhone) {
      try {
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: employeePhone,
            message: `Great Agro Coffee: Your ${monthLabel} overtime reward of UGX ${amount.toLocaleString()} has been ${payoutMessage}. Ref: ${payoutReference}`,
            userName: review.employee_name,
            recipientEmail: resolvedEmail || review.employee_email,
            messageType: "payout_confirmation",
            department: "Human Resources",
            triggeredBy: approverEmail || "HR",
            requestId: review.id,
          },
        });
      } catch (e) {
        console.error("SMS send failed:", (e as Error).message);
      }
    }

    return ok({
      reviewId,
      payoutStatus,
      payoutReference,
      destination: payoutDestination,
      amount,
    });
  } catch (e) {
    console.error("process-overtime-payout error:", (e as Error).message);
    return fail((e as Error).message || "Unknown error");
  }
});