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

          // Idempotency: skip if already credited
          const { data: existing } = await supabase
            .from("ledger_entries")
            .select("id")
            .eq("reference", expectedRef)
            .maybeSingle();
          if (existing) { summary.skipped++; continue; }

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
            .rpc("get_unified_user_id", { p_email: emp.email });
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
          // Look for an existing inbound DEPOSIT for this USSD ref
          const { data: existingDeposit } = await supabase
            .from("ledger_entries")
            .select("id")
            .eq("source_category", "loan_repayment_in")
            .filter("metadata->>ussd_reference", "eq", externalRef)
            .maybeSingle();
          if (existingDeposit) { summary.skipped++; continue; }

          // No paired entries — find the loan that was actually paid (most-recently-touched loan_repayments row with this ref)
          const { data: rep } = await supabase
            .from("loan_repayments")
            .select("loan_id, amount_paid, paid_date")
            .eq("payment_reference", externalRef)
            .order("paid_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!rep) { summary.skipped++; continue; }

          const { data: emp } = await supabase
            .from("employees")
            .select("id, name, email")
            .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
            .maybeSingle();
          if (!emp?.email) { summary.skipped++; continue; }

          const { data: uid } = await supabase
            .rpc("get_unified_user_id", { p_email: emp.email });
          if (!uid) { summary.skipped++; continue; }

          const ts = Date.now();
          const depRef = `LOAN-MOMO-IN-${rep.loan_id}-${ts}`;
          const repayRef = `LOAN-MOMO-REPAY-${rep.loan_id}-${ts}`;
          const apply = Number(rep.amount_paid || amount);

          const { error: pairErr } = await supabase.from("ledger_entries").insert([
            {
              user_id: uid,
              entry_type: "DEPOSIT",
              amount: apply,
              reference: depRef,
              source_category: "loan_repayment_in",
              metadata: {
                description: `MoMo received from ${normalizedPhone} for loan repayment (auto-reconciled)`,
                phone: normalizedPhone,
                loan_id: rep.loan_id,
                ussd_reference: externalRef,
                yo_transaction_id: log.transaction_id,
                transaction_ref: depRef,
                source: "mobile_money",
                provider: "yo_payments",
                reconciled_at: new Date().toISOString(),
              },
            },
            {
              user_id: uid,
              entry_type: "LOAN_REPAYMENT",
              amount: -Math.abs(apply),
              reference: repayRef,
              source_category: "loan_repayment_out",
              metadata: {
                description: `Loan repayment via USSD MoMo (loan ${rep.loan_id}, auto-reconciled)`,
                phone: normalizedPhone,
                loan_id: rep.loan_id,
                ussd_reference: externalRef,
                yo_transaction_id: log.transaction_id,
                transaction_ref: repayRef,
              },
            },
          ]);
          if (pairErr) {
            summary.errors.push(`${externalRef}: paired ledger insert failed - ${pairErr.message}`);
            continue;
          }
          summary.repayments_repaired++;
          console.log(`[Reconcile USSD] ✅ Paired loan repayment for ${emp.name}, UGX ${apply}`);
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