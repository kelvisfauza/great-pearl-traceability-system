import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return respond(false, { error: "Unauthorized" });

    const supabaseAuth = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user?.email) return respond(false, { error: "Invalid token" });
    const adminEmail = userData.user.email;

    const supabase = createClient(supabaseUrl, svc);

    // Verify admin role
    const { data: adminEmp } = await supabase
      .from("employees").select("name, role").eq("email", adminEmail).maybeSingle();
    const role = (adminEmp?.role || "").toString();
    if (!["Administrator", "Super Admin"].includes(role)) {
      return respond(false, { error: "Only administrators can approve GosentePay payouts" });
    }

    const { instant_withdrawal_id } = await req.json();
    if (!instant_withdrawal_id) return respond(false, { error: "Missing instant_withdrawal_id" });

    // Atomic claim: only proceed if still pending_approval
    const { data: iw, error: fetchErr } = await supabase
      .from("instant_withdrawals")
      .select("*")
      .eq("id", instant_withdrawal_id)
      .maybeSingle();
    if (fetchErr || !iw) return respond(false, { error: "Record not found" });
    if (iw.payout_status !== "pending_approval") {
      return respond(false, { error: "Already processed" });
    }
    if (iw.payment_provider !== "gosente") {
      return respond(false, { error: "Not a GosentePay withdrawal" });
    }

    // Fetch requester email for gosente
    const { data: reqEmp } = await supabase
      .from("employees").select("name, email")
      .or(`auth_user_id.eq.${iw.user_id},id.eq.${iw.user_id}`)
      .maybeSingle();

    // Self-approval guard
    if (reqEmp?.email && reqEmp.email === adminEmail) {
      return respond(false, { error: "You cannot approve your own withdrawal" });
    }

    const ref = iw.payout_ref || `INSTANT-WD-${iw.id}`;
    const amount = Number(iw.amount);
    console.log(`[dispatch-gosente-instant] admin=${adminEmail} amount=${amount} phone=${iw.phone_number} ref=${ref}`);

    const { status, body } = await gosenteWithdraw({
      phone: iw.phone_number,
      amount,
      email: reqEmp?.email || adminEmail,
      reason: `Instant withdrawal ${ref}`.slice(0, 120),
      ref,
    });

    const success = isGosenteSuccess(status, body);
    const inner = body?.data || body;
    const providerRef = body?.gateway_reference || inner?.ref || ref;
    const displayMsg = inner?.message || body?.message || (success ? "Payout accepted" : "Payout rejected");

    if (success) {
      await supabase.from("instant_withdrawals").update({
        payout_status: "success",
        payout_ref: providerRef,
        completed_at: new Date().toISOString(),
      }).eq("id", iw.id).eq("payout_status", "pending_approval");

      // Notify requester
      if (reqEmp?.email) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "instant-withdrawal-confirmation",
              recipientEmail: reqEmp.email,
              idempotencyKey: `iw-gp-approved-${iw.id}`,
              templateData: {
                employeeName: reqEmp.name || "there",
                amount, phone: iw.phone_number, ref: providerRef,
                status: "success",
              },
            },
          });
        } catch (_) { /* non-blocking */ }
      }

      return respond(true, { success: true, ref: providerRef, message: displayMsg });
    }

    // Failure — keep pending_approval so admin can retry, log the error
    console.warn(`[dispatch-gosente-instant] Gosente failure status=${status} body=${JSON.stringify(body)}`);
    return respond(false, { error: `GosentePay payout failed: ${displayMsg}`, providerStatus: status });
  } catch (e) {
    console.error("[dispatch-gosente-instant] Unhandled:", e);
    return respond(false, { error: (e as Error).message || "Unknown error" });
  }
});