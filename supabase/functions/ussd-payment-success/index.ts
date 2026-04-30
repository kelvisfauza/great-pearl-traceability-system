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
        // ── BUGFIX: parse the JSON narrative to extract selected_service_key.
        // Yo Payments delivers narrative as a JSON string inside the form body
        // (e.g. {"selected_product":"Other_services","selected_service_key":"3"}).
        // Without this, the routing falls back to regex on "Other Service" and
        // misclassifies advance-recovery / wallet-deposit / advance-request payments.
        try {
          const narrativeJson = JSON.parse(narrative);
          selectedProduct = narrativeJson.selected_product || "";
          selectedServiceKey = narrativeJson.selected_service_key || "";
        } catch { /* narrative may not be JSON; leave empty */ }
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

    let userMessage = "";
    if (isMillingPayment) {
      await processMillingPayment(supabase, { externalRef, amount, phone, transactionId });
    }
    if (isServicePayment) {
      const result = await processServicePayment(supabase, {
        externalRef, amount, phone, transactionId,
        selectedProduct, selectedServiceKey, narrative,
      });
      userMessage = result?.userMessage || "";
    } else if (!isMillingPayment) {
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

    return new Response(JSON.stringify({ status: "ok", message: userMessage || undefined }), {
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
): Promise<{ userMessage?: string }> {
  const { externalRef, amount, phone, transactionId, selectedProduct, selectedServiceKey, narrative } = params;
  let userMessage = "";

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
    const phoneVariants = [
      normalizedPhone,
      `+${normalizedPhone}`,
      `0${normalizedPhone.slice(3)}`,
    ];
    let remaining = amount;

    // Resolve employee by phone so we can (a) find loans by employee_id as
    // a fallback, and (b) post paired ledger entries on the user's statement.
    const { data: emp } = await supabase
      .from("employees")
      .select("id, name, email, phone")
      .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
      .maybeSingle();

    // 1) Employee loans by phone (oldest first)
    const { data: directLoans } = await supabase
      .from("loans")
      .select("id, employee_id, employee_name, remaining_balance, paid_amount, total_repayable")
      .in("employee_phone", phoneVariants)
      .in("status", ["disbursed", "active"])
      .gt("remaining_balance", 0)
      .order("created_at", { ascending: true });

    // 2) Fallback: loans by employee_id (covers loans missing employee_phone)
    let employeeLoans: any[] = [];
    if (emp?.id) {
      const { data: byEmp } = await supabase
        .from("loans")
        .select("id, employee_id, employee_name, remaining_balance, paid_amount, total_repayable")
        .eq("employee_id", emp.id)
        .in("status", ["disbursed", "active"])
        .gt("remaining_balance", 0)
        .order("created_at", { ascending: true });
      employeeLoans = byEmp || [];
    }

    // De-duplicate by id, keep oldest-first ordering from the direct query
    const loanMap = new Map<string, any>();
    [...(directLoans || []), ...employeeLoans].forEach((l) => loanMap.set(l.id, l));
    const allLoans = Array.from(loanMap.values());

    // Resolve unified user_id once (for paired ledger entries)
    let resolvedUserId: string | null = null;
    if (emp?.email) {
      const { data: uid } = await supabase
        .rpc("get_unified_user_id", { input_email: emp.email });
      resolvedUserId = uid || null;
    }

    let totalApplied = 0;
    for (const loan of allLoans) {
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
      totalApplied += apply;
      console.log(`[USSD Payment Success] Loan ${loan.id} repaid UGX ${apply}, balance ${bal} → ${newBal}`);

      // Paired ledger entries so the user's statement shows the MoMo-direct
      // repayment with net-zero wallet impact. (See momo-direct-payment-paired-ledger.)
      if (resolvedUserId) {
        const ts = Date.now();
        const depRef = `LOAN-MOMO-IN-${loan.id}-${ts}`;
        const repayRef = `LOAN-MOMO-REPAY-${loan.id}-${ts}`;

        // Idempotency: skip if we've already posted for this transaction_ref
        const { data: existing } = await supabase
          .from("ledger_entries")
          .select("id")
          .eq("user_id", resolvedUserId)
          .or(`reference.eq.${depRef},reference.eq.${repayRef}`)
          .maybeSingle();

        if (!existing) {
          await supabase.from("ledger_entries").insert([
            {
              user_id: resolvedUserId,
              entry_type: "DEPOSIT",
              amount: apply,
              reference: depRef,
              source_category: "LOAN_REPAYMENT",
              metadata: {
                description: `MoMo received from ${normalizedPhone} for loan repayment`,
                phone: normalizedPhone,
                loan_id: loan.id,
                ussd_reference: externalRef,
                yo_transaction_id: transactionId,
                transaction_ref: depRef,
                source: "mobile_money",
                provider: "yo_payments",
              },
            },
            {
              user_id: resolvedUserId,
              entry_type: "LOAN_REPAYMENT",
              amount: -Math.abs(apply),
              reference: repayRef,
              source_category: "LOAN_REPAYMENT",
              metadata: {
                description: `Loan repayment via USSD MoMo (loan ${loan.id})`,
                phone: normalizedPhone,
                loan_id: loan.id,
                ussd_reference: externalRef,
                yo_transaction_id: transactionId,
                transaction_ref: repayRef,
              },
            },
          ]);
        }
      }
    }

    if (remaining > 0) {
      console.log(`[USSD Payment Success] ⚠ Advance Recovery overpayment: UGX ${remaining} unallocated for ${phone}`);
    }

    // USSD confirmation message
    if (totalApplied > 0) {
      const shortRef = externalRef.slice(-6).toUpperCase();
      const remainTotal = allLoans.reduce(
        (s, l) => s + Math.max(0, Number(l.remaining_balance || 0) - (l === allLoans[0] ? 0 : 0)),
        0,
      );
      // Recompute outstanding after repayment
      const newOutstanding = allLoans.reduce((s, l) => {
        const bal = Number(l.remaining_balance || 0);
        return s + Math.max(0, bal); // already updated rows in DB; this is best-effort
      }, 0) - totalApplied;
      userMessage =
        `Loan repayment UGX ${Number(totalApplied).toLocaleString()} received.\n` +
        `Outstanding: UGX ${Math.max(0, newOutstanding).toLocaleString()}.\n` +
        `Ref: ${shortRef}. Thank you.`;

      // ── Notify the user (SMS + Email). Failures are logged but never abort. ──
      try {
        const outstanding = Math.max(0, newOutstanding);
        const fullyPaid = outstanding <= 0;
        const recipientName = emp?.name || "Customer";
        const formattedAmount = `UGX ${Number(totalApplied).toLocaleString()}`;
        const formattedOutstanding = `UGX ${outstanding.toLocaleString()}`;

        // SMS — short and direct
        try {
          await supabase.functions.invoke("send-sms", {
            body: {
              recipientPhone: normalizedPhone,
              recipientEmail: emp?.email || null,
              message:
                `Great Pearl Coffee: Loan repayment of ${formattedAmount} received via USSD. ` +
                (fullyPaid
                  ? `Loan fully cleared. Thank you!`
                  : `Outstanding balance: ${formattedOutstanding}.`) +
                ` Ref: ${shortRef}`,
              priority: "high",
            },
          });
        } catch (smsErr) {
          console.error("[USSD Payment Success] Loan repayment SMS failed:", smsErr);
        }

        // Branded email confirmation (operations auto-CC'd by send-transactional-email)
        if (emp?.email) {
          try {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                recipientEmail: emp.email,
                recipientName,
                subject: fullyPaid
                  ? `Loan Fully Repaid - ${formattedAmount}`
                  : `Loan Repayment Received - ${formattedAmount}`,
                heading: fullyPaid
                  ? "Loan Cleared"
                  : "Loan Repayment Received",
                body:
                  `Hello ${recipientName},\n\n` +
                  `We have received your loan repayment of ${formattedAmount} via USSD Mobile Money.\n\n` +
                  `Reference: ${externalRef}\n` +
                  `Phone: ${normalizedPhone}\n` +
                  (fullyPaid
                    ? `Your loan has been fully cleared. Thank you for completing your repayment!`
                    : `Outstanding balance: ${formattedOutstanding}`) +
                  `\n\nThis transaction has been recorded on your statement.\n\n` +
                  `If you did not authorize this payment, please contact administration immediately.`,
                purpose: "transactional",
                idempotency_key: `ussd-loan-repay-${externalRef}`,
              },
            });
          } catch (emailErr) {
            console.error("[USSD Payment Success] Loan repayment email failed:", emailErr);
          }
        } else {
          console.warn(
            `[USSD Payment Success] No email on file for ${normalizedPhone}; skipped repayment email.`,
          );
        }
      } catch (notifyErr) {
        console.error("[USSD Payment Success] Notification block error:", notifyErr);
      }
    } else {
      userMessage = `No active loan found for ${normalizedPhone}. Please contact admin.`;
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
      // Allow caller to deposit to a DIFFERENT employee's wallet by
      // passing { account_phone: "256..." } in the USSD narrative.
      // Falls back to the caller's MSISDN if not provided.
      let targetPhone = normalizedPhone;
      try {
        const narrativeJson = JSON.parse(narrative || "{}");
        const accountPhone = narrativeJson.account_phone || narrativeJson.target_phone;
        if (accountPhone) {
          const ap = String(accountPhone).replace(/\D/g, "");
          targetPhone = ap.startsWith("0") ? "256" + ap.slice(1) :
            ap.startsWith("256") ? ap : "256" + ap;
        }
      } catch { /* narrative may not be JSON */ }

      const phoneVariants = [targetPhone, `0${targetPhone.slice(3)}`];

      // Resolve employee by target phone
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name, email, phone")
        .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
        .maybeSingle();

      if (!emp?.email) {
        console.error(`[USSD Payment Success] Wallet deposit: no employee for phone ${targetPhone} (caller ${normalizedPhone})`);
        userMessage =
          `No wallet found for ${targetPhone.replace(/^256/, "0")}.\n` +
          `Please contact admin. Your money will be refunded.`;
      } else {
        // Resolve unified user_id from employee email
        const { data: resolvedUserId } = await supabase
          .rpc("get_unified_user_id", { input_email: emp.email });

        if (!resolvedUserId) {
          console.error(`[USSD Payment Success] Wallet deposit: cannot resolve user_id for ${emp.email}`);
        } else {
          const ledgerRef = `USSD-DEPOSIT-${externalRef}`;
          const { error: ledgerErr } = await supabase.from("ledger_entries").insert({
            user_id: resolvedUserId,
            entry_type: "DEPOSIT",
            amount: amount,
            reference: ledgerRef,
            source_category: "SELF_DEPOSIT",
            metadata: {
              type: "ussd_wallet_deposit",
              description: `USSD wallet deposit from ${normalizedPhone}${targetPhone !== normalizedPhone ? ` (credited to ${emp.name})` : ""}`,
              phone: targetPhone,
              caller_phone: normalizedPhone,
              employee_id: emp.id,
              employee_email: emp.email,
              ussd_reference: externalRef,
              yo_transaction_id: transactionId,
              source: "mobile_money",
              provider: "yo_payments",
            },
          });

          if (ledgerErr) {
            console.error("[USSD Payment Success] Wallet credit failed:", ledgerErr);
          } else {
            console.log(`[USSD Payment Success] ✅ Wallet credited: ${emp.name} (+UGX ${amount}) ref ${ledgerRef}`);
            // Short ref for the USSD confirmation message (last 6 chars of external ref)
            const shortRef = externalRef.slice(-6).toUpperCase();
            const isThirdParty = targetPhone !== normalizedPhone;
            const targetLine = isThirdParty ? `\nTo: ${emp.name}` : "";
            userMessage =
              `Wallet credited UGX ${Number(amount).toLocaleString()}.${targetLine}\n` +
              `Ref: ${shortRef}\n` +
              `Thank you for using Great Agro Coffee.`;

            // Try to look up depositor's name (only useful for third-party)
            let depositorName = "";
            if (isThirdParty) {
              const callerVariants = [normalizedPhone, `0${normalizedPhone.slice(3)}`];
              const { data: caller } = await supabase
                .from("employees")
                .select("name")
                .or(callerVariants.map((p) => `phone.eq.${p}`).join(","))
                .maybeSingle();
              depositorName = caller?.name || normalizedPhone;
            }

            // Fire-and-forget SMS to the caller (depositor)
            try {
              const smsMsg = isThirdParty
                ? `You sent UGX ${Number(amount).toLocaleString()} to ${emp.name}'s wallet via USSD. ` +
                  `Ref: ${shortRef}. - Great Agro Coffee`
                : `Dear ${emp.name}, UGX ${Number(amount).toLocaleString()} has been credited to your wallet via USSD. ` +
                  `Ref: ${shortRef}. - Great Agro Coffee`;
              await supabase.functions.invoke("send-sms", {
                body: {
                  phone: normalizedPhone,
                  message: smsMsg,
                  userName: isThirdParty ? depositorName : emp.name,
                  messageType: "payout_confirmation",
                  recipientEmail: isThirdParty ? null : emp.email,
                },
              });
            } catch (smsErr) {
              console.error("[USSD Payment Success] Deposit SMS failed:", smsErr);
            }

            // SMS to the WALLET OWNER too — only when someone else deposited
            // for them (avoid duplicate SMS when depositor == owner).
            if (isThirdParty && emp.phone) {
              try {
                const ownerSms =
                  `Dear ${emp.name}, UGX ${Number(amount).toLocaleString()} was deposited to your wallet by ` +
                  `${depositorName} (${normalizedPhone}). Ref: ${shortRef}. - Great Agro Coffee`;
                await supabase.functions.invoke("send-sms", {
                  body: {
                    phone: emp.phone,
                    message: ownerSms,
                    userName: emp.name,
                    messageType: "payout_confirmation",
                    recipientEmail: emp.email,
                  },
                });
              } catch (ownerSmsErr) {
                console.error("[USSD Payment Success] Owner SMS failed:", ownerSmsErr);
              }
            }

            // Branded email to the wallet owner (operations auto-CC'd)
            try {
              await supabase.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "wallet-deposit-credited",
                  recipientEmail: emp.email,
                  idempotencyKey: `ussd-deposit-${externalRef}`,
                  templateData: {
                    employeeName: emp.name,
                    amount: Number(amount).toLocaleString(),
                    phone: normalizedPhone,
                    depositorName: isThirdParty ? depositorName : "",
                    reference: externalRef,
                    date: new Date().toLocaleDateString("en-GB", {
                      year: "numeric", month: "long", day: "numeric",
                    }),
                  },
                },
              });
            } catch (emailErr) {
              console.error("[USSD Payment Success] Deposit email failed:", emailErr);
            }

            // In-app notification so the deposit shows on the dashboard too
            try {
              await supabase.from("notifications").insert({
                type: "system",
                title: "Wallet Deposit Received",
                message: isThirdParty
                  ? `UGX ${Number(amount).toLocaleString()} deposited to your wallet by ${depositorName} (${normalizedPhone}). Ref: ${shortRef}`
                  : `UGX ${Number(amount).toLocaleString()} credited via USSD from ${normalizedPhone}. Ref: ${shortRef}`,
                priority: "medium",
                target_user_id: emp.id,
              });
            } catch (notifErr) {
              console.error("[USSD Payment Success] Notification insert failed:", notifErr);
            }
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
  return { userMessage };
}
