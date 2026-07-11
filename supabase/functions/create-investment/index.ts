import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount, employeeName, employeeEmail } = await req.json();
    const amt = Number(amount);
    if (!amt || amt < 100000) {
      return new Response(JSON.stringify({ ok: false, error: "Minimum investment is UGX 100,000" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = (employeeEmail || userData.user.email || "").toLowerCase();

    // Validate balance
    const { data: balanceData } = await admin.rpc("get_user_balance_safe", { user_email: email });
    const availableBalance = Number(balanceData?.[0]?.available_balance) || 0;
    if (amt > availableBalance) {
      return new Response(JSON.stringify({ ok: false, error: `Insufficient balance. Available: UGX ${availableBalance.toLocaleString()}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unified id
    let unifiedId = userData.user.id;
    try {
      const { data: uid } = await admin.rpc("get_unified_user_id", { input_email: email });
      if (uid) unifiedId = uid;
    } catch (_) {}

    const investRef = `INVEST-${Date.now().toString().slice(-8)}`;

    const { error: ledgerErr } = await admin.from("ledger_entries").insert([{
      user_id: unifiedId,
      entry_type: "WITHDRAWAL",
      amount: -amt,
      reference: investRef,
      source_category: "WITHDRAWAL",
      metadata: {
        description: `Investment locked - ${investRef}`,
        type: "investment_lock",
        investment_amount: amt,
        bypass_treasury_check: true,
      },
    }]);
    if (ledgerErr) throw ledgerErr;

    const startDate = new Date().toISOString().split("T")[0];
    const { data: investData, error: investErr } = await admin.from("investments").insert([{
      user_id: userData.user.id,
      user_email: email,
      employee_name: employeeName || email,
      amount: amt,
      start_date: startDate,
    }]).select().maybeSingle();
    if (investErr) throw investErr;

    // Notification (best-effort)
    const maturityDate = investData?.maturity_date || new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "investment-confirmation",
          recipientEmail: email,
          idempotencyKey: `investment-confirm-${investRef}`,
          templateData: {
            employeeName: employeeName || email,
            amount: amt,
            interestRate: 25,
            maturityMonths: 3,
            expectedReturn: amt * 1.25,
            startDate,
            maturityDate,
            investmentRef: investRef,
          },
        },
      });
    } catch (_) {}

    return new Response(JSON.stringify({ ok: true, investmentRef: investRef }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-investment error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});