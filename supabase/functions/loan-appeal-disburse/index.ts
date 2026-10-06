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

    const { data: isAdmin } = await supabase.rpc("is_loan_appeal_admin", { _uid: userData.user.id });
    const reqBody = await req.json();
    const action = reqBody.action || "decide";
    let appeal_id = reqBody.appeal_id;
    let existingLoan: any = null;

    if (action === "finalize") {
      // Called once every guarantor has approved with their code
      const { data: l } = await supabase.from("loans").select("*").eq("id", reqBody.loan_id).maybeSingle();
      if (!l || !(l as any).approved_via_appeal) return ok({ ok: false, error: "Appeal loan not found" });
      const callerEmail = (userData.user.email || "").toLowerCase();
      const isGuarantor = [l.guarantor_email, l.guarantor2_email].some((e: any) => (e || "").toLowerCase() === callerEmail);
      if (!isAdmin && !isGuarantor) return ok({ ok: false, error: "Forbidden" });
      if (l.status === "active") return ok({ ok: true, already: true, loan_id: l.id });
      const allSigned = !!l.guarantor_approved && (!l.guarantor2_email || !!l.guarantor2_approved);
      if (!allSigned) return ok({ ok: false, error: "Waiting for guarantor approval" });
      existingLoan = l;
      appeal_id = (l as any).appeal_id;
    } else if (!isAdmin) {
      return ok({ ok: false, error: "Forbidden" });
    }
    if (!appeal_id) return ok({ ok: false, error: "appeal_id required" });

    // Load appeal
    const { data: appeal, error: aErr } = await supabase.from("loan_appeals").select("*").eq("id", appeal_id).maybeSingle();
    if (aErr || !appeal) return ok({ ok: false, error: "Appeal not found" });

    if (!["decided_approve", "decided_counter"].includes(appeal.status)) {
      return ok({ ok: false, error: `Appeal not in disbursable status (${appeal.status})` });
    }
    if (appeal.resulting_loan_id && !existingLoan) {
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

    // Compute loan terms based on loan_type
    const principal = Number(appeal.final_amount);
    const months = Number(appeal.final_term_months || appeal.requested_term_months || 1);
    const loanType = String(appeal.loan_type || "quick");
    const isPureSalary = loanType === "pure_salary";
    const monthlyRate = isPureSalary ? 15 : 10; // %/month
    const dailyRate = Number((monthlyRate / 30).toFixed(4));
    const totalRepayable = Math.ceil(principal + (principal * monthlyRate / 100) * months);
    // Pure salary: installment = 50% of salary, paid every 27th payroll until cleared.
    // Standard: equal installments over N months.
    const salaryAmt = Number((emp as any).salary || 0);
    const halfSalary = Math.max(1, Math.floor(salaryAmt * 0.5));
    const monthlyInstallment = isPureSalary ? halfSalary : Math.ceil(totalRepayable / months);
    const numInstallments = isPureSalary
      ? Math.ceil(totalRepayable / halfSalary)
      : months;

    const baseLoan: any = {
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
      loan_type: appeal.loan_type || "quick",
      admin_approved_by: "Admin Panel (Appeal)",
      admin_approved_at: new Date().toISOString(),
      appeal_id: appeal.id,
      appeal_admin_voters: votersForRecord,
      approved_via_appeal: true,
    };

    const needsGuarantors = !isPureSalary;
    if (!existingLoan && needsGuarantors) {
      // Guarantors must sign with their code before any money moves — same as normal loans
      const hasG1 = !!appeal.guarantor_email;
      const code1 = Math.floor(100000 + Math.random() * 900000).toString();
      const code2 = appeal.guarantor2_email ? Math.floor(100000 + Math.random() * 900000).toString() : null;
      const { data: pl, error: pErr } = await supabase.from("loans").insert({
        ...baseLoan,
        status: hasG1 ? "pending_guarantor" : "guarantor_declined",
        admin_rejection_reason: hasG1 ? null : "Appeal approved — select a guarantor to continue",
        guarantor_id: appeal.guarantor_id, guarantor_email: appeal.guarantor_email,
        guarantor_name: appeal.guarantor_name, guarantor_phone: appeal.guarantor_phone || "",
        guarantor_approval_code: hasG1 ? code1 : null, guarantor_approved: false,
        guarantor2_id: appeal.guarantor2_id, guarantor2_email: appeal.guarantor2_email,
        guarantor2_name: appeal.guarantor2_name, guarantor2_phone: appeal.guarantor2_phone || null,
        guarantor2_approval_code: code2, guarantor2_approved: false,
      } as any).select().single();
      if (pErr || !pl) return ok({ ok: false, error: `Loan insert failed: ${pErr?.message}` });
      await supabase.from("loan_appeals").update({ resulting_loan_id: (pl as any).id }).eq("id", appeal.id);

      const gList = [
        hasG1 ? { name: appeal.guarantor_name, email: appeal.guarantor_email, phone: appeal.guarantor_phone, code: code1, slot: "g1" } : null,
        code2 ? { name: appeal.guarantor2_name, email: appeal.guarantor2_email, phone: appeal.guarantor2_phone, code: code2, slot: "g2" } : null,
      ].filter(Boolean) as any[];
      for (const g of gList) {
        try {
          if (g.phone) await supabase.functions.invoke("send-sms", { body: {
            phone: g.phone, userName: g.name, recipientEmail: g.email, messageType: "loan_guarantor_code", priority: "premium",
            message: `Great Agro Coffee\nHi ${String(g.name || "").split(" ")[0]}, admins approved ${emp.name}'s loan appeal of UGX ${principal.toLocaleString()} for ${months} months. You are the guarantor. Approval code: ${g.code}. Log into the system to approve or reject.`,
          } });
        } catch (e) { console.warn("guarantor sms failed", e); }
        try {
          await supabase.functions.invoke("send-transactional-email", { body: {
            templateName: "loan-guarantor-code", recipientEmail: g.email,
            idempotencyKey: `appeal-guarantor-${appeal.id}-${g.slot}`,
            templateData: { guarantorName: g.name, borrowerName: emp.name, loanAmount: principal.toLocaleString(), duration: String(months), approvalCode: g.code },
          } });
        } catch (e) { console.warn("guarantor email failed", e); }
      }
      // Tell the borrower where things stand
      const msg = hasG1
        ? `Admins approved your loan appeal for UGX ${principal.toLocaleString()} over ${months} month(s). Your guarantor${gList.length > 1 ? "s have" : " has"} been sent an approval code. The money is sent to your wallet once ${gList.length > 1 ? "they both approve" : "they approve"}.`
        : `Admins approved your loan appeal for UGX ${principal.toLocaleString()} over ${months} month(s). Please log in and choose a guarantor for this loan. The money is sent once your guarantor approves.`;
      try {
        await supabase.functions.invoke("send-transactional-email", { body: {
          templateName: "general-notification", recipientEmail: emp.email,
          idempotencyKey: `appeal-awaiting-guarantor-${appeal.id}`,
          templateData: { title: "Loan Appeal Approved — Awaiting Guarantor", recipientName: emp.name, message: msg },
        } });
      } catch (e) { console.warn("borrower email failed", e); }
      return ok({ ok: true, loan_id: (pl as any).id, pending_guarantor: true });
    }

    let loanRow: any; let lErr: any;
    if (existingLoan) {
      ({ data: loanRow, error: lErr } = await supabase.from("loans")
        .update({ ...baseLoan, status: "active", start_date: new Date().toISOString().split("T")[0] } as any)
        .eq("id", existingLoan.id).eq("status", "pending_guarantor").select().single());
    } else {
      ({ data: loanRow, error: lErr } = await supabase.from("loans").insert({
        ...baseLoan, status: "active", guarantor_approved: true,
        start_date: new Date().toISOString().split("T")[0],
      } as any).select().single());
    }

    if (lErr || !loanRow) return ok({ ok: false, error: `Loan activation failed: ${lErr?.message}` });

    const loanId = (loanRow as any).id;

    // Build repayment schedule
    const repayments: any[] = [];
    let remaining = totalRepayable;
    if (isPureSalary) {
      // Next payroll = 27th of current month if today <= 27, else 27th of next month
      const today = new Date();
      const firstPayroll = new Date(today.getFullYear(), today.getMonth(), 27);
      if (today.getDate() > 27) firstPayroll.setMonth(firstPayroll.getMonth() + 1);
      for (let i = 1; i <= numInstallments; i++) {
        const due = new Date(firstPayroll);
        due.setMonth(due.getMonth() + (i - 1));
        const amt = Math.min(monthlyInstallment, remaining);
        remaining -= amt;
        repayments.push({
          loan_id: loanId,
          installment_number: i,
          amount_due: amt,
          due_date: due.toISOString().split("T")[0],
          status: "pending",
        });
      }
    } else {
      const startDate = new Date();
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
            numInstallments: String(numInstallments),
            firstDeductionDate: repayments[0]?.due_date,
            loanType: isPureSalary ? "Pure Salary Loan" : (loanType === "long_term" ? "Long-Term Loan" : "Quick Loan"),
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