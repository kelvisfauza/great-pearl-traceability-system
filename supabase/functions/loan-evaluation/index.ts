import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEE = 10000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { employee_email, requested_amount, requested_loan_type, requested_duration } = await req.json();
    if (!employee_email) {
      return new Response(JSON.stringify({ ok: false, error: "employee_email required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Employee
    const { data: emp } = await supabase
      .from("employees")
      .select("id, name, email, salary, join_date, auth_user_id")
      .eq("email", employee_email)
      .single();
    if (!emp) {
      return new Response(JSON.stringify({ ok: false, error: "Employee not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const salary = Number(emp.salary || 0);
    const maxLimit = salary * 3;

    // Unified id
    const { data: unifiedId } = await supabase.rpc("get_unified_user_id", { input_email: employee_email });
    const userId = unifiedId || emp.auth_user_id;

    // Loan history
    const { data: loanHistory } = await supabase
      .from("loans")
      .select("id, loan_amount, remaining_balance, status, duration_months, paid_amount, total_repayable, created_at, is_defaulted, guarantor_email")
      .eq("employee_email", employee_email)
      .order("created_at", { ascending: false });
    const loans = loanHistory || [];
    const completed = loans.filter((l: any) => l.status === "completed").length;
    // Only TRUE defaults count as hard denials. "overdue" is treated as a risk factor, not an auto-deny.
    const defaulted = loans.filter((l: any) => l.is_defaulted === true || l.status === "defaulted").length;
    const overdue = loans.filter((l: any) => l.status === "overdue").length;
    const active = loans.filter((l: any) => ["active", "pending_guarantor", "pending_admin"].includes(l.status));
    const outstanding = active.reduce((s: number, l: any) => s + Number(l.remaining_balance || l.loan_amount || 0), 0);
    const activePureSalary = active.filter((l: any) => l.loan_type === 'pure_salary').length;
    const totalMissedInstallments = loans.reduce((s: number, l: any) => s + Number(l.missed_installments || 0), 0);
    const totalPenaltyAmount = loans.reduce((s: number, l: any) => s + Number(l.penalty_amount || 0), 0);

    // Repayment quality from loan_repayments (on-time vs late)
    const loanIds = loans.map((l: any) => l.id);
    let repayOnTime = 0, repayLate = 0, repayOverdueOpen = 0, totalRepaymentPenalty = 0;
    if (loanIds.length) {
      const { data: schedule } = await supabase
        .from("loan_repayments")
        .select("status, due_date, paid_date, overdue_days, penalty_applied")
        .in("loan_id", loanIds);
      for (const r of (schedule || []) as any[]) {
        totalRepaymentPenalty += Number(r.penalty_applied || 0);
        if (r.status === 'paid') {
          if (r.paid_date && r.due_date && new Date(r.paid_date) <= new Date(r.due_date)) repayOnTime++;
          else repayLate++;
        } else if (r.status === 'overdue' || (r.status === 'pending' && r.due_date && new Date(r.due_date) < new Date())) {
          repayOverdueOpen++;
        }
      }
    }
    const totalPaidInstallments = repayOnTime + repayLate;
    const onTimeRatio = totalPaidInstallments > 0 ? repayOnTime / totalPaidInstallments : 1;

    // Overdraft posture
    const { data: overdraft } = await supabase
      .from("overdraft_accounts")
      .select("status, outstanding_balance, approved_limit, frozen, first_negative_at, total_recovered, total_drawn")
      .eq("employee_email", employee_email)
      .maybeSingle();
    const overdraftActive = !!overdraft && overdraft.status === 'active';
    const overdraftOutstanding = Number(overdraft?.outstanding_balance || 0);
    const overdraftFrozen = !!overdraft?.frozen;
    const overdraftStaleDays = overdraft?.first_negative_at
      ? Math.floor((Date.now() - new Date(overdraft.first_negative_at).getTime()) / 86400000)
      : 0;

    // Salary advances (active / outstanding)
    const { data: salAdv } = await supabase
      .from("employee_salary_advances")
      .select("status, remaining_balance, original_amount")
      .eq("employee_email", employee_email);
    const activeSalAdv = (salAdv || []).filter((s: any) => ['active','pending','approved'].includes(s.status));
    const salaryAdvanceOutstanding = activeSalAdv.reduce((s: number, a: any) => s + Number(a.remaining_balance || a.original_amount || 0), 0);

    // Guarantor defaults — instances where THIS user's loan caused their guarantor's wallet to be debited
    const { data: guarantorDeducts } = await supabase
      .from("ledger_entries")
      .select("amount, reference, metadata, created_at")
      .like("reference", "LOAN-GUARANTOR-%")
      .lt("amount", 0);
    const myLoanIds = new Set(loans.map((l: any) => String(l.id)));
    const guarantorHits = (guarantorDeducts || []).filter((e: any) => {
      // reference format: LOAN-GUARANTOR-<loanId>-<n>
      const m = String(e.reference || "").match(/^LOAN-GUARANTOR-([0-9a-f-]+)-/i);
      return m && myLoanIds.has(m[1]);
    });
    const guarantorDefaultCount = new Set(guarantorHits.map((e: any) => String(e.reference).match(/^LOAN-GUARANTOR-([0-9a-f-]+)-/i)?.[1])).size;
    const guarantorDefaultAmount = guarantorHits.reduce((s: number, e: any) => s + Math.abs(Number(e.amount)), 0);

    // Times the borrower acted as GUARANTOR for others and was debited (signal of poor judgement / risky circle)
    const { data: actedAsGuarantor } = await supabase
      .from("ledger_entries")
      .select("amount, reference")
      .eq("user_id", userId)
      .like("reference", "LOAN-GUARANTOR-%")
      .lt("amount", 0);
    const timesDebitedAsGuarantor = (actedAsGuarantor || []).length;

    // Wallet snapshot
    const walletTypes = ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', 'MONTHLY_SALARY', 'PAYOUT'];
    const { data: walletEntries } = await supabase
      .from("ledger_entries")
      .select("amount")
      .eq("user_id", userId)
      .in("entry_type", walletTypes);
    const walletBalance = (walletEntries || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

    // Repayment quality (last 6 months)
    const sixMo = new Date(); sixMo.setMonth(sixMo.getMonth() - 6);
    const { data: repays } = await supabase
      .from("ledger_entries")
      .select("amount, reference, created_at")
      .eq("user_id", userId)
      .like("reference", "LOAN-REPAY%")
      .gte("created_at", sixMo.toISOString());
    const repayCount = (repays || []).length;
    const repayTotal = (repays || []).reduce((s: number, e: any) => s + Math.abs(Number(e.amount)), 0);

    // Tenure
    const tenureMonths = emp.join_date
      ? Math.max(1, Math.round((Date.now() - new Date(emp.join_date).getTime()) / (30.44 * 86400000)))
      : 1;

    const requested = Number(requested_amount || 0);

    // Total existing debt obligations (loans + salary advance + overdraft drawn)
    const totalDebtObligations = outstanding + salaryAdvanceOutstanding + overdraftOutstanding;
    const debtToSalaryRatio = salary > 0 ? totalDebtObligations / salary : 999;

    // Heuristic fallback — start from FULL entitlement (3× salary), not requested.
    // The "limit" shown to user must reflect what they're entitled to, not what they typed.
    const hasActive = active.length > 0;
    let fallbackDecision: "approve" | "top_up" | "deny" = "approve";
    let fallbackAmount = maxLimit; // Start at full 3× salary entitlement
    const fallbackFactors: string[] = [];

    if (defaulted > 0) {
      fallbackDecision = "deny";
      fallbackAmount = 0;
      fallbackFactors.push(`${defaulted} prior default(s)`);
    } else if (salary <= 0) {
      fallbackDecision = "deny";
      fallbackAmount = 0;
      fallbackFactors.push("No salary on record");
    } else if (overdraftFrozen) {
      fallbackDecision = "deny";
      fallbackAmount = 0;
      fallbackFactors.push("Overdraft account is frozen");
    } else if (overdraftActive && overdraftStaleDays > 45 && overdraftOutstanding > 0) {
      fallbackDecision = "deny";
      fallbackAmount = 0;
      fallbackFactors.push(`Overdraft negative for ${overdraftStaleDays} days unrecovered`);
    } else if (repayOverdueOpen >= 2) {
      fallbackDecision = "deny";
      fallbackAmount = 0;
      fallbackFactors.push(`${repayOverdueOpen} overdue installments on existing loan(s)`);
    } else if (debtToSalaryRatio >= 3) {
      fallbackDecision = "deny";
      fallbackAmount = 0;
      fallbackFactors.push(`Debt load already ${debtToSalaryRatio.toFixed(1)}× salary`);
    } else if (tenureMonths < 2) {
      fallbackAmount = Math.min(fallbackAmount, Math.round(salary * 1.5));
      fallbackFactors.push("New employee (< 2 months) – limit capped at 1.5× salary");
    }

    // Penalty / late-payment posture
    if (onTimeRatio < 0.5 && totalPaidInstallments >= 2) {
      fallbackAmount = Math.round(fallbackAmount * 0.4);
      fallbackFactors.push(`Poor repayment timeliness: only ${Math.round(onTimeRatio*100)}% on-time`);
    } else if (onTimeRatio < 0.8 && totalPaidInstallments >= 2) {
      fallbackAmount = Math.round(fallbackAmount * 0.7);
      fallbackFactors.push(`Mixed repayment timeliness: ${Math.round(onTimeRatio*100)}% on-time`);
    }
    if (totalMissedInstallments >= 3) {
      fallbackAmount = Math.round(fallbackAmount * 0.5);
      fallbackFactors.push(`${totalMissedInstallments} missed installments historically`);
    }
    if (totalPenaltyAmount + totalRepaymentPenalty > 0) {
      fallbackAmount = Math.round(fallbackAmount * 0.8);
      fallbackFactors.push(`Penalties accrued: UGX ${(totalPenaltyAmount + totalRepaymentPenalty).toLocaleString()}`);
    }
    if (timesDebitedAsGuarantor > 0) {
      fallbackAmount = Math.round(fallbackAmount * 0.85);
      fallbackFactors.push(`Debited ${timesDebitedAsGuarantor}× as guarantor for others`);
    }
    if (overdraftActive && overdraftOutstanding > 0) {
      fallbackFactors.push(`Active overdraft draw: UGX ${overdraftOutstanding.toLocaleString()}`);
      fallbackAmount = Math.max(0, fallbackAmount - overdraftOutstanding);
    }
    if (salaryAdvanceOutstanding > 0) {
      fallbackFactors.push(`Outstanding salary advance: UGX ${salaryAdvanceOutstanding.toLocaleString()}`);
      fallbackAmount = Math.max(0, fallbackAmount - salaryAdvanceOutstanding);
    }
    if (activePureSalary > 0) {
      fallbackDecision = fallbackDecision === 'deny' ? 'deny' : 'top_up';
      fallbackFactors.push("Active pure-salary loan in force");
    }

    if (overdue > 0) {
      fallbackAmount = Math.round(fallbackAmount * 0.6);
      fallbackFactors.push(`${overdue} overdue loan(s) – limit reduced by 40%`);
    }
    if (guarantorDefaultCount > 0) {
      // Reduce limit heavily but do not auto-deny unless severe (2+ recoveries)
      if (guarantorDefaultCount >= 2) {
        fallbackDecision = "deny";
        fallbackAmount = 0;
        fallbackFactors.push(`${guarantorDefaultCount} loans recovered from guarantor – UGX ${guarantorDefaultAmount.toLocaleString()} debited`);
      } else {
        fallbackAmount = Math.round(fallbackAmount * 0.5);
        fallbackFactors.push(`1 prior guarantor recovery – limit reduced by 50%`);
      }
    }
    if (hasActive && fallbackDecision !== "deny") {
      fallbackDecision = "top_up";
      fallbackAmount = Math.max(0, maxLimit - outstanding);
      fallbackFactors.push(`Existing active loan – top-up only (outstanding: UGX ${outstanding.toLocaleString()})`);
    }
    // Reward clean repayment history with full entitlement
    if (completed >= 1 && defaulted === 0 && guarantorDefaultCount === 0 && fallbackDecision === "approve") {
      fallbackAmount = maxLimit;
      fallbackFactors.push(`Clean history – full 3× salary entitlement (UGX ${maxLimit.toLocaleString()})`);
    }
    if (completed >= 2) fallbackFactors.push(`Strong repayment history: ${completed} loans completed`);
    if (repayCount >= 4) fallbackFactors.push(`Consistent repayments: ${repayCount} payments in last 6 months`);

    let decision = fallbackDecision;
    let recommendedAmount = fallbackAmount;
    let recommendedType = requested_loan_type || (recommendedAmount > salary ? "long_term" : "quick");
    let recommendedDuration = Number(requested_duration) || (recommendedAmount > salary ? 3 : 1);
    let riskScore = Math.max(
      5,
      80
        - defaulted * 30
        - guarantorDefaultCount * 35
        - repayOverdueOpen * 15
        - totalMissedInstallments * 5
        - (overdraftActive && overdraftOutstanding > 0 ? 10 : 0)
        - (salaryAdvanceOutstanding > 0 ? 5 : 0)
        - Math.round((1 - onTimeRatio) * 20)
        + completed * 5
        - (hasActive ? 10 : 0)
    );
    let factors = fallbackFactors.length ? fallbackFactors : ["Standard evaluation applied"];

    if (LOVABLE_API_KEY) {
      const prompt = `You are a strict loan underwriter for an employee loan system. Decide based on the data below.

EMPLOYEE
- Name: ${emp.name}
- Monthly Salary (UGX): ${salary}
- Tenure (months): ${tenureMonths}
- Wallet balance (UGX): ${walletBalance.toFixed(0)}

LOAN HISTORY
- Completed loans: ${completed}
- Defaulted/Overdue: ${defaulted}
- Active/Pending: ${active.length}
- Total outstanding (UGX): ${outstanding}
- Repayments last 6 months: ${repayCount} totaling UGX ${repayTotal}
- On-time repayment ratio: ${(onTimeRatio * 100).toFixed(0)}% (${repayOnTime} on-time, ${repayLate} late, ${repayOverdueOpen} currently overdue)
- Missed installments (lifetime): ${totalMissedInstallments}
- Penalties accrued (lifetime UGX): ${totalPenaltyAmount + totalRepaymentPenalty}
- Loans recovered from GUARANTOR (borrower failed, guarantor wallet debited): ${guarantorDefaultCount} occurrence(s), total UGX ${guarantorDefaultAmount}
- Times debited as guarantor for others: ${timesDebitedAsGuarantor}

OTHER DEBT
- Overdraft: ${overdraftActive ? `ACTIVE, outstanding UGX ${overdraftOutstanding}, frozen=${overdraftFrozen}, days-negative=${overdraftStaleDays}` : 'none'}
- Salary advance outstanding (UGX): ${salaryAdvanceOutstanding}
- Active pure-salary loans: ${activePureSalary}
- Total debt obligations (UGX): ${totalDebtObligations} (debt-to-salary ${debtToSalaryRatio.toFixed(2)}×)

REQUEST
- Requested amount (UGX): ${requested}
- Requested type: ${requested_loan_type || "unspecified"}
- Requested duration (months): ${requested_duration || "unspecified"}

RULES (be fair — approve when reasonable; only deny on clear red flags)
- IMPORTANT: recommended_amount = the user's ENTITLEMENT/LIMIT, NOT the requested amount.
  Always award the maximum the borrower qualifies for, ignoring what they typed in "Requested".
- Hard cap: recommended_amount must NEVER exceed 3× salary (UGX ${maxLimit}).
- Default for clean borrowers = the full ${maxLimit} (3× salary). Do not award less unless a rule below reduces it.
- Subtract outstanding from any new approval.
- "deny" if ANY of: 1+ true defaults; 2+ guarantor recoveries; salary is 0; overdraft frozen; overdraft negative >45 days; 2+ currently-overdue installments; debt-to-salary ratio ≥ 3×; on-time repayment ratio < 30% with ≥3 paid installments.
- 1 guarantor recovery = reduce limit ~50% but still approve/top_up.
- Overdue loans (not yet defaulted) = reduce limit ~40%, do NOT deny.
- Subtract active overdraft outstanding AND outstanding salary advances from any new approval (they share the same paycheck).
- On-time ratio 30-80% with ≥2 paid → reduce 30-60%.
- Lifetime missed installments ≥ 3 → reduce 50%.
- Any historical penalty (loans.penalty_amount or loan_repayments.penalty_applied > 0) → reduce 20%.
- Times debited as guarantor for others ≥ 1 → reduce 15% (signals risky circle).
- Active pure-salary loan → force "top_up" never "approve" (salary already pledged).
- Clean history with completed loans = ALWAYS award the full ${maxLimit} cap.
- Active loan + clean repayments → "top_up" (cap minus outstanding).
- New employee (<2 months) → cap at 1.5× salary.
- No history but tenure ≥ 2 months → award 2× to 3× salary (lean generous).
- Choose recommended_loan_type: "quick" (≤1 month, weekly) or "long_term" (>1 month).

Return only JSON via the tool call.`;

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a credit underwriter. Always call the provided tool." },
              { role: "user", content: prompt },
            ],
            tools: [{
              type: "function",
              function: {
                name: "submit_evaluation",
                description: "Submit the loan underwriting verdict",
                parameters: {
                  type: "object",
                  properties: {
                    decision: { type: "string", enum: ["approve", "top_up", "deny"] },
                    recommended_amount: { type: "number" },
                    recommended_loan_type: { type: "string", enum: ["quick", "long_term"] },
                    recommended_duration_months: { type: "integer", minimum: 1, maximum: 6 },
                    risk_score: { type: "integer", minimum: 0, maximum: 100 },
                    factors: { type: "array", items: { type: "string" }, maxItems: 5 },
                    summary: { type: "string" },
                  },
                  required: ["decision", "recommended_amount", "recommended_loan_type", "recommended_duration_months", "risk_score", "factors", "summary"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "submit_evaluation" } },
          }),
        });

        if (aiResp.ok) {
          const aj = await aiResp.json();
          const tc = aj.choices?.[0]?.message?.tool_calls?.[0];
          if (tc?.function?.arguments) {
            const args = JSON.parse(tc.function.arguments);
            decision = args.decision;
            recommendedAmount = Math.min(Number(args.recommended_amount || 0), maxLimit);
            recommendedType = args.recommended_loan_type;
            recommendedDuration = args.recommended_duration_months;
            riskScore = args.risk_score;
            factors = [args.summary, ...(args.factors || [])].filter(Boolean).slice(0, 6);
          }
        } else {
          console.error("AI gateway error", aiResp.status, await aiResp.text());
        }
      } catch (e) {
        console.error("AI call failed:", e);
      }
    }

    // Enforce hard cap
    recommendedAmount = Math.min(recommendedAmount, maxLimit);
    if (decision === "deny") recommendedAmount = 0;

    // Persist report
    const { data: rep, error: repErr } = await supabase
      .from("loan_evaluations")
      .insert({
        employee_email,
        employee_name: emp.name,
        salary,
        max_limit: maxLimit,
        recommended_amount: recommendedAmount,
        recommended_loan_type: recommendedType,
        recommended_duration_months: recommendedDuration,
        decision,
        risk_score: riskScore,
        factors,
        history_summary: {
          completed_loans: completed,
          defaulted_loans: defaulted,
          active_loans: active.length,
          outstanding,
          tenure_months: tenureMonths,
          wallet_balance: walletBalance,
          repayments_6mo_count: repayCount,
          repayments_6mo_total: repayTotal,
          guarantor_default_count: guarantorDefaultCount,
          guarantor_default_amount: guarantorDefaultAmount,
        },
        fee_amount: FEE,
      })
      .select()
      .single();

    if (repErr) {
      return new Response(JSON.stringify({ ok: false, error: repErr.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, report: rep }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("loan-evaluation error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});