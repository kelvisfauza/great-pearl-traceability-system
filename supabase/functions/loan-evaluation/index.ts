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

    // Wallet snapshot
    const walletTypes = ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'];
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

    // Heuristic fallback
    const hasActive = active.length > 0;
    let fallbackDecision: "approve" | "top_up" | "deny" = "approve";
    let fallbackAmount = Math.min(requested || maxLimit, maxLimit);
    const fallbackFactors: string[] = [];

    if (defaulted > 0) {
      fallbackDecision = "deny";
      fallbackAmount = 0;
      fallbackFactors.push(`${defaulted} prior default(s)`);
    } else if (tenureMonths < 2) {
      fallbackAmount = Math.min(fallbackAmount, Math.round(salary * 1.5));
      fallbackFactors.push("New employee (< 2 months) – limit capped at 1.5× salary");
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
    if (completed >= 2) fallbackFactors.push(`Strong repayment history: ${completed} loans completed`);
    if (repayCount >= 4) fallbackFactors.push(`Consistent repayments: ${repayCount} payments in last 6 months`);

    let decision = fallbackDecision;
    let recommendedAmount = fallbackAmount;
    let recommendedType = requested_loan_type || (recommendedAmount > salary ? "long_term" : "quick");
    let recommendedDuration = Number(requested_duration) || (recommendedAmount > salary ? 3 : 1);
    let riskScore = Math.max(5, 80 - defaulted * 30 - guarantorDefaultCount * 35 + completed * 5 - (hasActive ? 10 : 0));
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
- Loans recovered from GUARANTOR (borrower failed, guarantor wallet debited): ${guarantorDefaultCount} occurrence(s), total UGX ${guarantorDefaultAmount}

REQUEST
- Requested amount (UGX): ${requested}
- Requested type: ${requested_loan_type || "unspecified"}
- Requested duration (months): ${requested_duration || "unspecified"}

RULES (be fair — approve when reasonable; only deny on clear red flags)
- Hard cap: recommended_amount must NEVER exceed 3× salary (UGX ${maxLimit}).
- Subtract outstanding from any new approval.
- "deny" ONLY if: 1+ true defaults (is_defaulted), OR 2+ guarantor recoveries, OR salary is 0.
- 1 guarantor recovery = reduce limit by ~50% but still approve/top_up.
- Overdue loans (not yet defaulted) = reduce limit ~40%, do NOT deny.
- Clean history with completed loans = approve generously up to the cap.
- Active loan + clean repayments → "top_up" (cap minus outstanding).
- New employee (<2 months) → cap at 1.5× salary.
- No history at all → approve modestly (1× to 2× salary depending on tenure).
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