import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { application_id, approved_limit, action, rejection_reason, approver_email } = await req.json();
    if (!application_id || !action) {
      return new Response(JSON.stringify({ ok: false, error: "application_id and action required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: app, error: appErr } = await admin
      .from("overdraft_applications")
      .select("*")
      .eq("id", application_id)
      .single();
    if (appErr || !app) {
      return new Response(JSON.stringify({ ok: false, error: "Application not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (app.status !== "pending") {
      return new Response(JSON.stringify({ ok: false, error: `Application already ${app.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reject") {
      await admin.from("overdraft_applications").update({
        status: "rejected",
        rejection_reason: rejection_reason || "No reason provided",
        approved_by: approver_email || "Admin",
        approved_at: new Date().toISOString(),
      }).eq("id", application_id);

      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            to: app.employee_email,
            cc: "operations@greatpearlcoffee.com",
            subject: "Overdraft Application — Not Approved",
            html: `<p>Dear ${app.employee_name || app.employee_email},</p>
              <p>Your overdraft application has not been approved at this time.</p>
              <p><strong>Reason:</strong> ${rejection_reason || "—"}</p>
              <p>You may re-apply once your wallet activity history improves.</p>
              <p>— Great Agro Coffee</p>`,
          },
        });
      } catch (_) { /* ignore */ }

      return new Response(JSON.stringify({ ok: true, status: "rejected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // APPROVE
    const finalLimit = Number(approved_limit ?? app.calculated_limit) || 0;
    if (finalLimit <= 0) {
      return new Response(JSON.stringify({ ok: false, error: "Approved limit must be greater than 0" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const activationFee = Math.round(finalLimit * 0.05);

    // Create the active overdraft account
    const { data: account, error: accErr } = await admin
      .from("overdraft_accounts")
      .insert({
        user_id: app.user_id,
        employee_email: app.employee_email,
        employee_name: app.employee_name,
        approved_limit: finalLimit,
        outstanding_balance: 0,
        activation_fee: activationFee,
        activation_fee_paid: false,
        status: "active",
        approved_by: approver_email || "Admin",
        approved_at: new Date().toISOString(),
        application_id: app.id,
      })
      .select()
      .single();

    if (accErr) {
      return new Response(JSON.stringify({ ok: false, error: accErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Charge the 5% activation fee from wallet (debit ledger entry)
    const { data: feeLedger } = await admin
      .from("ledger_entries")
      .insert({
        user_id: app.user_id,
        entry_type: "WITHDRAWAL",
        amount: -activationFee,
        reference: `OD-FEE-${account.id}`,
        source_category: "OVERDRAFT_FEE",
        metadata: {
          type: "overdraft_fee",
          overdraft_account_id: account.id,
          fee_rate: 0.05,
          approved_limit: finalLimit,
          description: `Overdraft activation fee (5% of UGX ${finalLimit.toLocaleString()})`,
        },
      })
      .select()
      .single();

    await admin.from("overdraft_transactions").insert({
      account_id: account.id,
      user_id: app.user_id,
      transaction_type: "fee",
      amount: activationFee,
      balance_after: 0,
      ledger_entry_id: feeLedger?.id || null,
      reference: "ACTIVATION_FEE",
      metadata: { fee_rate: 0.05 },
    });

    await admin.from("overdraft_accounts").update({ activation_fee_paid: true }).eq("id", account.id);

    await admin.from("overdraft_applications").update({
      status: "approved",
      approved_limit: finalLimit,
      approved_by: approver_email || "Admin",
      approved_at: new Date().toISOString(),
    }).eq("id", application_id);

    // Notify user
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          to: app.employee_email,
          cc: "operations@greatpearlcoffee.com",
          subject: "Overdraft Approved — Great Agro Coffee",
          html: `<p>Dear ${app.employee_name || app.employee_email},</p>
            <p>Good news! Your overdraft has been activated.</p>
            <ul>
              <li><strong>Approved Limit:</strong> UGX ${finalLimit.toLocaleString()}</li>
              <li><strong>Activation Fee (5%):</strong> UGX ${activationFee.toLocaleString()} (deducted from wallet)</li>
              <li><strong>Repayment:</strong> Automatically recovered from any future wallet credit (salary, loyalty, deposits) until cleared.</li>
            </ul>
            <p>You may now draw up to UGX ${finalLimit.toLocaleString()} above your wallet balance.</p>
            <p>— Great Agro Coffee</p>`,
        },
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ ok: true, account, activation_fee: activationFee }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});