import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("YO_API_USERNAME") || !Deno.env.get("YO_API_PASSWORD")) {
      throw new Error("Yo Payments API credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, amount, withdrawCharge, description, receiverName, initiatedBy, initiatedByName, notes, invoiceNumber, providerEmail, paymentProvider } = await req.json();
    const provider: "yo" | "gosente" = paymentProvider === "gosente" ? "gosente" : "yo";

    if (!phone || !amount || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, amount, description" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 12) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numAmount = Number(amount);
    const numCharge = Number(withdrawCharge || 0);
    const totalAmount = numAmount + numCharge;

    if (isNaN(numAmount) || numAmount < 500) {
      return new Response(
        JSON.stringify({ error: "Amount must be at least 500 UGX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create record first
    const { data: record, error: insertError } = await supabase
      .from("service_provider_payments")
      .insert({
        receiver_phone: cleanPhone,
        receiver_name: receiverName || null,
        service_description: description,
        amount: numAmount,
        withdraw_charge: numCharge,
        total_amount: totalAmount,
        yo_status: "pending",
        initiated_by: initiatedBy,
        initiated_by_name: initiatedByName,
        notes: notes || null,
        payment_provider: provider,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create payment record");
    }

    // Initiate payout via selected provider
    const narrative = `Service provider payment - ${description} - ${receiverName || cleanPhone}`;
    console.log(`[Service Provider Payout] (${provider}) Sending UGX ${totalAmount} to ${cleanPhone}: ${narrative}`);

    let yoStatus = "failed";
    let displayMessage = "Payment failed";
    let transactionRef: string | null = null;
    let rawResponseStr: string | null = null;
    let isSuccessful = false;

    if (provider === "gosente") {
      const ref = `SP-GP-${record.id}-${Date.now().toString(36)}`;
      try {
        const { status, body } = await gosenteWithdraw({
          phone: cleanPhone,
          amount: totalAmount,
          email: providerEmail || "system@greatagrocoffee.com",
          reason: narrative.slice(0, 120),
          ref,
        });
        rawResponseStr = JSON.stringify({ status, body });
        const inner = body?.data || body;
        transactionRef = body?.gateway_reference || body?.txRef || inner?.ref || ref;
        if (isGosenteSuccess(status, body)) {
          yoStatus = "success";
          isSuccessful = true;
          displayMessage = "Payment sent successfully via GosentePay";
        } else {
          displayMessage = inner?.message || body?.message || "GosentePay payout failed";
        }
      } catch (e) {
        rawResponseStr = String(e instanceof Error ? e.message : e);
        displayMessage = `GosentePay error: ${rawResponseStr}`;
      }
    } else {
      const result = await yoPayout({
        phone: cleanPhone,
        amount: totalAmount,
        narrative,
      });
      rawResponseStr = result.rawResponse || null;
      transactionRef = result.transactionRef || null;
      const rawResp = result.rawResponse || '';
      const isPending22 = result.statusMessage?.includes("-22") || rawResp.includes("<StatusCode>-22</StatusCode>");
      const isInsufficientBalance = rawResp.includes("<StatusCode>-13</StatusCode>");
      if (result.success) {
        yoStatus = "success";
        isSuccessful = true;
        displayMessage = "Payment sent successfully via Yo Payments";
      } else if (isPending22) {
        yoStatus = "pending_approval";
        displayMessage = "Payment sent, pending authorization in Yo dashboard";
      } else if (isInsufficientBalance) {
        const balanceMsg = rawResp.match(/<StatusMessage>(.*?)<\/StatusMessage>/)?.[1];
        displayMessage = balanceMsg || "Yo Payments account has insufficient balance. Please top up your Yo Payments account.";
      } else {
        displayMessage = result.errorMessage || "Yo payout failed";
      }
    }

    await supabase
      .from("service_provider_payments")
      .update({
        yo_reference: transactionRef,
        yo_status: yoStatus,
        yo_raw_response: rawResponseStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    const result = { success: isSuccessful, transactionRef };

    // Send SMS notification to service provider
    if ((result.success || yoStatus === "pending_approval") && cleanPhone) {
      try {
        const invoiceRef = invoiceNumber ? `Invoice: ${invoiceNumber}. ` : '';
        const shortRef = (result.transactionRef || record.id || '').slice(-8).toUpperCase();
        const smsMessage = `Dear ${receiverName || "Service Provider"}, you have received UGX ${totalAmount.toLocaleString()} from Great Agro Coffee. ${invoiceRef}Ref: ${shortRef}. Thank you for your service.`;
        
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: cleanPhone,
            message: smsMessage,
            userName: receiverName || "Service Provider",
            messageType: "payout_confirmation",
            department: "Finance",
            triggeredBy: initiatedBy,
          },
        });
        console.log(`[Service Provider Payout] SMS sent to ${cleanPhone}`);
      } catch (smsErr) {
        console.error(`[Service Provider Payout] SMS failed:`, smsErr);
      }
    }

    // Send email to service provider if email provided
    if ((result.success || yoStatus === "pending_approval") && providerEmail) {
      try {
        const invoiceRef = invoiceNumber ? `Invoice: ${invoiceNumber}` : '';
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "general-notification",
            recipientEmail: providerEmail,
            idempotencyKey: `sp-payout-provider-${record.id}`,
            templateData: {
              title: "Payment Received from Great Agro Coffee",
              message: `Dear ${receiverName || "Service Provider"},\n\nYou have received a payment of UGX ${totalAmount.toLocaleString()} from Great Agro Coffee.\n\nService: ${description}\n${invoiceRef}\nReference: ${result.transactionRef || record.id}\n\nThank you for your service.`,
            },
          },
        });
        console.log(`[Service Provider Payout] Email sent to ${providerEmail}`);
      } catch (emailErr) {
        console.error(`[Service Provider Payout] Email to provider failed:`, emailErr);
      }
    }

    // Send email notification to all admins
    const { data: admins } = await supabase
      .from("employees")
      .select("email, name")
      .eq("role", "admin")
      .eq("status", "Active");

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "service-provider-payment-notification",
              recipientEmail: admin.email,
              idempotencyKey: `sp-payment-${record.id}-${admin.email}`,
              templateData: {
                adminName: admin.name,
                receiverName: receiverName || "Unknown",
                receiverPhone: cleanPhone,
                amount: numAmount.toLocaleString(),
                withdrawCharge: numCharge.toLocaleString(),
                totalAmount: totalAmount.toLocaleString(),
                description,
                initiatedByName,
                yoStatus,
                yoReference: result.transactionRef || "N/A",
                date: new Date().toLocaleDateString("en-UG", { dateStyle: "full" }),
              },
            },
          });
        } catch (emailErr) {
          console.error(`Email to ${admin.email} failed:`, emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: result.success || yoStatus === "pending_approval",
        status: yoStatus,
        message: displayMessage,
        ref: result.transactionRef,
        recordId: record.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Service provider payout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? (error as Error).message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
