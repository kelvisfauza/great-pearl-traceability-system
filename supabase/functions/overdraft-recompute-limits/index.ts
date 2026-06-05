import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Computes a system-assigned monthly overdraft limit for every active employee.
// Formula: min( avg_90d_monthly_inflow * 0.5 , salary * 0.5 )
// Rounded down to nearest 1,000 UGX; capped at UGX 2,000,000.
const HARD_CAP = 2_000_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Pull active employees
    const { data: employees, error: empErr } = await admin
      .from("employees")
      .select("id, name, email, salary, disabled, employment_type")
      .or("disabled.is.null,disabled.eq.false")
      .limit(5000);
    if (empErr) throw empErr;

    let processed = 0;
    const rows: any[] = [];

    for (const emp of employees || []) {
      if (!emp.email) continue;
      // Resolve unified user_id
      const { data: uidData } = await admin.rpc("get_unified_user_id", { input_email: emp.email });
      const userId = uidData as string | null;

      let totalInflow = 0;
      if (userId) {
        const { data: credits } = await admin
          .from("ledger_entries")
          .select("amount")
          .eq("user_id", userId)
          .gt("amount", 0)
          .gte("created_at", since)
          .limit(1000);
        totalInflow = (credits || []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      }

      const monthlyAvg = totalInflow / 3;
      const fromInflow = Math.floor(monthlyAvg * 0.5);
      const salaryCap = emp.salary ? Math.floor(Number(emp.salary) * 0.5) : Infinity;
      let limit = Math.max(0, Math.min(fromInflow, salaryCap, HARD_CAP));
      // Round down to nearest 1,000
      limit = Math.floor(limit / 1000) * 1000;

      rows.push({
        user_id: userId,
        employee_email: emp.email,
        employee_name: emp.name,
        period,
        computed_limit: limit,
        factors: {
          method: "avg_monthly_inflow_x_0.5",
          last_90d_inflow: totalInflow,
          monthly_average: Math.round(monthlyAvg),
          from_inflow: fromInflow,
          salary: emp.salary || null,
          salary_cap: salaryCap === Infinity ? null : salaryCap,
          hard_cap: HARD_CAP,
        },
        computed_at: new Date().toISOString(),
      });
      processed++;
    }

    // Upsert in batches
    const chunk = 200;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error } = await admin
        .from("overdraft_eligibility")
        .upsert(slice, { onConflict: "employee_email,period" });
      if (error) throw error;
    }

    // Mirror this month's limits into active overdraft accounts (auto_managed only)
    let synced: any = null;
    try {
      const { data } = await admin.rpc("overdraft_sync_active_limits");
      synced = data;
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ ok: true, period, processed, written: rows.length, accounts_synced: synced }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});