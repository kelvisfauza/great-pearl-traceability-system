import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    const reviewer = userData?.user;
    if (!reviewer) {
      return new Response(JSON.stringify({ ok: false, error: "Not authenticated" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { submissionId, action, rejectionReason, withdrawCharge, amountOverride } = await req.json();
    if (!submissionId || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid request" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: submission, error: subErr } = await supabase
      .from("provider_submission_requests")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (subErr || !submission) {
      return new Response(JSON.stringify({ ok: false, error: "Submission not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (submission.status !== "pending") {
      return new Response(
        JSON.stringify({ ok: false, error: `Already ${submission.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get reviewer name
    const { data: emp } = await supabase
      .from("employees")
      .select("name")
      .eq("email", reviewer.email)
      .maybeSingle();
    const reviewerName = emp?.name || reviewer.email || "Admin";

    if (action === "reject") {
      await supabase
        .from("provider_submission_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || null,
          reviewed_by: reviewer.id,
          reviewed_by_name: reviewerName,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      return new Response(JSON.stringify({ ok: true, status: "rejected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // APPROVE: insert into target table & trigger Yo payout
    const cleanPhone = normalizePhone(submission.phone);
    const originalAmount = Number(submission.amount);
    const overridden =
      amountOverride !== undefined &&
      amountOverride !== null &&
      Number(amountOverride) > 0 &&
      Number(amountOverride) !== originalAmount;
    const numAmount = overridden ? Number(amountOverride) : originalAmount;
    const numCharge = Number(withdrawCharge || 0);
    const totalAmount = numAmount + numCharge;

    if (!Number.isFinite(numAmount) || numAmount < 500) {
      return new Response(
        JSON.stringify({ ok: false, error: "Amount must be at least 500 UGX" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetTable =
      submission.request_type === "meal_plan" ? "meal_disbursements" : "service_provider_payments";

    const baseRow: Record<string, unknown> = {
      receiver_phone: cleanPhone,
      receiver_name: submission.provider_name,
      amount: numAmount,
      withdraw_charge: numCharge,
      total_amount: totalAmount,
      yo_status: "pending",
      initiated_by: reviewer.id,
      initiated_by_name: overridden
        ? `${reviewerName} (self-submitted, amount adjusted from ${originalAmount.toLocaleString()})`
        : `${reviewerName} (self-submitted)`,
    };
    if (targetTable === "service_provider_payments") {
      baseRow.service_description = submission.description;
      baseRow.notes = submission.invoice_number
        ? `Invoice: ${submission.invoice_number}`
        : null;
    } else {
      baseRow.description = submission.description;
    }

    const { data: record, error: insertErr } = await supabase
      .from(targetTable)
      .insert(baseRow)
      .select()
      .single();

    if (insertErr || !record) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to create payout record" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger Yo Payout
    const narrative =
      submission.request_type === "meal_plan"
        ? `Meal plan payment - ${submission.description} - ${submission.provider_name}`
        : `Service provider payment - ${submission.description} - ${submission.provider_name}`;

    const result = await yoPayout({ phone: cleanPhone, amount: totalAmount, narrative });

    const rawResp = result.rawResponse || "";
    const isPending22 =
      result.statusMessage?.includes("-22") || rawResp.includes("<StatusCode>-22</StatusCode>");

    let yoStatus = "failed";
    let displayMessage = result.errorMessage || "Payment failed";
    if (result.success) {
      yoStatus = "success";
      displayMessage = "Payment sent successfully";
    } else if (isPending22) {
      yoStatus = "pending_approval";
      displayMessage = "Payment sent, pending authorization in Yo dashboard";
    }

    await supabase
      .from(targetTable)
      .update({
        yo_reference: result.transactionRef || null,
        yo_status: yoStatus,
        yo_raw_response: rawResp || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    await supabase
      .from("provider_submission_requests")
      .update({
        status: yoStatus === "failed" ? "failed" : "paid",
        reviewed_by: reviewer.id,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
        payout_record_id: record.id,
        payout_status: yoStatus,
        payout_message: displayMessage,
      })
      .eq("id", submissionId);

    // Notify provider via SMS
    try {
      if (yoStatus === "success" || yoStatus === "pending_approval") {
        const shortRef = (result.transactionRef || record.id).slice(-8).toUpperCase();
        const smsMessage = `Dear ${submission.provider_name}, UGX ${totalAmount.toLocaleString()} has been sent from Great Agro Coffee. Ref: ${shortRef}. Thank you.`;
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: cleanPhone,
            message: smsMessage,
            userName: submission.provider_name,
            messageType: "payout_confirmation",
            department: "Finance",
            triggeredBy: reviewer.id,
          },
        });
      }
    } catch (e) {
      console.error("SMS notify error:", e);
    }

    // Notify provider via Email
    try {
      if ((yoStatus === "success" || yoStatus === "pending_approval") && submission.email) {
        const shortRef = (result.transactionRef || record.id).slice(-8).toUpperCase();
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "payment-receipt",
            recipientEmail: submission.email,
            idempotencyKey: `provider-submission-${submissionId}`,
            templateData: {
              recipientName: submission.provider_name,
              reference: shortRef,
              description: submission.description,
              invoiceNumber: submission.invoice_number || undefined,
              amount: `UGX ${numAmount.toLocaleString()}`,
              charges: numCharge > 0 ? `UGX ${numCharge.toLocaleString()}` : undefined,
              total: `UGX ${totalAmount.toLocaleString()}`,
              paymentMethod: "Mobile Money (Yo Payments)",
              transactionId: result.transactionRef || record.id,
              processedBy: reviewerName,
            },
          },
        });
      }
    } catch (e) {
      console.error("Email notify error:", e);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: yoStatus,
        message: displayMessage,
        recordId: record.id,
        ref: result.transactionRef,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-provider-submission error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});