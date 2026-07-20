import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { yoPayout, normalizePhone as yoNormalize } from "../_shared/yo-payments.ts";
import { gosenteWithdraw, isGosenteSuccess, normalizePhone as gsNormalize } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return respond(false, { error: "Unauthorized" });

    const authed = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return respond(false, { error: "Invalid token" });
    const adminEmail = userData.user.email!;
    const adminAuthId = userData.user.id;

    const svcClient = createClient(url, svc);
    const { request_id } = await req.json();
    if (!request_id) return respond(false, { error: "Missing request_id" });

    // Call approval RPC (as the admin user for auth.uid())
    const { data: rpcRes, error: rpcErr } = await authed.rpc("approve_budget_withdrawal", { _request_id: request_id });
    if (rpcErr) return respond(false, { error: rpcErr.message });
    const stage = (rpcRes as any)?.stage;
    if (stage !== "completed") {
      return respond(true, { stage, message: "First approval recorded. Awaiting second administrator." });
    }

    // Load full request for payout
    const { data: reqRow } = await svcClient
      .from("budget_withdrawal_requests").select("*").eq("id", request_id).maybeSingle();
    if (!reqRow) return respond(false, { error: "Request missing after approval" });

    const { data: emp } = await svcClient
      .from("employees").select("id, name, email, phone")
      .or(`auth_user_id.eq.${reqRow.employee_id},id.eq.${reqRow.employee_id}`)
      .maybeSingle();

    let payoutRef = `BUDGET-${reqRow.id.slice(0, 8)}-${Date.now()}`;
    let payoutStatus: string = "pending";
    let payoutMessage = "";

    try {
      if (reqRow.payout_mode === "cash") {
        payoutStatus = "cash_disbursed";
        payoutMessage = "Cash disbursed and recorded";
      } else if (reqRow.payout_mode === "personal_wallet") {
        // Credit user personal ledger
        const { data: curBal } = await svcClient.rpc("get_wallet_balance", { p_user_id: reqRow.employee_id }).maybeSingle?.() ?? { data: null } as any;
        // Fallback: compute directly
        const { data: ledger } = await svcClient
          .from("ledger_entries").select("amount").eq("user_id", reqRow.employee_id);
        const prevBal = (ledger || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const newBal = prevBal + Number(reqRow.amount);
        const { error: insErr } = await svcClient.from("ledger_entries").insert({
          user_id: reqRow.employee_id,
          entry_type: "CREDIT",
          amount: Number(reqRow.amount),
          balance_after: newBal,
          source_category: "BUDGET_TRANSFER",
          source_id: reqRow.id,
          metadata: {
            description: `Budget transfer to personal wallet: ${reqRow.reason}`,
            budget_request_id: reqRow.id,
          },
        });
        if (insErr) throw new Error(insErr.message);
        payoutStatus = "transferred_to_wallet";
        payoutMessage = "Funds transferred to personal wallet";
      } else if (reqRow.payout_mode === "mobile_money") {
        if (!reqRow.recipient_phone) throw new Error("Recipient phone required for mobile money");
        if (reqRow.provider === "gosente") {
          const { status, body } = await gosenteWithdraw({
            phone: gsNormalize(reqRow.recipient_phone),
            amount: Number(reqRow.amount),
            email: emp?.email || adminEmail,
            reason: `Budget: ${reqRow.reason}`.slice(0, 120),
            ref: payoutRef,
          });
          if (!isGosenteSuccess(status, body)) throw new Error(`GosentePay failed: ${JSON.stringify(body).slice(0,200)}`);
          payoutStatus = "sent_gosente";
          payoutMessage = "Sent via GosentePay";
        } else {
          const res = await yoPayout({
            phone: yoNormalize(reqRow.recipient_phone),
            amount: Number(reqRow.amount),
            narrative: `Budget: ${reqRow.reason}`.slice(0, 120),
            privateRef: payoutRef,
          });
          if (!res.success) throw new Error(`Yo Payments failed: ${res.errorMessage || res.statusMessage || "unknown"}`);
          payoutStatus = "sent_yo";
          payoutMessage = "Sent via Yo Payments";
        }
      }

      await svcClient.from("budget_withdrawal_requests").update({
        payout_reference: payoutRef,
        payout_status: payoutStatus,
      }).eq("id", request_id);
    } catch (payoutErr: any) {
      console.error("[budget-approve-withdrawal] payout error:", payoutErr);
      // Payout failed — mark request as failed but ledger already debited.
      // Admin must manually refund via reverse RPC (future work) or retry.
      await svcClient.from("budget_withdrawal_requests").update({
        payout_status: "failed",
        rejection_reason: `Payout failure: ${payoutErr.message}`,
      }).eq("id", request_id);
      return respond(false, {
        error: `Payout failed after approval: ${payoutErr.message}. Ledger debit stands; contact finance to reverse.`,
      });
    }

    // Notify requester
    try {
      if (emp?.email) {
        await svcClient.functions.invoke("send-transactional-email", {
          body: {
            recipientEmail: emp.email,
            templateName: "general-notification",
            data: {
              subject: `Budget withdrawal completed — UGX ${Number(reqRow.amount).toLocaleString()}`,
              title: "Budget Withdrawal Completed",
              recipientName: emp.name || "",
              message: `Your budget withdrawal request has been fully approved and disbursed.\n\nAmount: UGX ${Number(reqRow.amount).toLocaleString()}\nReason: ${reqRow.reason}\nMode: ${reqRow.payout_mode}\nReference: ${payoutRef}\nStatus: ${payoutMessage}`,
            },
          },
        });
      }
    } catch (e) {
      console.error("[budget-approve-withdrawal] email error:", e);
    }

    return respond(true, { stage: "completed", payoutStatus, payoutMessage, payoutRef });
  } catch (e: any) {
    console.error("[budget-approve-withdrawal] error:", e);
    return respond(false, { error: e.message || String(e) });
  }
});