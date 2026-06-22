import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

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
      if (!Deno.env.get("YO_API_USERNAME") || !Deno.env.get("YO_API_PASSWORD")) {
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

    // Mobile money path: trigger Yo
    const narrative = `Support staff per-diem - ${description} - ${receiverName}`;
    const result = await yoPayout({ phone: cleanPhone, amount: totalAmount, narrative });
    const rawResp = result.rawResponse || "";
    const isPending22 =
      result.statusMessage?.includes("-22") || rawResp.includes("<StatusCode>-22</StatusCode>");

    let yoStatus = "failed";
    let displayMessage = result.errorMessage || "Payment failed";
    if (result.success) {
      yoStatus = "success";
      displayMessage = "Per-diem sent successfully";
    } else if (isPending22) {
      yoStatus = "pending_approval";
      displayMessage = "Sent, pending authorization in Yo dashboard";
    }

    await supabase
      .from("support_staff_per_diem")
      .update({
        yo_reference: result.transactionRef || null,
        yo_status: yoStatus,
        yo_raw_response: rawResp || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    try {
      if (yoStatus === "success" || yoStatus === "pending_approval") {
        const shortRef = (result.transactionRef || record.id).toString().slice(-8).toUpperCase();
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

    return new Response(
      JSON.stringify({
        success: result.success || isPending22,
        status: yoStatus,
        message: displayMessage,
        recordId: record.id,
        ref: result.transactionRef,
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