import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      phone,
      amount,
      withdrawCharge,
      description,
      receiverName,
      nationalId,
      paymentMethod,
      paymentProvider,
      initiatedBy,
      initiatedByName,
      notes,
    } = await req.json();

    if (!receiverName || !amount || !description) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: receiverName, amount, description" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const method = paymentMethod === "cash" ? "cash" : "mobile_money";
    const provider: "yo" | "gosente" = paymentProvider === "gosente" ? "gosente" : "yo";
    const numAmount = Number(amount);
    const numCharge = Number(withdrawCharge || 0);
    const totalAmount = numAmount + numCharge;

    if (!Number.isFinite(numAmount) || numAmount < 500) {
      return new Response(
        JSON.stringify({ success: false, error: "Amount must be at least 500 UGX" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let cleanPhone = "";
    if (method === "mobile_money") {
      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Phone number required for mobile money" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      cleanPhone = normalizePhone(phone);
      if (cleanPhone.length < 12) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid phone number format" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (provider === "yo" && (!Deno.env.get("YO_API_USERNAME") || !Deno.env.get("YO_API_PASSWORD"))) {
        return new Response(
          JSON.stringify({ success: false, error: "Yo Payments API credentials not configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      // For cash, phone is optional; record whatever is provided.
      cleanPhone = phone ? normalizePhone(phone) : "";
    }

    const { data: record, error: insertError } = await supabase
      .from("support_staff_per_diem")
      .insert({
        receiver_phone: cleanPhone || "N/A",
        receiver_name: receiverName,
        national_id: nationalId || null,
        description,
        amount: numAmount,
        withdraw_charge: numCharge,
        total_amount: totalAmount,
        payment_method: method,
        yo_status: method === "cash" ? "paid" : "pending",
        initiated_by: initiatedBy || "system",
        initiated_by_name: initiatedByName || "System",
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError || !record) {
      console.error("[support-staff-perdiem] insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create per-diem record" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cash path: nothing to send via Yo; mark as paid and notify.
    if (method === "cash") {
      try {
        if (cleanPhone) {
          const shortRef = String(record.id).slice(-8).toUpperCase();
          await supabase.functions.invoke("send-sms", {
            body: {
              phone: cleanPhone,
              message: `Dear ${receiverName}, UGX ${totalAmount.toLocaleString()} per-diem will be paid in CASH by Great Agro Coffee. Ref: ${shortRef}. Please collect from Finance.`,
              userName: receiverName,
              messageType: "perdiem_cash",
            },
          });
        }
      } catch (_) { /* ignore */ }

      // Email notification (cash)
      try {
        const recipientEmail = await lookupEmail(supabase, { nationalId, phone: cleanPhone, name: receiverName });
        if (recipientEmail) {
          const shortRef = String(record.id).slice(-8).toUpperCase();
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "payment-receipt",
              recipientEmail,
              idempotencyKey: `support-perdiem-cash-${record.id}`,
              templateData: {
                recipientName: receiverName,
                reference: shortRef,
                description: `Support staff per-diem: ${description}`,
                amount: `UGX ${numAmount.toLocaleString()}`,
                charges: numCharge > 0 ? `UGX ${numCharge.toLocaleString()}` : undefined,
                total: `UGX ${totalAmount.toLocaleString()}`,
                paymentMethod: "Cash (collect from Finance)",
                transactionId: record.id,
                processedBy: initiatedByName || "Admin",
              },
            },
          });
        }
      } catch (e) { console.error("[support-staff-perdiem] email (cash) error:", e); }

      return new Response(
        JSON.stringify({
          success: true,
          status: "paid",
          message: "Cash per-diem recorded. Finance will pay out.",
          recordId: record.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mobile money path: trigger the selected gateway
    const narrative = `Support staff per-diem - ${description} - ${receiverName}`;
    let yoStatus = "failed";
    let displayMessage = "Payment failed";
    let rawResp = "";
    let payoutRef: string | null = null;

    if (provider === "gosente") {
      const ref = `SPD-GP-${record.id}-${Date.now().toString(36)}`;
      try {
        const { status, body } = await gosenteWithdraw({
          phone: cleanPhone,
          amount: totalAmount,
          email: "system@greatagrocoffee.com",
          reason: narrative.slice(0, 120),
          ref,
        });
        rawResp = JSON.stringify({ status, body });
        const inner = body?.data || body;
        payoutRef = body?.gateway_reference || inner?.ref || ref;
        if (isGosenteSuccess(status, body)) {
          yoStatus = "success";
          displayMessage = "Per-diem sent successfully via GosentePay";
        } else {
          displayMessage = inner?.message || body?.message || "GosentePay payout failed";
          if (String(inner?.status ?? "").toLowerCase() === "gatewayerror" || status === 400) {
            displayMessage = "GosentePay's mobile money gateway rejected this payout (check the recipient number is a valid, active MTN/Airtel wallet, or retry via Yo Payments).";
          }
        }
      } catch (e) {
        rawResp = String(e instanceof Error ? e.message : e);
        displayMessage = `GosentePay error: ${rawResp}`;
      }
    } else {
      const result = await yoPayout({ phone: cleanPhone, amount: totalAmount, narrative });
      rawResp = result.rawResponse || "";
      payoutRef = result.transactionRef || null;
      const isPending22 =
        result.statusMessage?.includes("-22") || rawResp.includes("<StatusCode>-22</StatusCode>");
      displayMessage = result.errorMessage || "Payment failed";
      if (result.success) {
        yoStatus = "success";
        displayMessage = "Per-diem sent successfully";
      } else if (isPending22) {
        yoStatus = "pending_approval";
        displayMessage = "Sent, pending authorization in Yo dashboard";
      }
    }

    await supabase
      .from("support_staff_per_diem")
      .update({
        yo_reference: payoutRef,
        yo_status: yoStatus,
        yo_raw_response: rawResp || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    try {
      if (yoStatus === "success" || yoStatus === "pending_approval") {
        const shortRef = (payoutRef || record.id).toString().slice(-8).toUpperCase();
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: cleanPhone,
            message: `Dear ${receiverName}, UGX ${totalAmount.toLocaleString()} per-diem has been sent from Great Agro Coffee. Ref: ${shortRef}. Thank you.`,
            userName: receiverName,
            messageType: "perdiem_payout",
          },
        });
      }
    } catch (_) { /* ignore */ }

    // Email notification (mobile money)
    try {
      if (yoStatus === "success" || yoStatus === "pending_approval") {
        const recipientEmail = await lookupEmail(supabase, { nationalId, phone: cleanPhone, name: receiverName });
        if (recipientEmail) {
          const shortRef = (payoutRef || record.id).toString().slice(-8).toUpperCase();
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "payment-receipt",
              recipientEmail,
              idempotencyKey: `support-perdiem-momo-${record.id}`,
              templateData: {
                recipientName: receiverName,
                reference: shortRef,
                description: `Support staff per-diem: ${description}`,
                amount: `UGX ${numAmount.toLocaleString()}`,
                charges: numCharge > 0 ? `UGX ${numCharge.toLocaleString()}` : undefined,
                total: `UGX ${totalAmount.toLocaleString()}`,
                paymentMethod: provider === "gosente" ? "Mobile Money (GosentePay)" : "Mobile Money (Yo Payments)",
                transactionId: payoutRef || record.id,
                processedBy: initiatedByName || "Admin",
              },
            },
          });
        }
      }
    } catch (e) { console.error("[support-staff-perdiem] email (momo) error:", e); }

    return new Response(
      JSON.stringify({
        success: yoStatus === "success" || yoStatus === "pending_approval",
        status: yoStatus,
        message: displayMessage,
        recordId: record.id,
        ref: payoutRef,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("support-staff-perdiem error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Try to resolve an email for the per-diem recipient from the employees table.
// Order: national_id -> phone -> exact name match.
async function lookupEmail(
  supabase: any,
  { nationalId, phone, name }: { nationalId?: string | null; phone?: string | null; name?: string | null },
): Promise<string | null> {
  try {
    if (nationalId) {
      const { data } = await supabase
        .from("employees")
        .select("email")
        .eq("national_id", nationalId)
        .not("email", "is", null)
        .limit(1)
        .maybeSingle();
      if (data?.email) return data.email;
    }
    if (phone) {
      const tail = phone.slice(-9);
      const { data } = await supabase
        .from("employees")
        .select("email, phone")
        .ilike("phone", `%${tail}%`)
        .not("email", "is", null)
        .limit(1)
        .maybeSingle();
      if (data?.email) return data.email;
    }
    if (name) {
      const { data } = await supabase
        .from("employees")
        .select("email")
        .ilike("name", name)
        .not("email", "is", null)
        .limit(1)
        .maybeSingle();
      if (data?.email) return data.email;
    }
  } catch (e) {
    console.error("[support-staff-perdiem] lookupEmail error:", e);
  }
  return null;
}