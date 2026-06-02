import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_email, requested_amount, reason } = await req.json();
    if (!user_email) {
      return new Response(JSON.stringify({ ok: false, error: "user_email required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve unified user id
    const { data: uidData } = await admin.rpc("get_unified_user_id", { input_email: user_email });
    const userId = uidData as string | null;
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "User not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Existing active overdraft?
    const { data: existing } = await admin
      .from("overdraft_accounts")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: false, error: "You already have an active overdraft account" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pending application?
    const { data: pending } = await admin
      .from("overdraft_applications")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) {
      return new Response(JSON.stringify({ ok: false, error: "You already have a pending application" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up employee
    const { data: emp } = await admin
      .from("employees")
      .select("id, name, salary, email")
      .eq("email", user_email)
      .maybeSingle();

    // Compute avg monthly inflow over last 90 days from ledger credits
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: credits } = await admin
      .from("ledger_entries")
      .select("amount, source_category")
      .eq("user_id", userId)
      .gt("amount", 0)
      .gte("created_at", since)
      .limit(1000);

    const totalInflow = (credits || []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    const monthlyAvg = totalInflow / 3;
    const fromInflow = Math.floor(monthlyAvg * 0.5);

    // Cap: never exceed 50% of salary (if known) — keeps it conservative
    const salaryCap = emp?.salary ? Math.floor(Number(emp.salary) * 0.5) : Infinity;
    const calculatedLimit = Math.max(0, Math.min(fromInflow, salaryCap));

    const factors = {
      method: "avg_monthly_inflow_x_0.5",
      last_90d_inflow: totalInflow,
      monthly_average: Math.round(monthlyAvg),
      from_inflow: fromInflow,
      salary: emp?.salary || null,
      salary_cap: salaryCap === Infinity ? null : salaryCap,
      activation_fee_rate: 0.05,
    };

    const { data: app, error: appErr } = await admin
      .from("overdraft_applications")
      .insert({
        user_id: userId,
        employee_email: user_email,
        employee_name: emp?.name || user_email,
        requested_amount: Number(requested_amount) || 0,
        calculated_limit: calculatedLimit,
        factors,
        reason: reason || null,
        status: "pending",
      })
      .select()
      .single();

    if (appErr) {
      return new Response(JSON.stringify({ ok: false, error: appErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Notify admin via email (best-effort)
    try {
      await admin.functions.invoke("send-email-direct", {
        body: {
          to: "Fauzakusa@greatpearlcoffee.com",
          cc: "operations@greatpearlcoffee.com",
          subject: `New Overdraft Application — ${emp?.name || user_email}`,
          html: `
            <h2>New Overdraft Application</h2>
            <p><strong>Employee:</strong> ${emp?.name || user_email} (${user_email})</p>
            <p><strong>Requested:</strong> UGX ${(Number(requested_amount) || 0).toLocaleString()}</p>
            <p><strong>AI-Calculated Limit:</strong> UGX ${calculatedLimit.toLocaleString()}</p>
            <p><strong>90-day wallet inflow:</strong> UGX ${totalInflow.toLocaleString()} (avg UGX ${Math.round(monthlyAvg).toLocaleString()}/mo)</p>
            <p><strong>Reason:</strong> ${reason || "—"}</p>
            <p><strong>Activation fee on approval:</strong> 5% of approved limit</p>
            <p>Review and approve from the Overdraft admin panel.</p>
          `,
        },
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ ok: true, application: app, calculated_limit: calculatedLimit, factors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});