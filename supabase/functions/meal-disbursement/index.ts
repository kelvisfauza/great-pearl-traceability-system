import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

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

    const { phone, amount, withdrawCharge, description, receiverName, initiatedBy, initiatedByName } = await req.json();

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
      .from("meal_disbursements")
      .insert({
        receiver_phone: cleanPhone,
        receiver_name: receiverName || null,
        description,
        amount: numAmount,
        withdraw_charge: numCharge,
        total_amount: totalAmount,
        yo_status: "pending",
        initiated_by: initiatedBy,
        initiated_by_name: initiatedByName,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create disbursement record");
    }

    // Initiate Yo Payment
    const narrative = `Meal allowance - ${description} - ${receiverName || cleanPhone}`;
    console.log(`[Meal Disbursement] Sending UGX ${totalAmount} to ${cleanPhone}: ${narrative}`);

    const result = await yoPayout({
      phone: cleanPhone,
      amount: totalAmount,
      narrative,
    });

    // Update record with Yo result
    // Check for -22 (pending authorization) in statusMessage or raw response
    const rawResp = result.rawResponse || '';
    const isPending22 = result.statusMessage?.includes("-22") || rawResp.includes("<StatusCode>-22</StatusCode>");
    
    let yoStatus = "failed";
    if (result.success) {
      yoStatus = "success";
    } else if (isPending22) {
      yoStatus = "pending_approval";
    }

    await supabase
      .from("meal_disbursements")
      .update({
        yo_reference: result.transactionRef || null,
        yo_status: yoStatus,
        yo_raw_response: result.rawResponse || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

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
              templateName: "meal-disbursement-notification",
              recipientEmail: admin.email,
              idempotencyKey: `meal-disbursement-${record.id}-${admin.email}`,
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
        message: yoStatus === "success"
          ? "Meal money sent successfully"
          : yoStatus === "pending_approval"
          ? "Payment sent, pending authorization in Yo dashboard"
          : result.errorMessage || "Payment failed",
        ref: result.transactionRef,
        recordId: record.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Meal disbursement error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
