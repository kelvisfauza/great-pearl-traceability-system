import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { transaction_id } = await req.json();
    if (!transaction_id) {
      return new Response(JSON.stringify({ ok: false, error: "transaction_id required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tx } = await admin
      .from("overdraft_transactions")
      .select("*")
      .eq("id", transaction_id)
      .maybeSingle();
    if (!tx || tx.transaction_type !== "recovery") {
      return new Response(JSON.stringify({ ok: false, error: "not a recovery tx" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: account } = await admin
      .from("overdraft_accounts")
      .select("employee_email, employee_name")
      .eq("id", tx.account_id)
      .maybeSingle();
    if (!account?.employee_email) {
      return new Response(JSON.stringify({ ok: false, error: "no email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dateStr = new Date(tx.created_at).toISOString().replace("T", " ").slice(0, 19);
    const amount = Number(tx.amount || 0);
    const remaining = Number(tx.balance_after || 0);
    const txnRef = tx.reference || `OD-REC-${Date.now()}`;

    await admin.functions.invoke("send-transactional-email", {
      body: {
        to: account.employee_email,
        cc: "operations@greatpearlcoffee.com",
        subject: "Overdraft repayment",
        html: `<p>UGX ${amount.toLocaleString()} has been used to repay your OVERDRAFT on ${dateStr}. Transaction Id: ${txnRef}.</p>
          <p style="color:#666;font-size:12px">Remaining outstanding: UGX ${remaining.toLocaleString()}${remaining === 0 ? " — fully cleared. ✅" : ""}.</p>
          <p>— Great Agro Coffee</p>`,
      },
    });

    return new Response(JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});