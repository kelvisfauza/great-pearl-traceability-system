// Records a loan repayment atomically (service role):
//   1. Inserts the LOAN_REPAYMENT ledger debit (wallet takes the hit;
//      overdraft absorbs any shortfall).
//   2. Updates the loan: paid_amount, remaining_balance, status.
//   3. Marks unpaid installments as paid (earliest first).
//
// Only for wallet / cash / bank_deposit methods. Mobile money is handled
// by the gosentepay-callback flow (paired DEPOSIT + LOAN_REPAYMENT on
// Yo SUCCESS). Called from QuickLoans.tsx (early payoff + wallet repay).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { loan_id, amount, method, notes, uses_overdraft, overdraft_portion, upfront_od_interest } = body || {};

    if (!loan_id || !amount || amount <= 0 || !method) {
      return new Response(JSON.stringify({ ok: false, error: "loan_id, amount, method required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (method === "mobile_money") {
      return new Response(JSON.stringify({ ok: false, error: "Mobile money repayments are handled by the MoMo callback flow, not this function." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const allowedMethods = ["wallet", "cash", "bank_deposit"];
    if (!allowedMethods.includes(method)) {
      return new Response(JSON.stringify({ ok: false, error: `Unsupported method: ${method}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 1) Load loan
    const { data: loan, error: loanErr } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loan_id)
      .single();
    if (loanErr || !loan) throw new Error("Loan not found");
    if (loan.status !== "active") {
      return new Response(JSON.stringify({ ok: false, error: `Loan is not active (status: ${loan.status})` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2) Resolve borrower user id
    const { data: emp } = await supabase
      .from("employees")
      .select("auth_user_id")
      .eq("email", loan.employee_email)
      .single();
    const { data: unifiedId } = await supabase
      .rpc("get_unified_user_id", { input_email: loan.employee_email });
    const userId = (unifiedId as string | null) || emp?.auth_user_id;
    if (!userId) throw new Error("Could not resolve borrower account");

    const ts = Date.now();
    const loanShort = String(loan_id).slice(0, 8);
    const txRef = `LOANREPAY-${method.toUpperCase()}-${loanShort}-${ts}`;

    // 3) Insert ledger debit FIRST. If this fails, we abort — no loan update.
    const { error: ledgerErr } = await supabase.from("ledger_entries").insert({
      user_id: userId,
      entry_type: "LOAN_REPAYMENT",
      amount: -Math.abs(amount),
      reference: txRef,
      source_category: "LOAN_REPAYMENT",
      metadata: {
        description: `Loan repayment via ${method === "wallet" ? "wallet" : method === "cash" ? "cash" : "bank deposit"} (UGX ${amount.toLocaleString()})`,
        loan_id,
        method,
        source: "loan_repayment_out",
        notes: notes || null,
        uses_overdraft: uses_overdraft || false,
        overdraft_portion: overdraft_portion || 0,
        bypass_treasury_check: true,
      },
    });
    if (ledgerErr) throw new Error(`Ledger insert failed: ${ledgerErr.message}`);

    // 3b) Optional upfront OD access fee (only relevant for wallet + overdraft)
    if (method === "wallet" && upfront_od_interest && upfront_od_interest > 0) {
      await supabase.from("ledger_entries").insert({
        user_id: userId,
        entry_type: "WITHDRAWAL",
        amount: -Math.abs(upfront_od_interest),
        reference: `${txRef}-ODFEE`,
        source_category: "OVERDRAFT_INTEREST",
        metadata: {
          loan_id,
          type: "overdraft_draw",
          parent_reference: txRef,
          overdraft_portion: overdraft_portion || 0,
          description: `Overdraft access fee 0.5% on UGX ${(overdraft_portion || 0).toLocaleString()}`,
          bypass_treasury_check: true,
        },
      });
    }

    // 4) Compute loan totals
    const newPaidAmount = (Number(loan.paid_amount) || 0) + Number(amount);
    const newRemaining = Math.max(0, (Number(loan.remaining_balance) || Number(loan.total_repayable) || 0) - Number(amount));
    const isFullyPaid = newRemaining <= 0;

    const { error: updErr } = await supabase.from("loans").update({
      paid_amount: newPaidAmount,
      remaining_balance: newRemaining,
      status: isFullyPaid ? "completed" : "active",
      is_defaulted: isFullyPaid ? false : loan.is_defaulted,
      updated_at: new Date().toISOString(),
    }).eq("id", loan_id);
    if (updErr) throw new Error(`Loan update failed: ${updErr.message}`);

    // 5) Mark installments (earliest first)
    const { data: unpaid } = await supabase
      .from("loan_repayments")
      .select("*")
      .eq("loan_id", loan_id)
      .in("status", ["pending", "overdue"])
      .order("due_date", { ascending: true });

    let remaining = Number(amount);
    for (const inst of unpaid || []) {
      if (remaining <= 0) break;
      const owed = Number(inst.amount_due) - (Number(inst.amount_paid) || 0);
      const payable = Math.min(remaining, owed);
      const newPaid = (Number(inst.amount_paid) || 0) + payable;
      const isPaid = newPaid >= Number(inst.amount_due);
      await supabase.from("loan_repayments").update({
        amount_paid: newPaid,
        status: isPaid ? "paid" : inst.status,
        paid_date: isPaid ? new Date().toISOString().split("T")[0] : null,
        payment_reference: txRef,
        deducted_from: method === "wallet" ? "Wallet Repayment" : method === "cash" ? "Cash" : "Bank Deposit",
      }).eq("id", inst.id);
      remaining -= payable;
    }

    return new Response(JSON.stringify({
      ok: true,
      loan_id,
      new_paid_amount: newPaidAmount,
      new_remaining_balance: newRemaining,
      is_fully_paid: isFullyPaid,
      reference: txRef,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("[record-loan-repayment]", e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});