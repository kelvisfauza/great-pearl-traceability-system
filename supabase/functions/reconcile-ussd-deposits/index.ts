// Safety-net reconciler for USSD wallet deposits and loan repayments.
//
// Symptom this fixes: a USSD payment is logged as success in
// `ussd_payment_logs` (Yo confirmed and the user was charged) but the
// follow-up branch in `ussd-payment-success` failed to post the
// ledger_entries row — so the wallet was never credited and no SMS/email
// was sent. The branch swallows errors, so this can happen silently.
//
// This cron scans the last 60 days of successful USSD service payments and:
//   • Wallet Deposit (service_key=5): posts the missing DEPOSIT into
//     ledger_entries (idempotent on `reference`) and sends an SMS+email.
//   • Advance Recovery (service_key=3): posts the missing paired
//     (DEPOSIT + LOAN_REPAYMENT) so the user statement reflects the
//     repayment with net-zero wallet impact.
//
// Returns HTTP 200 with `{ ok: true|false, scanned, repaired, errors }`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary = {
    scanned: 0,
    deposits_repaired: 0,
    repayments_repaired: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const sinceIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // Pull recent successful USSD service payment logs
    const { data: logs, error: logsErr } = await supabase
      .from("ussd_payment_logs")
      .select("reference, phone, amount, transaction_id, narrative, created_at")
      .eq("status", "success")
      .like("reference", "USSD-SVC-%")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(500);

    if (logsErr) throw logsErr;

    for (const log of logs || []) {
      summary.scanned++;
      try {
        const externalRef = String(log.reference);
        const amount = Number(log.amount || 0);
        const phone = String(log.phone || "");
        if (amount <= 0 || !phone) { summary.skipped++; continue; }

        // Parse narrative for service key
        let serviceKey = "";
        try {
          const n = JSON.parse(log.narrative || "{}");
          serviceKey = String(n.selected_service_key || "");
        } catch { /* ignore */ }

        const cleanPhone = phone.replace(/\D/g, "");
        const normalizedPhone = cleanPhone.startsWith("0")
          ? "256" + cleanPhone.slice(1)
          : cleanPhone.startsWith("256") ? cleanPhone : "256" + cleanPhone;
        const phoneVariants = [
          normalizedPhone,
          `+${normalizedPhone}`,
          `0${normalizedPhone.slice(3)}`,
        ];

        // ── Wallet Deposit (service 5) ──
        if (serviceKey === "5") {
          const expectedRef = `USSD-DEPOSIT-${externalRef}`;

          // Idempotency: skip if ANY existing ledger row references this USSD ref,
          // either by its dedicated reference OR via metadata->>ussd_reference.
          const [byRef, byMeta] = await Promise.all([
            supabase.from("ledger_entries").select("id").eq("reference", expectedRef).limit(1),
            supabase
              .from("ledger_entries")
              .select("id")
              .filter("metadata->>ussd_reference", "eq", externalRef)
              .limit(1),
          ]);
          if ((byRef.data?.length ?? 0) > 0 || (byMeta.data?.length ?? 0) > 0) {
            summary.skipped++;
            continue;
          }

          // Resolve employee + unified user_id
          const { data: emp } = await supabase
            .from("employees")
            .select("id, name, email, phone")
            .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
            .maybeSingle();

          if (!emp?.email) {
            summary.errors.push(`${externalRef}: no employee for phone ${normalizedPhone}`);
            continue;
          }

          const { data: uid } = await supabase
            .rpc("get_unified_user_id", { input_email: emp.email });
          if (!uid) {
            summary.errors.push(`${externalRef}: cannot resolve user_id for ${emp.email}`);
            continue;
          }

          const { error: insErr } = await supabase.from("ledger_entries").insert({
            user_id: uid,
            entry_type: "DEPOSIT",
            amount,
            reference: expectedRef,
            source_category: "SELF_DEPOSIT",
            metadata: {
              type: "ussd_wallet_deposit",
              description: `USSD wallet deposit from ${normalizedPhone} (auto-reconciled)`,
              phone: normalizedPhone,
              caller_phone: normalizedPhone,
              employee_id: emp.id,
              employee_email: emp.email,
              ussd_reference: externalRef,
              yo_transaction_id: log.transaction_id,
              source: "mobile_money",
              provider: "yo_payments",
              reconciled_at: new Date().toISOString(),
              reconciled_by: "reconcile-ussd-deposits",
            },
          });
          if (insErr) {
            summary.errors.push(`${externalRef}: ledger insert failed - ${insErr.message}`);
            continue;
          }

          summary.deposits_repaired++;
          console.log(`[Reconcile USSD] ✅ Credited ${emp.name} +UGX ${amount} (ref ${expectedRef})`);

          // Best-effort SMS + email + notification (non-blocking)
          const shortRef = externalRef.slice(-6).toUpperCase();
          try {
            await supabase.functions.invoke("send-sms", {
              body: {
                phone: normalizedPhone,
                message: `Dear ${emp.name}, UGX ${amount.toLocaleString()} has been credited to your wallet via USSD. Ref: ${shortRef}. - Great Agro Coffee`,
                userName: emp.name,
                messageType: "payout_confirmation",
                recipientEmail: emp.email,
              },
            });
          } catch (e) { console.error("[Reconcile USSD] SMS failed:", e); }

          try {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "wallet-deposit-credited",
                recipientEmail: emp.email,
                idempotencyKey: `ussd-deposit-${externalRef}`,
                templateData: {
                  employeeName: emp.name,
                  amount: amount.toLocaleString(),
                  phone: normalizedPhone,
                  depositorName: "",
                  reference: externalRef,
                  date: new Date().toLocaleDateString("en-GB", {
                    year: "numeric", month: "long", day: "numeric",
                  }),
                },
              },
            });
          } catch (e) { console.error("[Reconcile USSD] Email failed:", e); }

          try {
            await supabase.from("notifications").insert({
              type: "system",
              title: "Wallet Deposit Received",
              message: `UGX ${amount.toLocaleString()} credited via USSD from ${normalizedPhone}. Ref: ${shortRef} (auto-reconciled)`,
              priority: "medium",
              target_user_id: emp.id,
            });
          } catch (e) { console.error("[Reconcile USSD] Notification failed:", e); }

          continue;
        }

        // ── Advance Recovery (service 3) — ensure paired ledger entries exist ──
        if (serviceKey === "3") {
          // ── STRICT IDEMPOTENCY GUARD (must run BEFORE any write) ──
          // Check ALL possible markers that this USSD ref was already processed.
          // Any single match means we MUST skip — never double-credit.
          const [byMetaIn, byMetaOut, byRepayment] = await Promise.all([
            supabase
              .from("ledger_entries")
              .select("id")
              .filter("metadata->>ussd_reference", "eq", externalRef)
              .limit(1),
            supabase
              .from("ledger_entries")
              .select("id")
              .eq("source_category", "loan_repayment_out")
              .filter("metadata->>ussd_reference", "eq", externalRef)
              .limit(1),
            supabase
              .from("loan_repayments")
              .select("id")
              .eq("payment_reference", externalRef)
              .limit(1),
          ]);
          if (
            (byMetaIn.data?.length ?? 0) > 0 ||
            (byMetaOut.data?.length ?? 0) > 0 ||
            (byRepayment.data?.length ?? 0) > 0
          ) {
            summary.skipped++;
            continue;
          }

          // Resolve employee
          const { data: emp } = await supabase
            .from("employees")
            .select("id, name, email, phone")
            .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
            .maybeSingle();
          if (!emp?.email) {
            summary.errors.push(`${externalRef}: no employee for phone ${normalizedPhone}`);
            continue;
          }

          const { data: uid } = await supabase
            .rpc("get_unified_user_id", { input_email: emp.email });
          if (!uid) {
            summary.errors.push(`${externalRef}: cannot resolve user_id for ${emp.email}`);
            continue;
          }

          // Find active loans (FIFO, oldest first)
          const { data: directLoans } = await supabase
            .from("loans")
            .select("id, employee_id, employee_name, remaining_balance, paid_amount, total_repayable")
            .eq("employee_id", emp.id)
            .in("status", ["disbursed", "active"])
            .gt("remaining_balance", 0)
            .order("created_at", { ascending: true });

          const allLoans = directLoans || [];
          if (allLoans.length === 0) {
            summary.skipped++;
            console.log(`[Reconcile USSD] No active loan for ${emp.name} (ref ${externalRef})`);
            continue;
          }

          let remaining = amount;
          let totalApplied = 0;

          for (const loan of allLoans) {
            if (remaining <= 0) break;
            const bal = Number(loan.remaining_balance || 0);
            const apply = Math.min(remaining, bal);
            const newBal = bal - apply;
            const newPaid = Number(loan.paid_amount || 0) + apply;
            const ts = Date.now();
            const depRef = `LOAN-MOMO-IN-${loan.id}-${ts}`;
            const repayRef = `LOAN-MOMO-REPAY-${loan.id}-${ts}`;

            // 1. Update loan balance
            const { error: loanErr } = await supabase
              .from("loans")
              .update({
                remaining_balance: newBal,
                paid_amount: newPaid,
                status: newBal <= 0 ? "completed" : "active",
              })
              .eq("id", loan.id);
            if (loanErr) {
              summary.errors.push(`${externalRef}: loan ${loan.id} update failed - ${loanErr.message}`);
              continue;
            }

            // 2. Insert loan_repayments row
            await supabase.from("loan_repayments").insert({
              loan_id: loan.id,
              amount_paid: apply,
              payment_method: "mobile_money_ussd",
              payment_reference: externalRef,
              paid_date: new Date().toISOString(),
              notes: `Auto-reconciled USSD repayment from ${normalizedPhone}`,
            });

            // 3. Insert paired ledger entries
            await supabase.from("ledger_entries").insert([
              {
                user_id: uid,
                entry_type: "DEPOSIT",
                amount: apply,
                reference: depRef,
                source_category: "loan_repayment_in",
                metadata: {
                  description: `MoMo received from ${normalizedPhone} for loan repayment (auto-reconciled)`,
                  phone: normalizedPhone,
                  loan_id: loan.id,
                  ussd_reference: externalRef,
                  yo_transaction_id: log.transaction_id,
                  transaction_ref: depRef,
                  source: "mobile_money",
                  provider: "yo_payments",
                  reconciled_at: new Date().toISOString(),
                  reconciled_by: "reconcile-ussd-deposits",
                },
              },
              {
                user_id: uid,
                entry_type: "LOAN_REPAYMENT",
                amount: -Math.abs(apply),
                reference: repayRef,
                source_category: "loan_repayment_out",
                metadata: {
                  description: `Loan repayment via USSD MoMo (loan ${loan.id}, auto-reconciled)`,
                  phone: normalizedPhone,
                  loan_id: loan.id,
                  ussd_reference: externalRef,
                  yo_transaction_id: log.transaction_id,
                  transaction_ref: repayRef,
                },
              },
            ]);

            totalApplied += apply;
            remaining -= apply;
          }

          if (totalApplied <= 0) { summary.skipped++; continue; }

          summary.repayments_repaired++;
          console.log(`[Reconcile USSD] ✅ Loan repayment for ${emp.name}: UGX ${totalApplied} (ref ${externalRef})`);

          // Re-read outstanding total for accurate notification
          const { data: postLoans } = await supabase
            .from("loans")
            .select("remaining_balance")
            .eq("employee_id", emp.id)
            .in("status", ["disbursed", "active"]);
          const outstanding = (postLoans || []).reduce(
            (s: number, l: any) => s + Math.max(0, Number(l.remaining_balance || 0)),
            0,
          );
          const fullyPaid = outstanding <= 0;
          const shortRef = externalRef.slice(-6).toUpperCase();

          // SMS confirmation
          try {
            await supabase.functions.invoke("send-sms", {
              body: {
                phone: normalizedPhone,
                recipientPhone: normalizedPhone,
                recipientEmail: emp.email,
                userName: emp.name,
                messageType: "payout_confirmation",
                message:
                  `Great Pearl Coffee: Loan repayment of UGX ${totalApplied.toLocaleString()} received via USSD. ` +
                  (fullyPaid
                    ? `Loan fully cleared. Thank you!`
                    : `Outstanding balance: UGX ${outstanding.toLocaleString()}.`) +
                  ` Ref: ${shortRef}`,
                priority: "high",
              },
            });
          } catch (e) { console.error("[Reconcile USSD] Repayment SMS failed:", e); }

          // Branded email confirmation
          try {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                recipientEmail: emp.email,
                recipientName: emp.name,
                subject: fullyPaid
                  ? `Loan Fully Repaid - UGX ${totalApplied.toLocaleString()}`
                  : `Loan Repayment Received - UGX ${totalApplied.toLocaleString()}`,
                heading: fullyPaid ? "Loan Cleared" : "Loan Repayment Received",
                body:
                  `Hello ${emp.name},\n\n` +
                  `We have received your loan repayment of UGX ${totalApplied.toLocaleString()} via USSD Mobile Money.\n\n` +
                  `Reference: ${externalRef}\n` +
                  `Phone: ${normalizedPhone}\n` +
                  (fullyPaid
                    ? `Your loan has been fully cleared. Thank you for completing your repayment!`
                    : `Outstanding balance: UGX ${outstanding.toLocaleString()}`) +
                  `\n\nThis transaction has been recorded on your statement.\n\n` +
                  `If you did not authorize this payment, please contact administration immediately.`,
                purpose: "transactional",
                idempotency_key: `ussd-loan-repay-${externalRef}`,
              },
            });
          } catch (e) { console.error("[Reconcile USSD] Repayment email failed:", e); }

          // In-app notification
          try {
            await supabase.from("notifications").insert({
              type: "system",
              title: fullyPaid ? "Loan Fully Repaid" : "Loan Repayment Received",
              message:
                `UGX ${totalApplied.toLocaleString()} applied to your loan via USSD. ` +
                (fullyPaid
                  ? `Loan cleared.`
                  : `Outstanding: UGX ${outstanding.toLocaleString()}.`) +
                ` Ref: ${shortRef}`,
              priority: "medium",
              target_user_id: emp.id,
            });
          } catch (e) { console.error("[Reconcile USSD] Notification failed:", e); }
        }
      } catch (rowErr: any) {
        summary.errors.push(`${log.reference}: ${String(rowErr?.message || rowErr)}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[Reconcile USSD] Fatal:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e), ...summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});