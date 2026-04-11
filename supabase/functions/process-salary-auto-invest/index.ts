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
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all enabled auto-invest configs
    const { data: configs, error: cfgErr } = await supabase
      .from("salary_auto_invest")
      .select("*")
      .eq("is_enabled", true);

    if (cfgErr) throw cfgErr;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let processed = 0;
    let skipped = 0;

    for (const cfg of configs || []) {
      // Prevent double-processing in same month
      if (cfg.last_processed_at) {
        const lastMonth = cfg.last_processed_at.slice(0, 7);
        if (lastMonth === currentMonth) {
          console.log(`⏭️ Already processed ${cfg.user_email} this month`);
          skipped++;
          continue;
        }
      }

      // Get unified user ID
      const { data: unifiedId } = await supabase.rpc("get_unified_user_id", { input_email: cfg.user_email });
      const userId = unifiedId || cfg.user_id;

      // Get current balance
      const { data: balData } = await supabase.rpc("get_user_balance_safe", { user_email: cfg.user_email });
      const available = Number(balData?.[0]?.available_balance) || 0;

      // Calculate investment amount
      let investAmount = 0;
      if (cfg.invest_type === "fixed") {
        investAmount = Number(cfg.fixed_amount) || 0;
      } else if (cfg.invest_type === "percentage") {
        // Get the employee's salary to calculate percentage
        const { data: emp } = await supabase
          .from("employees")
          .select("salary")
          .eq("email", cfg.user_email)
          .maybeSingle();
        const salary = Number(emp?.salary) || 0;
        investAmount = Math.round(salary * (Number(cfg.percentage) / 100));
      }

      // Enforce minimum
      if (investAmount < 100000) {
        console.log(`⚠️ ${cfg.user_email}: computed amount ${investAmount} below minimum 100k, skipping`);
        skipped++;
        continue;
      }

      // Check balance
      if (investAmount > available) {
        console.log(`⚠️ ${cfg.user_email}: insufficient balance (${available} < ${investAmount}), skipping`);
        skipped++;
        continue;
      }

      const investRef = `AUTO-INVEST-${currentMonth}-${cfg.user_email.split("@")[0]}`;

      // Debit wallet (freeze funds)
      const { error: debitErr } = await supabase.from("ledger_entries").insert([{
        user_id: userId,
        entry_type: "WITHDRAWAL",
        amount: -investAmount,
        reference: investRef,
        source_category: "WITHDRAWAL",
        metadata: {
          description: `Auto salary investment - ${investRef}`,
          type: "auto_salary_investment",
          investment_amount: investAmount,
          month: currentMonth,
        },
      }]);

      if (debitErr) {
        console.error(`❌ Failed to debit ${cfg.user_email}:`, debitErr);
        continue;
      }

      // Create investment record
      const startDate = new Date().toISOString().split("T")[0];
      const maturityDate = new Date(Date.now() + 5 * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { error: investErr } = await supabase.from("investments").insert([{
        user_id: cfg.user_id,
        user_email: cfg.user_email,
        employee_name: cfg.employee_name,
        amount: investAmount,
        start_date: startDate,
        maturity_date: maturityDate,
      }]);

      if (investErr) {
        console.error(`❌ Failed to create investment for ${cfg.user_email}:`, investErr);
        continue;
      }

      // Update last processed
      await supabase.from("salary_auto_invest")
        .update({ last_processed_at: now.toISOString() })
        .eq("id", cfg.id);

      // Send notification email
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "investment-confirmation",
            recipientEmail: cfg.user_email,
            idempotencyKey: `auto-invest-${investRef}`,
            templateData: {
              employeeName: cfg.employee_name,
              amount: investAmount,
              interestRate: 25,
              maturityMonths: 5,
              expectedReturn: investAmount * 1.25,
              startDate,
              maturityDate,
              investmentRef: investRef,
            },
          },
        });
      } catch (emailErr) {
        console.warn(`Email failed for ${cfg.user_email}:`, emailErr);
      }

      processed++;
      console.log(`✅ Auto-invested UGX ${investAmount.toLocaleString()} for ${cfg.user_email}`);
    }

    return new Response(JSON.stringify({ ok: true, processed, skipped, total: configs?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in salary auto-invest:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
