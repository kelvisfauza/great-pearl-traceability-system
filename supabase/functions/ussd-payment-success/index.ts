import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    console.log(`[USSD Payment Success] Raw body: ${body}`);

    // Parse the IPN payload - try JSON, then URL-encoded, then XML
    let externalRef = "";
    let amount = 0;
    let phone = "";
    let transactionId = "";
    let narrative = "";
    let selectedProduct = "";
    let selectedServiceKey = "";

    const contentType = req.headers.get("content-type") || "";

    // Try JSON first
    try {
      const json = JSON.parse(body);
      externalRef = json.payment_external_reference || json.external_ref || json.external_reference || json.ExternalReference || "";
      amount = Number(json.amount || json.Amount || 0);
      phone = json.msisdn || json.phone || json.anumbermsisdn || "";
      transactionId = json.transaction_id || json.TransactionId || json.yo_reference || "";
      narrative = json.narrative || json.Narrative || "";
      // Parse selected service info from narrative if it's JSON
      try {
        const narrativeJson = JSON.parse(narrative);
        selectedProduct = narrativeJson.selected_product || "";
        selectedServiceKey = narrativeJson.selected_service_key || "";
      } catch { /* not JSON narrative */ }
    } catch {
      // Try URL-encoded
      if (contentType.includes("application/x-www-form-urlencoded") || body.includes("=")) {
        const params = new URLSearchParams(body);
        externalRef = params.get("payment_external_reference") || params.get("external_ref") || params.get("external_reference") || "";
        amount = Number(params.get("amount") || params.get("Amount") || 0);
        phone = params.get("msisdn") || params.get("phone") || params.get("anumbermsisdn") || "";
        transactionId = params.get("transaction_id") || params.get("TransactionId") || "";
        narrative = params.get("narrative") || params.get("Narrative") || "";
      }
    }

    console.log(`[USSD Payment Success] ref: ${externalRef}, amount: ${amount}, phone: ${phone}, txId: ${transactionId}`);

    if (!externalRef) {
      console.error("[USSD Payment Success] No external reference found in payload");
      return new Response(JSON.stringify({ status: "error", message: "No reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if this is a milling payment or other service
    const isMillingPayment = externalRef.startsWith("USSD-MILL-");
    const isServicePayment = externalRef.startsWith("USSD-SVC-");

    if (isMillingPayment) {
      await processMillingPayment(supabase, { externalRef, amount, phone, transactionId });
    } else if (isServicePayment) {
      await processServicePayment(supabase, {
        externalRef, amount, phone, transactionId,
        selectedProduct, selectedServiceKey, narrative,
      });
    } else {
      console.log(`[USSD Payment Success] Unknown reference format: ${externalRef}`);
    }

    // Log all USSD payments
    await supabase.from("ussd_payment_logs").insert({
      reference: externalRef,
      phone,
      amount,
      transaction_id: transactionId,
      status: "success",
      narrative,
      raw_payload: body,
    });

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[USSD Payment Success] Error:", error);
    return new Response(JSON.stringify({ status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processMillingPayment(
  supabase: any,
  params: { externalRef: string; amount: number; phone: string; transactionId: string }
) {
  const { externalRef, amount, phone, transactionId } = params;
  const cleanPhone = phone.replace(/\D/g, "");
  const normalizedPhone = cleanPhone.startsWith("0") ? "256" + cleanPhone.slice(1) :
    cleanPhone.startsWith("256") ? cleanPhone : "256" + cleanPhone;

  // Find customer by phone
  const { data: customer } = await supabase
    .from("milling_customers")
    .select("id, full_name, current_balance")
    .or(`phone.eq.${normalizedPhone},phone.eq.0${normalizedPhone.slice(3)}`)
    .eq("status", "active")
    .maybeSingle();

  if (!customer) {
    console.error(`[USSD Payment Success] No customer found for phone: ${phone}`);
    return;
  }

  const previousBalance = customer.current_balance || 0;
  const newBalance = Math.max(0, previousBalance - amount);

  // Record the milling momo transaction
  await supabase.from("milling_momo_transactions").insert({
    reference: externalRef,
    yo_reference: transactionId || null,
    customer_id: customer.id,
    customer_name: customer.full_name,
    phone: normalizedPhone,
    amount,
    status: "completed",
    initiated_by: "USSD",
    completed_at: new Date().toISOString(),
  });

  // Record cash transaction
  await supabase.from("milling_cash_transactions").insert({
    customer_id: customer.id,
    customer_name: customer.full_name,
    amount_paid: amount,
    previous_balance: previousBalance,
    new_balance: newBalance,
    payment_method: "USSD Mobile Money",
    notes: `USSD payment - Ref: ${externalRef}${transactionId ? `, TxID: ${transactionId}` : ""}`,
    date: new Date().toISOString().split("T")[0],
    created_by: "USSD",
  });

  // Update customer balance
  await supabase
    .from("milling_customers")
    .update({ current_balance: newBalance })
    .eq("id", customer.id);

  console.log(`[USSD Payment Success] ✅ Milling: ${customer.full_name} paid UGX ${amount}. Balance: ${previousBalance} → ${newBalance}`);
}

async function processServicePayment(
  supabase: any,
  params: {
    externalRef: string; amount: number; phone: string;
    transactionId: string; selectedProduct: string;
    selectedServiceKey: string; narrative: string;
  }
) {
  const { externalRef, amount, phone, transactionId, selectedProduct, selectedServiceKey, narrative } = params;

  // Resolve service name from DB (admin-managed list)
  let serviceName = selectedProduct || "Other Service";
  if (selectedServiceKey) {
    const { data: svc } = await supabase
      .from("ussd_services")
      .select("name")
      .eq("service_key", selectedServiceKey)
      .maybeSingle();
    if (svc?.name) serviceName = svc.name;
  }

  // Record as a milling cash transaction for tracking
  const cleanPhone = phone.replace(/\D/g, "");
  const normalizedPhone = cleanPhone.startsWith("0") ? "256" + cleanPhone.slice(1) :
    cleanPhone.startsWith("256") ? cleanPhone : "256" + cleanPhone;

  // Find customer by phone
  const { data: customer } = await supabase
    .from("milling_customers")
    .select("id, full_name")
    .or(`phone.eq.${normalizedPhone},phone.eq.0${normalizedPhone.slice(3)}`)
    .eq("status", "active")
    .maybeSingle();

  // Log service payment in momo transactions
  await supabase.from("milling_momo_transactions").insert({
    reference: externalRef,
    yo_reference: transactionId || null,
    customer_id: customer?.id || "unknown",
    customer_name: customer?.full_name || `Phone: ${phone}`,
    phone: normalizedPhone,
    amount,
    status: "completed",
    initiated_by: "USSD",
    completed_at: new Date().toISOString(),
  });

  console.log(`[USSD Payment Success] ✅ Service: ${serviceName} - UGX ${amount} from ${phone}. Ref: ${externalRef}`);
}
