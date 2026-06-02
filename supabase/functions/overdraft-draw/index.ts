import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_email, amount, reason } = await req.json();
    const drawAmount = Number(amount) || 0;
    if (!user_email || drawAmount <= 0) {
      return new Response(JSON.stringify({ ok: false, error: "user_email and positive amount required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: uidData } = await admin.rpc("get_unified_user_id", { input_email: user_email });
    const userId = uidData as string | null;
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "User not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: account } = await admin
      .from("overdraft_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!account) {
      return new Response(JSON.stringify({ ok: false, error: "No active overdraft account" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const available = Number(account.approved_limit) - Number(account.outstanding_balance);
    if (drawAmount > available) {
      return new Response(JSON.stringify({
        ok: false,
        error: `Draw exceeds available overdraft. Available: UGX ${available.toLocaleString()}`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newOutstanding = Number(account.outstanding_balance) + drawAmount;

    // Credit user's wallet (positive ledger entry, tagged so trigger ignores it)
    const { data: ledger, error: ledgerErr } = await admin
      .from("ledger_entries")
      .insert({
        user_id: userId,
        entry_type: "DEPOSIT",
        amount: drawAmount,
        reference: `OD-DRAW-${account.id}-${Date.now()}`,
        source_category: "OVERDRAFT_DRAW",
        metadata: {
          type: "overdraft_draw",
          overdraft_account_id: account.id,
          reason: reason || null,
          description: `Overdraft draw of UGX ${drawAmount.toLocaleString()}`,
        },
      })
      .select()
      .single();

    if (ledgerErr) {
      return new Response(JSON.stringify({ ok: false, error: ledgerErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("overdraft_accounts").update({
      outstanding_balance: newOutstanding,
      total_drawn: Number(account.total_drawn) + drawAmount,
      last_used_at: new Date().toISOString(),
    }).eq("id", account.id);

    await admin.from("overdraft_transactions").insert({
      account_id: account.id,
      user_id: userId,
      transaction_type: "draw",
      amount: drawAmount,
      balance_after: newOutstanding,
      ledger_entry_id: ledger.id,
      reference: `OD-DRAW-${Date.now()}`,
      metadata: { reason: reason || null },
    });

    // Confirmation email
    try {
      await admin.functions.invoke("send-email-direct", {
        body: {
          to: user_email,
          cc: "operations@greatpearlcoffee.com",
          subject: "Overdraft Draw Confirmation",
          html: `<p>Dear ${account.employee_name || user_email},</p>
            <p>You have drawn UGX ${drawAmount.toLocaleString()} from your overdraft.</p>
            <ul>
              <li><strong>New outstanding overdraft:</strong> UGX ${newOutstanding.toLocaleString()}</li>
              <li><strong>Remaining overdraft available:</strong> UGX ${(Number(account.approved_limit) - newOutstanding).toLocaleString()}</li>
              <li><strong>Reason:</strong> ${reason || "—"}</li>
            </ul>
            <p>This will be auto-recovered from your next incoming wallet credit(s).</p>
            <p>— Great Agro Coffee</p>`,
        },
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      ok: true,
      drawn: drawAmount,
      new_outstanding: newOutstanding,
      remaining_available: Number(account.approved_limit) - newOutstanding,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});