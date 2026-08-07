import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone as yoNormalize } from "../_shared/yo-payments.ts";
import { gosenteWithdraw, isGosenteSuccess, normalizePhone as gsNormalize } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>) {
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
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return respond(false, { error: "Unauthorized" });
    const authed = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) return respond(false, { error: "Invalid session" });
    const actorEmail = userData.user.email || "";

    const svc = createClient(url, svcKey);

    const body = await req.json().catch(() => ({}));
    const requestId: string = body?.request_id;
    const provider: string = body?.provider; // 'yo' | 'gosente' | 'cash'
    const phoneIn: string = body?.phone || "";
    if (!requestId || !["yo", "gosente", "cash"].includes(provider)) {
      return respond(false, { error: "request_id and a valid provider (yo | gosente | cash) are required" });
    }

    const { data: reqRow } = await svc
      .from("approval_requests").select("*").eq("id", requestId).maybeSingle();
    if (!reqRow) return respond(false, { error: "Request not found" });
    if (String(reqRow.status).toLowerCase() !== "approved") {
      return respond(false, { error: "Request is not fully approved yet" });
    }
    if (["processing", "sent", "cash_disbursed"].includes(String(reqRow.payout_status || ""))) {
      return respond(false, { error: `Payout already ${reqRow.payout_status}` });
    }

    const amount = Number(reqRow.amount) || 0;
    if (amount <= 0) return respond(false, { error: "Invalid amount" });

    const details = (reqRow.details || {}) as Record<string, any>;
    const recipientName: string =
      details.recipient_name || details.employee_name || reqRow.requestedby_name || "Recipient";
    const phone: string = phoneIn || reqRow.disbursement_phone || details.recipient_phone || details.phone || "";

    // Lock the row so a second admin can't double-pay
    const payoutRef = `AR-${String(reqRow.id).slice(0, 8)}-${Date.now()}`;
    const { data: locked } = await svc
      .from("approval_requests")
      .update({
        payout_status: "processing",
        payout_provider: provider,
        payout_phone: phone || null,
        payout_attempted_at: new Date().toISOString(),
        payout_error: null,
        payment_method: provider === "cash" ? "cash" : "mobile_money",
      })
      .eq("id", requestId)
      .or("payout_status.is.null,payout_status.in.(pending,failed)")
      .select("id");
    if (!locked || locked.length === 0) return respond(false, { error: "Payout already in progress" });

    let success = false;
    let finalRef = payoutRef;
    let errorMessage = "";

    if (provider === "cash") {
      success = true;
      finalRef = `CASH-${payoutRef}`;
    } else if (!phone) {
      errorMessage = "Recipient phone number is required for mobile money";
    } else if (provider === "gosente") {
      try {
        const { status, body: gsBody } = await gosenteWithdraw({
          phone: gsNormalize(phone),
          amount,
          email: reqRow.requestedby || actorEmail,
          reason: `${reqRow.type}: ${reqRow.title}`.slice(0, 120),
          ref: payoutRef,
        });
        if (isGosenteSuccess(status, gsBody)) success = true;
        else errorMessage = `GosentePay: ${JSON.stringify(gsBody).slice(0, 200)}`;
      } catch (e: any) {
        errorMessage = `GosentePay error: ${e?.message || e}`;
      }
    } else {
      try {
        const res = await yoPayout({
          phone: yoNormalize(phone),
          amount,
          narrative: `${reqRow.type}: ${reqRow.title}`.slice(0, 120),
          privateRef: payoutRef,
        });
        if (res.success) {
          success = true;
          finalRef = res.transactionRef || payoutRef;
        } else {
          errorMessage = res.errorMessage || res.statusMessage || "Yo Payments rejected the transfer";
        }
      } catch (e: any) {
        errorMessage = `Yo Payments error: ${e?.message || e}`;
      }
    }

    await svc.from("approval_requests").update({
      payout_status: success ? (provider === "cash" ? "cash_disbursed" : "sent") : "failed",
      payout_ref: success ? finalRef : null,
      payout_error: success ? null : errorMessage,
      payout_completed_at: success ? new Date().toISOString() : null,
    }).eq("id", requestId);

    // Notify the recipient by SMS
    if (phone) {
      const msg = success
        ? provider === "cash"
          ? `Dear ${recipientName}, your ${reqRow.type} of UGX ${amount.toLocaleString()} has been approved and prepared as CASH. Please collect it from the office. Ref: ${finalRef}. YEDA Coffee Company Limited.`
          : `Dear ${recipientName}, your ${reqRow.type} of UGX ${amount.toLocaleString()} has been approved and sent to your Mobile Money ${phone} via ${provider === "gosente" ? "GosentePay" : "Yo Payments"}. Ref: ${finalRef}. YEDA Coffee Company Limited.`
        : `Dear ${recipientName}, your approved ${reqRow.type} of UGX ${amount.toLocaleString()} could not be sent (${errorMessage.slice(0, 60)}). Finance will retry shortly. YEDA Coffee Company Limited.`;
      try {
        await svc.functions.invoke("send-sms", {
          body: {
            phone,
            message: msg,
            userName: recipientName,
            messageType: "disbursement",
            requestId,
            triggeredBy: actorEmail,
          },
        });
      } catch (e) {
        console.error("[disburse-approval-request] SMS error:", e);
      }
    }

    if (!success) return respond(false, { error: errorMessage, payout_status: "failed" });
    return respond(true, { payout_status: provider === "cash" ? "cash_disbursed" : "sent", payout_ref: finalRef, phone });
  } catch (e: any) {
    console.error("[disburse-approval-request] error:", e);
    return respond(false, { error: e?.message || String(e) });
  }
});