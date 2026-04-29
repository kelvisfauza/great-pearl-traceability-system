import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

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

  // ── Advance Recovery: apply FIFO across employee loans then supplier advances ──
  const isAdvanceRecovery =
    selectedServiceKey === "3" ||
    /advance\s*recovery/i.test(serviceName);

  if (isAdvanceRecovery && amount > 0) {
    const phoneVariants = [normalizedPhone, `0${normalizedPhone.slice(3)}`];
    let remaining = amount;

    // 1) Employee loans (oldest first)
    const { data: loans } = await supabase
      .from("loans")
      .select("id, employee_id, employee_name, remaining_balance, paid_amount, total_repayable")
      .in("employee_phone", phoneVariants)
      .in("status", ["disbursed", "active"])
      .gt("remaining_balance", 0)
      .order("created_at", { ascending: true });

    for (const loan of loans || []) {
      if (remaining <= 0) break;
      const bal = Number(loan.remaining_balance || 0);
      const apply = Math.min(remaining, bal);
      const newBal = bal - apply;
      const newPaid = Number(loan.paid_amount || 0) + apply;

      await supabase.from("loan_repayments").insert({
        loan_id: loan.id,
        amount_due: apply,
        amount_paid: apply,
        due_date: new Date().toISOString().split("T")[0],
        paid_date: new Date().toISOString().split("T")[0],
        status: "paid",
        deducted_from: "ussd_momo",
        payment_reference: externalRef,
      });

      await supabase.from("loans").update({
        paid_amount: newPaid,
        remaining_balance: newBal,
        status: newBal <= 0 ? "completed" : "disbursed",
      }).eq("id", loan.id);

      remaining -= apply;
      console.log(`[USSD Payment Success] Loan ${loan.id} repaid UGX ${apply}, balance ${bal} → ${newBal}`);
    }

    if (remaining > 0) {
      console.log(`[USSD Payment Success] ⚠ Advance Recovery overpayment: UGX ${remaining} unallocated for ${phone}`);
    }
  }

  // ── Request Advance (service 4): create approval request + refund inbound payment ──
  const isRequestAdvance =
    selectedServiceKey === "4" ||
    /request\s*advance/i.test(serviceName);

  if (isRequestAdvance && amount > 0) {
    try {
      const phoneVariants = [normalizedPhone, `0${normalizedPhone.slice(3)}`];

      // Try to resolve employee for richer request context
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, email, department, position")
        .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
        .maybeSingle();

      const requesterName = emp?.name || `USSD Caller (${normalizedPhone})`;
      const department = emp?.department || "Field";

      // Create approval request: Admin First -> Finance Last
      const { data: approval, error: approvalError } = await supabase
        .from("approval_requests")
        .insert({
          type: "USSD Advance Request",
          title: `USSD Advance Request - ${requesterName}`,
          description: `Advance of UGX ${amount.toLocaleString()} requested via USSD by ${requesterName} (${normalizedPhone}). On approval, funds will be sent to this mobile number.`,
          amount,
          requestedby: emp?.email || normalizedPhone,
          requestedby_name: requesterName,
          requestedby_position: emp?.position || "USSD Caller",
          department,
          daterequested: new Date().toISOString().split("T")[0],
          priority: "Medium",
          status: "Pending Admin",
          approval_stage: "pending_admin",
          disbursement_method: "MOBILE_MONEY",
          disbursement_phone: normalizedPhone,
          details: JSON.stringify({
            advance_type: "ussd_advance",
            phone: normalizedPhone,
            employee_id: emp?.id || null,
            employee_email: emp?.email || null,
            requested_amount: amount,
            ussd_reference: externalRef,
            ussd_inbound_amount: amount,
            ussd_inbound_transaction_id: transactionId,
          }),
        })
        .select()
        .single();

      if (approvalError) {
        console.error("[USSD Payment Success] Failed to create approval request:", approvalError);
      } else {
        console.log(`[USSD Payment Success] ✅ Created USSD Advance approval request ${approval.id}`);
      }

      // Track the request for the disburser cron
      await supabase.from("ussd_advance_requests").insert({
        phone: normalizedPhone,
        amount,
        requester_name: requesterName,
        employee_id: emp?.id || null,
        approval_request_id: approval?.id || null,
        status: "pending",
        disbursement_status: "pending",
        ussd_reference: externalRef,
      });

      // Refund the inbound payment so the caller is not charged for requesting
      try {
        const refund = await yoPayout({
          phone: normalizedPhone,
          amount,
          narrative: `Refund USSD advance request fee - Ref ${externalRef}`,
        });
        console.log(`[USSD Payment Success] Refund attempted: success=${refund.success} ref=${refund.transactionRef || ""} err=${refund.errorMessage || ""}`);
      } catch (refundErr) {
        console.error("[USSD Payment Success] Refund failed:", refundErr);
      }
    } catch (e) {
      console.error("[USSD Payment Success] Request Advance handling failed:", e);
    }
  }

  // ── Deposit to Wallet (service 5): credit user wallet via ledger_entries ──
  const isWalletDeposit =
    selectedServiceKey === "5" ||
    /deposit\s*to\s*wallet/i.test(serviceName);

  if (isWalletDeposit && amount > 0) {
    try {
      const phoneVariants = [normalizedPhone, `0${normalizedPhone.slice(3)}`];

      // Resolve employee by phone
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, email")
        .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
        .maybeSingle();

      if (!emp?.email) {
        console.error(`[USSD Payment Success] Wallet deposit: no employee for phone ${normalizedPhone}`);
      } else {
        // Resolve unified user_id from employee email
        const { data: resolvedUserId } = await supabase
          .rpc("get_unified_user_id", { p_email: emp.email });

        if (!resolvedUserId) {
          console.error(`[USSD Payment Success] Wallet deposit: cannot resolve user_id for ${emp.email}`);
        } else {
          const ledgerRef = `USSD-DEPOSIT-${externalRef}`;
          const { error: ledgerErr } = await supabase.from("ledger_entries").insert({
            user_id: resolvedUserId,
            entry_type: "DEPOSIT",
            amount: amount,
            reference: ledgerRef,
            source_category: "DEPOSIT",
            metadata: {
              type: "ussd_wallet_deposit",
              description: `USSD wallet deposit from ${normalizedPhone}`,
              phone: normalizedPhone,
              employee_id: emp.id,
              employee_email: emp.email,
              ussd_reference: externalRef,
              yo_transaction_id: transactionId,
            },
          });

          if (ledgerErr) {
            console.error("[USSD Payment Success] Wallet credit failed:", ledgerErr);
          } else {
            console.log(`[USSD Payment Success] ✅ Wallet credited: ${emp.name} (+UGX ${amount}) ref ${ledgerRef}`);
          }
        }
      }
    } catch (e) {
      console.error("[USSD Payment Success] Wallet deposit handling failed:", e);
    }
  }

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
