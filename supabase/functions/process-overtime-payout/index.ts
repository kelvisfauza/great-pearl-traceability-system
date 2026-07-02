import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

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
    const { reviewId, payoutMethod, phone, approverEmail, customReference } = body || {};

    if (!reviewId || !payoutMethod) {
      return fail("Missing reviewId or payoutMethod");
    }
    if (!["wallet", "mobile_money"].includes(payoutMethod)) {
      return fail("payoutMethod must be 'wallet' or 'mobile_money'");
    }

    const { data: review, error: revErr } = await supabase
      .from("monthly_overtime_reviews")
      .select("*")
      .eq("id", reviewId)
      .maybeSingle();

    if (revErr) return fail(`Failed to load review: ${revErr.message}`);
    if (!review) return fail("Review not found");
    if (review.payout_status === "paid") {
      return fail("Already paid", { reference: review.payout_reference });
    }

    const amount = Number(review.adjusted_pay ?? review.calculated_pay ?? 0);
    if (!amount || amount <= 0) return fail("Amount is zero — nothing to pay");

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
    } else {
      if (!employeePhone) return fail("No phone number provided for mobile money payout");
      const cleanPhone = normalizePhone(employeePhone);
      if (cleanPhone.length < 12) return fail("Invalid phone number");

      const yo = await yoPayout({
        phone: cleanPhone,
        amount,
        narrative: `Overtime reward ${monthLabel} - ${review.employee_name}`,
      });

      payoutDestination = cleanPhone;
      if (yo.success) {
        payoutStatus = "paid";
        payoutReference = yo.transactionRef || payoutReference;
        payoutMessage = `sent to your mobile money (${cleanPhone})`;
      } else if (yo.statusMessage?.includes("StatusCode:-22")) {
        // pending Yo authorization — treat as paid pending
        payoutStatus = "pending";
        payoutReference = yo.transactionRef || payoutReference;
        payoutMessage = `queued to your mobile money (${cleanPhone}) — pending Yo authorization`;
      } else {
        payoutStatus = "failed";
        await supabase.from("monthly_overtime_reviews").update({
          payout_method: payoutMethod,
          payout_destination: cleanPhone,
          payout_status: "failed",
          payout_reference: payoutReference,
          admin_notes: `Yo Payments error: ${yo.errorMessage || yo.statusMessage}`,
        }).eq("id", reviewId);
        return fail(`Mobile money failed: ${yo.errorMessage || yo.statusMessage}`);
      }
    }

    // Mark review approved + paid
    await supabase.from("monthly_overtime_reviews").update({
      status: "approved",
      reviewed_by: approverEmail || "HR",
      reviewed_at: new Date().toISOString(),
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
          recipientEmail: review.employee_email,
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
            recipientEmail: review.employee_email,
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