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

    // 2.75% access fee per draw (matches MTN MoMoAdvance)
    const drawFee = Math.round(drawAmount * 0.0275);
    const totalDebt = drawAmount + drawFee; // both principal + fee added to outstanding

    const available = Number(account.approved_limit) - Number(account.outstanding_balance);
    if (totalDebt > available) {
      return new Response(JSON.stringify({
        ok: false,
        error: `Draw + 2.75% access fee exceeds available overdraft. Available: UGX ${available.toLocaleString()}, required: UGX ${totalDebt.toLocaleString()}`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newOutstanding = Number(account.outstanding_balance) + totalDebt;

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

    const { data: feeLedger, error: feeErr } = await admin
      .from("ledger_entries")
      .insert({
        user_id: userId,
        entry_type: "FEE",
        amount: -drawFee,
        reference: `OD-FEE-${account.id}-${Date.now()}`,
        source_category: "OVERDRAFT_FEE",
        metadata: {
          type: "overdraft_access_fee",
          overdraft_account_id: account.id,
          draw_ledger_entry_id: ledger.id,
          draw_amount: drawAmount,
          fee_rate: 0.0275,
          bypass_treasury_check: true,
          description: `2.75% overdraft access fee on UGX ${drawAmount.toLocaleString()} draw`,
        },
      })
      .select()
      .single();

    if (feeErr) {
      return new Response(JSON.stringify({ ok: false, error: feeErr.message }),
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
      metadata: { reason: reason || null, fee_rate: 0.0275, fee_amount: drawFee },
    });

    // Log fee as separate overdraft_transactions row for visibility
    await admin.from("overdraft_transactions").insert({
      account_id: account.id,
      user_id: userId,
      transaction_type: "fee",
      amount: drawFee,
      balance_after: newOutstanding,
      ledger_entry_id: feeLedger.id,
      reference: `OD-FEE-${Date.now()}`,
      metadata: { fee_rate: 0.0275, draw_amount: drawAmount, note: "2.75% access fee on draw, shown on wallet statement and added to outstanding" },
    });

    // Confirmation email (MoMo-style)
    try {
      const dateStr = new Date().toISOString().replace("T", " ").slice(0, 19);
      const txnRef = `OD${Date.now()}`;
      const available = Number(account.approved_limit) - newOutstanding;
      await admin.functions.invoke("send-transactional-email", {
        body: {
          to: user_email,
          cc: "operations@greatpearlcoffee.com",
          subject: "Overdraft used",
          html: `<p>You have used UGX ${drawAmount.toLocaleString()} with access fee UGX ${drawFee.toLocaleString()} on ${dateStr} from OVERDRAFT. Your available OVERDRAFT balance is UGX ${available.toLocaleString()}. Transaction Id: ${txnRef}.</p>
            <p style="color:#666;font-size:12px">Outstanding: UGX ${newOutstanding.toLocaleString()} · Reason: ${reason || "—"} · Auto-recovered from your next incoming credit(s).</p>
            <p>— Great Agro Coffee</p>`,
        },
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      ok: true,
      drawn: drawAmount,
      fee: drawFee,
      new_outstanding: newOutstanding,
      remaining_available: Number(account.approved_limit) - newOutstanding,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});