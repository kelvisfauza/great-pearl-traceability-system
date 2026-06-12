import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok = (b: any) => new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return ok({ ok: false, error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) return ok({ ok: false, error: "Unauthorized" });

    // Only loan-appeal admins can trigger
    const { data: isAdmin } = await supabase.rpc("is_loan_appeal_admin", { _uid: userData.user.id });
    if (!isAdmin) return ok({ ok: false, error: "Forbidden" });

    const { appeal_id } = await req.json();
    if (!appeal_id) return ok({ ok: false, error: "appeal_id required" });

    // Load appeal
    const { data: appeal, error: aErr } = await supabase.from("loan_appeals").select("*").eq("id", appeal_id).maybeSingle();
    if (aErr || !appeal) return ok({ ok: false, error: "Appeal not found" });

    if (!["decided_approve", "decided_counter"].includes(appeal.status)) {
      return ok({ ok: false, error: `Appeal not in disbursable status (${appeal.status})` });
    }
    if (appeal.resulting_loan_id) {
      return ok({ ok: true, already: true, loan_id: appeal.resulting_loan_id });
    }

    // Load votes (will be embedded in loan record + email)
    const { data: votes } = await supabase
      .from("loan_appeal_votes")
      .select("admin_id, admin_email, vote_type, reason, counter_amount, counter_term_months, created_at")
      .eq("appeal_id", appeal_id)
      .order("created_at", { ascending: true });

    // Pick the 3 votes that matched the final decision
    let matching = (votes || []).filter((v: any) => {
      if (appeal.final_decision === "approve_full") return v.vote_type === "approve_full";
      if (appeal.final_decision === "counter") {
        return v.vote_type === "counter"
          && Number(v.counter_amount) === Number(appeal.final_amount)
          && Number(v.counter_term_months) === Number(appeal.final_term_months);
      }
      return false;
    }).slice(0, 3);

    // Resolve voter names from employees by email
    const voterEmails = matching.map((v: any) => (v.admin_email || "").toLowerCase()).filter(Boolean);
    const { data: voterEmployees } = await supabase
      .from("employees")
      .select("name, email")
      .in("email", voterEmails.length ? voterEmails : ["__none__"]);
    const nameByEmail: Record<string, string> = {};
    (voterEmployees || []).forEach((e: any) => { nameByEmail[(e.email || "").toLowerCase()] = e.name; });
    const votersForRecord = matching.map((v: any) => ({
      admin_id: v.admin_id,
      email: v.admin_email,
      name: nameByEmail[(v.admin_email || "").toLowerCase()] || v.admin_email,
      vote_type: v.vote_type,
      reason: v.reason,
      counter_amount: v.counter_amount,
      counter_term_months: v.counter_term_months,
    }));

    // Load borrower employee
    const { data: emp } = await supabase
      .from("employees")
      .select("id, name, email, phone, salary, auth_user_id")
      .eq("email", appeal.employee_email)
      .maybeSingle();
    if (!emp) return ok({ ok: false, error: "Borrower employee not found" });

    // Compute loan terms — mirror standard quick loan economics
    const principal = Number(appeal.final_amount);
    const months = Number(appeal.final_term_months || appeal.requested_term_months || 1);
    const monthlyRate = 10; // %/month
    const dailyRate = Number((monthlyRate / 30).toFixed(4));
    const totalRepayable = Math.ceil(principal + (principal * monthlyRate / 100) * months);
    const monthlyInstallment = Math.ceil(totalRepayable / months);

    // Insert loan (auto-approved via appeal — no guarantor required, no fee deducted)
    const { data: loanRow, error: lErr } = await supabase.from("loans").insert({
      employee_id: emp.id,
      employee_email: emp.email,
      employee_name: emp.name,
      employee_phone: emp.phone || "",
      loan_amount: principal,
      interest_rate: monthlyRate,
      daily_interest_rate: dailyRate,
      total_repayable: totalRepayable,
      duration_months: months,
      monthly_installment: monthlyInstallment,
      remaining_balance: totalRepayable,
      repayment_frequency: "monthly",
      status: "active",
      guarantor_approved: true,
      loan_type: appeal.loan_type || "quick",
      start_date: new Date().toISOString().split("T")[0],
      admin_approved_by: "Admin Panel (Appeal)",
      admin_approved_at: new Date().toISOString(),
      appeal_id: appeal.id,
      appeal_admin_voters: votersForRecord,
      approved_via_appeal: true,
    } as any).select().single();

    if (lErr || !loanRow) return ok({ ok: false, error: `Loan insert failed: ${lErr?.message}` });

    const loanId = (loanRow as any).id;

    // Build repayment schedule
    const startDate = new Date();
    const repayments: any[] = [];
    for (let i = 1; i <= months; i++) {
      const due = new Date(startDate);
      due.setMonth(due.getMonth() + i);
      repayments.push({
        loan_id: loanId,
        installment_number: i,
        amount_due: monthlyInstallment,
        due_date: due.toISOString().split("T")[0],
        status: "pending",
      });
    }
    await supabase.from("loan_repayments").insert(repayments);

    // Disburse to wallet (full principal — no eval fee on appeal disbursements)
    if (emp.auth_user_id) {
      await supabase.from("ledger_entries").insert({
        user_id: emp.auth_user_id,
        entry_type: "DEPOSIT",
        amount: principal,
        reference: "LOAN-APPEAL-DISBURSE-" + loanId,
        metadata: {
          loan_id: loanId,
          appeal_id: appeal.id,
          source: "loan_appeal_disbursement",
          duration_months: months,
          interest_rate: monthlyRate,
          principal,
          repayment_frequency: "monthly",
          motivated_by_admins: votersForRecord.map((v: any) => ({ name: v.name, reason: v.reason })),
        },
      });
    }

    // Mark appeal with resulting loan
    await supabase.from("loan_appeals").update({ resulting_loan_id: loanId }).eq("id", appeal.id);

    // Email borrower with appeal-approved template
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "loan-appeal-approved",
          recipientEmail: emp.email,
          idempotencyKey: `loan-appeal-approved-${appeal.id}`,
          templateData: {
            employeeName: emp.name,
            requestedAmount: Number(appeal.requested_amount).toLocaleString(),
            systemOfferedAmount: Number(appeal.offered_amount).toLocaleString(),
            finalAmount: principal.toLocaleString(),
            finalTermMonths: String(months),
            decision: appeal.final_decision,
            voters: votersForRecord,
          },
        },
      });
    } catch (e) {
      console.warn("appeal email failed", e);
    }

    // Also send standard loan-approval-details so they get the full agreement
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "loan-approval-details",
          recipientEmail: emp.email,
          idempotencyKey: `loan-appeal-agreement-${loanId}`,
          templateData: {
            employeeName: emp.name,
            loanAmount: principal.toLocaleString(),
            interestRate: String(monthlyRate),
            dailyRate: String(dailyRate),
            durationMonths: String(months),
            totalRepayable: totalRepayable.toLocaleString(),
            installmentAmount: monthlyInstallment.toLocaleString(),
            installmentFrequency: "month",
            numInstallments: String(months),
            firstDeductionDate: repayments[0]?.due_date,
            loanType: appeal.loan_type === "long_term" ? "Long-Term Loan" : "Quick Loan",
            approvedBy: "Admin Panel (Appeal)",
            approvalDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            disbursedAmount: principal.toLocaleString(),
          },
        },
      });
    } catch (e) {
      console.warn("agreement email failed", e);
    }

    return ok({ ok: true, loan_id: loanId });
  } catch (e: any) {
    console.error("loan-appeal-disburse error", e);
    return ok({ ok: false, error: e?.message || String(e) });
  }
});