import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employee_email } = await req.json();
    if (!employee_email) {
      return new Response(JSON.stringify({ error: "employee_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get employee data
    const { data: emp } = await supabase
      .from("employees")
      .select("id, name, email, salary, auth_user_id, join_date")
      .eq("email", employee_email)
      .single();

    if (!emp) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get unified user ID
    const { data: unifiedId } = await supabase.rpc("get_unified_user_id", { input_email: employee_email });
    const userId = unifiedId || emp.auth_user_id;

    // 3. Fetch wallet ledger entries (last 6 months for AI analysis)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: ledgerEntries } = await supabase
      .from("ledger_entries")
      .select("entry_type, amount, created_at")
      .eq("user_id", userId)
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    // 3b. Fetch ALL-TIME wallet balance (same logic as dashboard)
    const walletEntryTypes = ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'];
    const { data: allWalletEntries } = await supabase
      .from("ledger_entries")
      .select("entry_type, amount")
      .eq("user_id", userId)
      .in("entry_type", walletEntryTypes);

    // 4. Fetch loan history
    const { data: loanHistory } = await supabase
      .from("loans")
      .select("loan_amount, remaining_balance, status, duration_months, created_at")
      .eq("employee_email", employee_email)
      .order("created_at", { ascending: false });

    // 5. Fetch attendance (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: attendance } = await supabase
      .from("attendance")
      .select("status, date")
      .eq("employee_email", employee_email)
      .gte("date", threeMonthsAgo.toISOString().split("T")[0]);

    // Build summary for AI
    const entries = ledgerEntries || [];
    const totalEarnings = entries
      .filter((e: any) => Number(e.amount) > 0)
      .reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalWithdrawals = Math.abs(
      entries
        .filter((e: any) => Number(e.amount) < 0)
        .reduce((s: number, e: any) => s + Number(e.amount), 0)
    );

    // Monthly earning breakdown
    const monthlyEarnings: Record<string, number> = {};
    entries.forEach((e: any) => {
      if (Number(e.amount) > 0) {
        const month = e.created_at.substring(0, 7);
        monthlyEarnings[month] = (monthlyEarnings[month] || 0) + Number(e.amount);
      }
    });

    const loans = loanHistory || [];
    const completedLoans = loans.filter((l: any) => l.status === "completed").length;
    const defaultedLoans = loans.filter((l: any) => l.status === "defaulted").length;
    const activeLoans = loans.filter((l: any) => ["active", "pending_guarantor", "pending_admin"].includes(l.status));
    const outstandingBalance = activeLoans.reduce((s: number, l: any) => s + (l.remaining_balance || l.loan_amount || 0), 0);

    const att = attendance || [];
    const presentDays = att.filter((a: any) => a.status === "present").length;
    const totalAttDays = att.length;
    const attendanceRate = totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 0;

    const tenureMonths = emp.join_date
      ? Math.max(1, Math.round((Date.now() - new Date(emp.join_date).getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
      : 1;

    const prompt = `You are a credit risk scoring engine for an employee loan system. Analyze the following employee data and return ONLY a valid JSON object with exactly these fields:
- "risk_score": integer 0-100 (100 = lowest risk, best borrower)
- "loan_limit": integer in UGX (the maximum amount this employee should be allowed to borrow)
- "factors": array of short strings (max 4) explaining key factors

Employee Profile:
- Monthly Salary: UGX ${emp.salary?.toLocaleString() || 0}
- Tenure: ${tenureMonths} months
- Attendance Rate (3mo): ${attendanceRate}%

Wallet Activity (6 months):
- Total Earnings: UGX ${totalEarnings.toLocaleString()}
- Total Withdrawals: UGX ${totalWithdrawals.toLocaleString()}
- Monthly Earnings: ${JSON.stringify(monthlyEarnings)}

Loan History:
- Completed Loans: ${completedLoans}
- Defaulted Loans: ${defaultedLoans}
- Active/Pending Loans: ${activeLoans.length}
- Outstanding Balance: UGX ${outstandingBalance.toLocaleString()}

Rules:
- Loan limit MUST NOT exceed 2x monthly salary (UGX ${((emp.salary || 0) * 2).toLocaleString()})
- Subtract outstanding balance from the limit
- Higher earnings consistency = higher limit
- Defaults dramatically reduce the limit
- New employees (< 3 months) get max 1x salary
- Poor attendance (< 70%) reduces limit by 50%

Return ONLY the JSON object, no explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a credit risk scoring engine. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Insufficient credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      // Fallback: simple salary-based calculation
      const fallbackLimit = Math.max(0, (emp.salary || 0) * 2 - outstandingBalance);
      parsed = {
        risk_score: 50,
        loan_limit: fallbackLimit,
        factors: ["AI analysis unavailable, using salary-based default"],
      };
    }

    return new Response(
      JSON.stringify({
        risk_score: parsed.risk_score,
        loan_limit: parsed.loan_limit,
        factors: parsed.factors,
        salary: emp.salary || 0,
        outstanding: outstandingBalance,
        active_loans: activeLoans.length,
        wallet_balance: (allWalletEntries || []).reduce((s: number, e: any) => s + Number(e.amount), 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-loan-limit:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? (error as Error).message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
