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
      .select("loan_amount, remaining_balance, status, duration_months, paid_amount, total_repayable, created_at")
      .eq("employee_email", employee_email)
      .order("created_at", { ascending: false });
    const loans = loanHistory || [];
    const completed = loans.filter((l: any) => l.status === "completed").length;
    const defaulted = loans.filter((l: any) => ["defaulted", "overdue"].includes(l.status)).length;
    const active = loans.filter((l: any) => ["active", "pending_guarantor", "pending_admin"].includes(l.status));
    const outstanding = active.reduce((s: number, l: any) => s + Number(l.remaining_balance || l.loan_amount || 0), 0);

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

    if (defaulted > 0) { fallbackDecision = "deny"; fallbackAmount = 0; fallbackFactors.push(`${defaulted} prior default(s)`); }
    else if (tenureMonths < 3) { fallbackAmount = Math.min(fallbackAmount, salary); fallbackFactors.push("New employee (< 3 months) – limit capped at 1× salary"); }
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
    let riskScore = Math.max(10, 80 - defaulted * 30 + completed * 5 - (hasActive ? 10 : 0));
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

REQUEST
- Requested amount (UGX): ${requested}
- Requested type: ${requested_loan_type || "unspecified"}
- Requested duration (months): ${requested_duration || "unspecified"}

RULES
- Hard cap: recommended_amount must NEVER exceed 3× salary (UGX ${maxLimit}).
- Subtract outstanding from any new approval.
- If any defaulted/overdue loans → decision must be "deny".
- If active loan exists and clean repayments → decision should be "top_up".
- New employee (<3 months) → cap at 1× salary.
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