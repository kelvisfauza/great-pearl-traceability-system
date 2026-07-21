import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function respond(ok: boolean, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Yo Payments helpers (inline to avoid import issues)
const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function getProviderCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("256") ? "0" + digits.slice(3) : digits;
  if (local.startsWith("077") || local.startsWith("078") || local.startsWith("076") || local.startsWith("079")) return "MTN";
  if (local.startsWith("070") || local.startsWith("075") || local.startsWith("074")) return "AIRTEL";
  return "MTN";
}

function normalizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "256" + clean.slice(1);
  if (!clean.startsWith("256")) clean = "256" + clean;
  return clean;
}

// Tiered withdrawal service fee — applied to ALL instant withdrawals
// (both GosentePay and Yo Payments). Charged in addition to the payout
// amount and credited to the treasury as profit.
//   500       – 60,000     → 1,100
//   60,001    – 500,000    → 1,700
//   500,001   – 1,000,000  → 2,500
//   1,000,001 – 5,000,000  → 2,900
//   5,000,001 and above    → 2,900
export function computeWithdrawFee(amount: number): number {
  const a = Number(amount) || 0;
  if (a < 500) return 0;
  if (a <= 60_000) return 1_100;
  if (a <= 500_000) return 1_700;
  if (a <= 1_000_000) return 2_500;
  return 2_900;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[instant-withdrawal] Request received");

    // Time restriction: Monday-Saturday, 6:00 AM – 7:15 PM EAT (UTC+3)
    const nowEAT = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const dayOfWeek = nowEAT.getDay(); // 0=Sun, 6=Sat
    const hour = nowEAT.getHours();
    const minute = nowEAT.getMinutes();
    const minutesOfDay = hour * 60 + minute;
    const CUTOFF_MINUTES = 19 * 60 + 15; // 7:15 PM EAT
    const OPEN_MINUTES = 6 * 60; // 6:00 AM EAT

    if (dayOfWeek === 0) {
      return respond(false, { error: "Instant withdrawals are not available on Sundays. Available Monday–Saturday, 6:00 AM – 7:15 PM EAT." });
    }
    if (minutesOfDay < OPEN_MINUTES) {
      return respond(false, { error: "Instant withdrawals open at 6:00 AM EAT. Please try again later this morning." });
    }
    if (minutesOfDay >= CUTOFF_MINUTES) {
      return respond(false, { error: "Instant withdrawals close at 7:15 PM daily. Please try again tomorrow morning." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const yoUsername = Deno.env.get("YO_API_USERNAME");
    const yoPassword = Deno.env.get("YO_API_PASSWORD");

    if (!serviceKey || !yoUsername || !yoPassword) {
      console.error("[instant-withdrawal] Missing server config");
      return respond(false, { error: "Server configuration missing" });
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("x-supabase-authorization");
    console.log("[instant-withdrawal] Auth header present:", !!authHeader, "starts with Bearer:", authHeader?.startsWith("Bearer "));
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[instant-withdrawal] No valid auth header found. Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));
      return respond(false, { error: "Unauthorized" });
    }

    // Authenticate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[instant-withdrawal] Auth error:", userError?.message);
      return respond(false, { error: "Invalid token" });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    if (!userEmail) {
      return respond(false, { error: "Could not determine user email" });
    }

    console.log(`[instant-withdrawal] User: ${userEmail}`);

    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine if the requester is an administrator (exempt from throttle)
    let isAdmin = false;
    try {
      const { data: empRole } = await supabase
        .from('employees')
        .select('role')
        .eq('email', userEmail)
        .maybeSingle();
      const role = (empRole?.role || '').toString();
      isAdmin = role === 'Administrator' || role === 'Super Admin';
    } catch (e) {
      console.warn('[instant-withdrawal] role lookup failed:', (e as Error).message);
    }

    // Kill-switch: respect global withdrawal_control toggle
    try {
      const { data: ctrlRow } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "withdrawal_control")
        .maybeSingle();
      const ctrl: any = ctrlRow?.setting_value || {};
      if (ctrl?.disabled === true && !isAdmin) {
        const until = ctrl?.disabled_until ? new Date(ctrl.disabled_until) : null;
        const stillDisabled = !until || until > new Date();
        if (stillDisabled) {
          return respond(false, {
            error: ctrl?.disabled_reason || "Withdrawals are temporarily paused by the administrator.",
            code: "WITHDRAWALS_DISABLED",
          });
        }
      }
    } catch (e) {
      console.warn("[instant-withdrawal] kill-switch check failed:", (e as Error).message);
    }

    const { amount, depositPhone, acceptOverdraft } = await req.json();
    console.log(`[instant-withdrawal] amount=${amount}, depositPhone=${depositPhone}, acceptOverdraft=${!!acceptOverdraft}`);

    if (!amount || !depositPhone) {
      return respond(false, { error: "Missing amount or depositPhone" });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 2000) {
      return respond(false, { error: "Minimum withdrawal is UGX 2,000" });
    }

    // Get unified user ID
    const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { input_email: userEmail });
    const resolvedUserId = unifiedId || userId;

    // Duplicate-submit guard: reject if the same user submitted ANY instant
    // withdrawal in the last 15 seconds. Prevents double-clicks / race storms
    // that would otherwise create many parallel debits before balance checks
    // can see each other. Applies to admins too — genuine second withdrawals
    // 15s apart are extremely rare and can just retry.
    try {
      const recentCutoff = new Date(Date.now() - 15_000).toISOString();
      const { data: recentDup } = await supabase
        .from('instant_withdrawals')
        .select('id, created_at, amount')
        .eq('user_id', resolvedUserId)
        .gte('created_at', recentCutoff)
        .order('created_at', { ascending: false })
        .limit(1);
      if (recentDup && recentDup.length > 0) {
        return respond(false, {
          error: "A withdrawal was just submitted a moment ago. Please wait 15 seconds before trying again — this prevents accidental duplicates.",
          code: "DUPLICATE_SUBMIT",
        });
      }
    } catch (e) {
      console.warn('[instant-withdrawal] dedup check failed:', (e as Error).message);
    }

    // 24-hour rolling throttle (non-admins only)
    if (!isAdmin) {
      // Admin-configured hard limits (system_settings.withdrawal_limits)
      // Applies to BOTH instant_withdrawals and withdrawal_requests on a
      // calendar-day (00:00 local server) basis. This is the same limit
      // enforced in the UI for standard withdrawals — instant withdrawals
      // used to bypass it, which allowed multiple sub-limit payouts to
      // exceed the daily cap. Enforced server-side now.
      try {
        const { data: limRow } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'withdrawal_limits')
          .maybeSingle();
        const lim: any = limRow?.setting_value || {};
        const perTx = Number(lim?.per_transaction || 0);
        const daily = Number(lim?.daily || 0);
        if (perTx > 0 && numAmount > perTx) {
          return respond(false, {
            error: `Per-transaction limit is UGX ${perTx.toLocaleString()}. Please reduce the amount.`,
            code: 'PER_TX_LIMIT',
          });
        }
        if (daily > 0) {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const sinceIso = startOfDay.toISOString();
          const [iwRes, wrRes] = await Promise.all([
            supabase
              .from('instant_withdrawals')
              .select('amount, payout_status, created_at')
              .eq('user_id', resolvedUserId)
              .gte('created_at', sinceIso),
            supabase
              .from('withdrawal_requests')
              .select('amount, status, created_at')
              .eq('user_id', resolvedUserId)
              .gte('created_at', sinceIso),
          ]);
          const usedIW = (iwRes.data || [])
            .filter((r: any) => !['failed', 'rejected', 'declined', 'cancelled', 'expired'].includes(String(r.payout_status || '').toLowerCase()))
            .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const usedWR = (wrRes.data || [])
            .filter((r: any) => !['failed', 'rejected', 'cancelled', 'expired'].includes(String(r.status || '').toLowerCase()))
            .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const usedToday = usedIW + usedWR;
          const remaining = Math.max(0, daily - usedToday);
          if (numAmount > remaining) {
            return respond(false, {
              error: `Daily withdrawal limit is UGX ${daily.toLocaleString()}. You've used UGX ${usedToday.toLocaleString()} today (remaining: UGX ${remaining.toLocaleString()}).`,
              code: 'DAILY_LIMIT',
              daily,
              used_today: usedToday,
              remaining_today: remaining,
            });
          }
        }
      } catch (e) {
        console.warn('[instant-withdrawal] withdrawal_limits check failed:', (e as Error).message);
      }

      try {
        const { data: throttleRow } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'instant_withdrawal_throttle')
          .maybeSingle();
        const t: any = throttleRow?.setting_value || {};
        const activeUntil = t?.active_until ? new Date(t.active_until) : null;
        const throttleActive = t?.enabled === true && (!activeUntil || activeUntil > new Date());
        if (throttleActive) {
          const cap = Number(t?.daily_cap || 100000);
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          // Sum prior instant withdrawals in last 24h (exclude failed/rejected)
          const { data: recent } = await supabase
            .from('instant_withdrawals')
            .select('amount, payout_status, created_at')
            .eq('user_id', resolvedUserId)
            .gte('created_at', since);
          const used = (recent || [])
            .filter((r: any) => !['failed', 'rejected'].includes(String(r.payout_status || '').toLowerCase()))
            .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const remaining = Math.max(0, cap - used);
          if (numAmount > remaining) {
            return respond(false, {
              error: `Instant withdrawals are capped at UGX ${cap.toLocaleString()} per 24 hours during this period. You have already used UGX ${used.toLocaleString()}; remaining today: UGX ${remaining.toLocaleString()}.`,
              code: 'INSTANT_WD_THROTTLED',
              cap,
              used_24h: used,
              remaining_24h: remaining,
            });
          }
        }
      } catch (e) {
        console.warn('[instant-withdrawal] throttle check failed:', (e as Error).message);
      }
    }

    // Verify wallet balance
    const { data: balanceData } = await supabase.rpc('get_user_balance_safe', { user_email: userEmail });
    const walletBalance = Number(balanceData?.[0]?.wallet_balance || 0);
    const availableBalance = Number(balanceData?.[0]?.available_balance ?? walletBalance);
    const pendingWithdrawals = Number(balanceData?.[0]?.pending_withdrawals || 0);

    // Also subtract any in-flight instant withdrawals still pending payout (race guard).
    let inFlightInstant = 0;
    try {
      const { data: inflight } = await supabase
        .from('instant_withdrawals')
        .select('amount')
        .eq('user_id', resolvedUserId)
        .in('payout_status', ['pending', 'pending_approval', 'reconciliation_needed']);
      inFlightInstant = (inflight || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    } catch (_) { /* non-fatal */ }

    // Loan minimum balance enforcement: borrowers and guarantors on active loans
    // must keep UGX 10,000 in their wallet at all times — UNLESS they have an
    // active overdraft account with at least 10,000 headroom, in which case the
    // overdraft itself acts as the loan backstop.
    let reserve = 0;
    try {
      const { data: hasLoan } = await supabase.rpc('has_active_loan_obligation', { p_user_id: resolvedUserId });
      if (hasLoan === true) reserve = 10000;
    } catch (e) {
      console.warn('[instant-withdrawal] loan obligation check failed:', (e as Error).message);
    }

    // Authoritative spendable balance: ledger balance minus pending withdrawal_requests
    // minus in-flight instant withdrawals minus loan reserve.
    const baseAvailable = Math.min(availableBalance, walletBalance - pendingWithdrawals);
    const walletSpendable = Math.max(0, baseAvailable - inFlightInstant - reserve);

    // Add any opt-in overdraft headroom for this user.
    let odAvailable = 0;
    let odAccountId: string | null = null;
    let odFrozen = false;
    try {
      const { data: spend } = await supabase.rpc('get_overdraft_spendable', { p_user_id: resolvedUserId });
      odAvailable = Number((spend as any)?.overdraft_available || 0);
      odFrozen = !!(spend as any)?.frozen;
      if ((spend as any)?.has_overdraft) {
        const { data: acc } = await supabase
          .from('overdraft_accounts')
          .select('id')
          .eq('user_id', resolvedUserId)
          .eq('status', 'active')
          .maybeSingle();
        odAccountId = acc?.id || null;
      }
    } catch (_) { /* non-fatal */ }

    // If overdraft headroom can cover the loan reserve, waive the wallet reserve.
    if (reserve > 0 && !odFrozen && odAvailable >= reserve) {
      reserve = 0;
    }

    // Recompute wallet spendable now that reserve may have been waived above.
    const walletSpendableFinal = Math.max(0, baseAvailable - inFlightInstant - reserve);

    const spendable = walletSpendableFinal + odAvailable;
    if (numAmount > spendable) {
      const msg = reserve > 0
        ? `You have an active loan (as borrower or guarantor). UGX ${reserve.toLocaleString()} must remain in your wallet. Available to withdraw: UGX ${spendable.toLocaleString()}.`
        : odFrozen
          ? `Insufficient funds. Your overdraft is frozen (outstanding not cleared within 30 days). Wallet available: UGX ${walletSpendableFinal.toLocaleString()}.`
          : `Insufficient funds. Available: UGX ${spendable.toLocaleString()} (wallet ${walletSpendableFinal.toLocaleString()}${odAvailable>0?`, overdraft ${odAvailable.toLocaleString()}`:''}).`;
      return respond(false, { error: msg });
    }

    // Compute how much of this withdrawal actually needs the overdraft.
    // The real test is whether the raw wallet balance (not the reserved /
    // pending-adjusted "spendable") cannot cover the amount + service fee.
    // Using spendable inflated the OD portion whenever loan reserve or
    // in-flight items reduced spendable but the wallet itself was still
    // positive — leading to bogus OVERDRAFT_DRAW tags and missing / wrong
    // access-fee handling. Fee is included here because it debits the
    // wallet in the same transaction path.
    const feeForOdCheck = computeWithdrawFee(numAmount);
    const overdraftPortion = Math.max(0, (numAmount + feeForOdCheck) - walletBalance);
    const walletPortion = numAmount - overdraftPortion;
    const isOverdraftDraw = overdraftPortion > 0;

    // Upfront interest charged when the user accepts to dip into overdraft
    let odInterestRateBps = 50; // 0.5% default
    if (overdraftPortion > 0 && odAccountId) {
      try {
        const { data: odAcc } = await supabase
          .from('overdraft_accounts')
          .select('interest_rate_bps')
          .eq('id', odAccountId)
          .maybeSingle();
        if (odAcc?.interest_rate_bps != null) odInterestRateBps = Number(odAcc.interest_rate_bps);
      } catch (_) { /* keep default */ }
    }
    const upfrontInterest = overdraftPortion > 0
      ? Math.round(overdraftPortion * odInterestRateBps) / 10000
      : 0;

    // 2.75% access fee on the overdraft-funded portion (matches overdraft-draw / late-Monday path)
    const overdraftAccessFee = overdraftPortion > 0
      ? Math.round(overdraftPortion * 0.0275)
      : 0;

    // Block draw if user hasn't explicitly approved using their overdraft
    if (overdraftPortion > 0 && !acceptOverdraft) {
      return respond(false, {
        error: `This withdrawal exceeds your wallet by UGX ${overdraftPortion.toLocaleString()}. Approve using your overdraft (2.75% access fee UGX ${overdraftAccessFee.toLocaleString()} + upfront interest UGX ${upfrontInterest.toLocaleString()}) to continue.`,
        code: 'OVERDRAFT_NOT_ACCEPTED',
        wallet_portion: walletPortion,
        overdraft_portion: overdraftPortion,
        upfront_interest: upfrontInterest,
        access_fee: overdraftAccessFee,
      });
    }

    // Fetch employee name early for narrative
    const { data: empData } = await supabase
      .from('employees')
      .select('name, phone, wallet_frozen, wallet_frozen_reason, wallet_locked_amount, wallet_locked_reason')
      .eq('email', userEmail)
      .maybeSingle();

    // Block frozen wallets server-side (do not trust client UI)
    if (empData?.wallet_frozen) {
      console.warn(`[instant-withdrawal] Blocked frozen wallet for ${userEmail}`);
      return respond(false, {
        error: `Your wallet has been frozen by an administrator${empData.wallet_frozen_reason ? `: ${empData.wallet_frozen_reason}` : '.'} Please contact support.`,
      });
    }

    // Enforce partial wallet lock (e.g. 35% attendance lock).
    // The locked amount cannot be withdrawn from the wallet portion.
    const lockedAmount = Math.max(0, Number((empData as any)?.wallet_locked_amount || 0));
    if (lockedAmount > 0) {
      const walletAfterLock = Math.max(0, walletSpendableFinal - lockedAmount);
      if (walletPortion > walletAfterLock) {
        return respond(false, {
          error: `UGX ${lockedAmount.toLocaleString()} of your wallet is temporarily locked${empData?.wallet_locked_reason ? ` (${empData.wallet_locked_reason})` : ''}. Available to withdraw from wallet: UGX ${walletAfterLock.toLocaleString()}.`,
          code: 'WALLET_PARTIALLY_LOCKED',
          locked_amount: lockedAmount,
          wallet_available: walletAfterLock,
        });
      }
    }

    const employeeName = empData?.name || 'User';

    const cleanPhone = normalizePhone(depositPhone);
    const ref = `INSTANT-WD-${Date.now()}`;
    const remainingAfter = walletBalance - numAmount;

    // ── Provider routing ───────────────────────────────────────────────
    // Amounts < UGX 50,000 route via GosentePay AND require admin approval
    // before the money is actually sent. Amounts ≥ 50,000 continue to use
    // the Yo Payments direct payout flow below.
    const useGosente = numAmount < 50000;

    // Tiered withdrawal service fee — applied to every instant withdrawal
    // (both GosentePay and Yo Payments), charged in addition to the amount
    // and posted to the treasury as profit.
    const WITHDRAW_FEE = computeWithdrawFee(numAmount);
    if (spendable < numAmount + WITHDRAW_FEE) {
      return respond(false, {
        error: `Insufficient funds to cover the withdrawal plus the UGX ${WITHDRAW_FEE.toLocaleString()} service fee. Available: UGX ${spendable.toLocaleString()}.`,
      });
    }

    // Create tracking record
    const { data: instantRecord, error: insertErr } = await supabase
      .from('instant_withdrawals')
      .insert({
        user_id: resolvedUserId,
        amount: numAmount,
        phone_number: cleanPhone,
        payout_ref: ref,
        payout_status: useGosente ? 'pending_approval' : 'pending',
        payment_provider: useGosente ? 'gosente' : 'yo',
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error("[instant-withdrawal] Insert error:", insertErr);
      return respond(false, { error: "Failed to create withdrawal record: " + insertErr.message });
    }

    // ── GosentePay branch: hold funds, notify admins, wait for approval ──
    if (useGosente) {
      // Debit wallet immediately (holds the funds). Refund happens on reject
      // via the existing approval flow in useUnifiedApprovalRequests.
      const ledgerRef = `INSTANT-WD-${instantRecord.id}`;
      const { error: ledgerErr } = await supabase.from('ledger_entries').insert({
        user_id: resolvedUserId,
        entry_type: 'WITHDRAWAL',
        amount: -numAmount,
        reference: ledgerRef,
        source_category: isOverdraftDraw ? 'OVERDRAFT_DRAW' : 'INSTANT_WITHDRAWAL',
        metadata: {
          type: 'instant_withdrawal',
          phone: cleanPhone,
          payout_ref: ref,
          instant_withdrawal_id: instantRecord.id,
          payment_provider: 'gosente',
          status: 'pending_approval',
          wallet_portion: walletPortion,
          overdraft_portion: overdraftPortion,
          is_overdraft: isOverdraftDraw,
          interest_charged: upfrontInterest,
          interest_rate_bps: odInterestRateBps,
          bypass_treasury_check: true,
          description: 'Instant withdrawal (GosentePay) held pending admin approval',
        },
      });
      if (ledgerErr) {
        await supabase.from('instant_withdrawals')
          .update({ payout_status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', instantRecord.id);
        return respond(false, { error: 'Failed to hold funds: ' + ledgerErr.message });
      }

      // Debit the tiered withdrawal service fee as a separate ledger line so
      // it is clearly visible on the user's statement.
      if (WITHDRAW_FEE > 0) {
        const feeRef = `WD-FEE-${instantRecord.id}`;
        const { error: feeErr } = await supabase.from('ledger_entries').insert({
          user_id: resolvedUserId,
          entry_type: 'FEE',
          amount: -WITHDRAW_FEE,
          reference: feeRef,
          source_category: 'WITHDRAW_FEE',
          metadata: {
            type: 'withdraw_service_fee',
            instant_withdrawal_id: instantRecord.id,
            payout_ref: ref,
            provider: 'gosente',
            fee_amount: WITHDRAW_FEE,
            description: `Withdrawal service fee (UGX ${WITHDRAW_FEE.toLocaleString()}) for instant withdrawal via GosentePay`,
            bypass_treasury_check: true,
          },
        });
        if (feeErr) {
          console.error('[instant-withdrawal/gosente] fee ledger insert failed:', feeErr.message);
        } else {
          try {
            await supabase.rpc('post_treasury_profit', {
              p_amount: WITHDRAW_FEE,
              p_description: `Withdrawal service fee — ${employeeName} instant withdrawal (GosentePay)`,
              p_reference: `PROFIT-WD-FEE-${instantRecord.id}`,
              p_user_email: userEmail,
              p_user_name: employeeName,
              p_metadata: { source: 'instant_withdrawal', instant_withdrawal_id: instantRecord.id, profit_type: 'withdraw_fee', provider: 'gosente', fee_amount: WITHDRAW_FEE },
            });
          } catch (e) {
            console.error('[instant-withdrawal/gosente] treasury profit post failed:', (e as Error).message);
          }
        }
      }

      await supabase.from('instant_withdrawals')
        .update({ ledger_reference: ledgerRef })
        .eq('id', instantRecord.id);

      // Notify admins via email + SMS about the pending GosentePay approval
      const adminRecipients = [
        { name: 'Musema Wyclif', email: 'musemawyclif@greatpearlcoffee.com', phone: '256772000000' },
        { name: 'Bwambale Denis', email: 'bwambaledenis@greatpearlcoffee.com', phone: '256772000000' },
        { name: 'Fauza Kusa', email: 'fauzakusa@greatpearlcoffee.com', phone: '256772000000' },
      ];
      // Pull real admin phones from employees table
      try {
        const { data: adminEmps } = await supabase
          .from('employees')
          .select('name, email, phone')
          .in('email', adminRecipients.map(a => a.email));
        if (adminEmps) {
          for (const a of adminRecipients) {
            const match = adminEmps.find((e: any) => e.email === a.email);
            if (match?.phone) a.phone = match.phone;
          }
        }
      } catch (_) { /* best-effort */ }

      for (const admin of adminRecipients) {
        // Email
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'instant-withdrawal-approval-request',
              recipientEmail: admin.email,
              idempotencyKey: `wd-gp-approval-${instantRecord.id}-${admin.email}`,
              templateData: {
                approverName: admin.name.split(' ')[0],
                employeeName,
                amount: numAmount,
                phone: depositPhone,
                ref,
                remainingBalance: Math.max(0, remainingAfter),
                requestDate: new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                provider: 'GosentePay',
              },
            },
          });
        } catch (e) {
          console.error(`[instant-withdrawal/gosente] email err ${admin.email}:`, (e as Error).message);
        }
        // SMS
        if (admin.phone) {
          try {
            await supabase.functions.invoke('send-sms', {
              body: {
                phone: admin.phone,
                message: `APPROVAL NEEDED: ${employeeName} requested instant withdrawal UGX ${numAmount.toLocaleString()} to ${depositPhone} via GosentePay. Ref ${ref}. Approve in the Approvals page. - Great Agro Coffee`,
                userName: admin.name,
                messageType: 'approval_request',
                department: 'Admin',
                triggeredBy: userEmail,
              },
            });
          } catch (e) {
            console.error(`[instant-withdrawal/gosente] sms err ${admin.phone}:`, (e as Error).message);
          }
        }
      }

      return respond(true, {
        success: true,
        status: 'pending_approval',
        provider: 'gosente',
        ref,
        amount: numAmount,
        phone: cleanPhone,
        message: `Withdrawal request UGX ${numAmount.toLocaleString()} submitted for admin approval via GosentePay. You'll be notified once processed.`,
      });
    }

    // Trigger Yo Payments payout - include employee name and balance in narrative
    console.log(`[instant-withdrawal] Sending UGX ${numAmount} to ${cleanPhone} via Yo Payments`);

    const narrative = `${employeeName} - Instant withdrawal ${ref} - Bal: UGX ${remainingAfter.toLocaleString()}`;

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${yoUsername}</APIUsername>
    <APIPassword>${yoPassword}</APIPassword>
    <Method>acwithdrawfunds</Method>
    <Amount>${numAmount}</Amount>
    <Account>${cleanPhone}</Account>
    <AccountProviderCode>${getProviderCode(cleanPhone)}</AccountProviderCode>
    <Narrative>${escapeXml(narrative)}</Narrative>
    <ExternalReference>${escapeXml(ref)}</ExternalReference>
  </Request>
</AutoCreate>`;

    const yoResponse = await fetch(YO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml", "Content-Transfer-Encoding": "text" },
      body: xmlBody,
    });
    const yoText = await yoResponse.text();
    console.log(`[instant-withdrawal] Yo response: ${yoText}`);

    const statusMatch = yoText.match(/<Status>(.*?)<\/Status>/);
    const txRefMatch = yoText.match(/<TransactionReference>(.*?)<\/TransactionReference>/);
    const statusMsgMatch = yoText.match(/<StatusMessage>(.*?)<\/StatusMessage>/);
    const txStatusMatch = yoText.match(/<TransactionStatus>(.*?)<\/TransactionStatus>/);
    const statusCodeMatch = yoText.match(/<StatusCode>(.*?)<\/StatusCode>/);
    const yoStatus = statusMatch?.[1]?.trim();
    const txStatus = txStatusMatch?.[1]?.trim();
    const statusCode = statusCodeMatch?.[1]?.trim();

    // StatusCode -22 means "extra authorization required" — treat as pending approval, not failure
    const isPendingAuthorization = statusCode === '-22';

    if (yoStatus !== "OK" && !isPendingAuthorization) {
      await supabase.from('instant_withdrawals')
        .update({ payout_status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', instantRecord.id);

      const rawMsg = statusMsgMatch?.[1]?.trim() || "";
      const lower = rawMsg.toLowerCase();
      const isUnfunded =
        lower.includes("insufficient") ||
        lower.includes("not enough") ||
        lower.includes("balance") ||
        lower.includes("no funds") ||
        lower.includes("unfunded") ||
        lower.includes("float") ||
        lower.includes("low funds") ||
        statusCode === "1217" ||
        statusCode === "10403";

      if (isUnfunded) {
        return respond(false, { error: "Account not funded. Please try again later or contact support." });
      }

      return respond(false, {
        error: "Payout failed: " + (rawMsg || "Yo Payments rejected the transaction"),
      });
    }

    // acwithdrawfunds can return SUCCEEDED, FAILED, or PENDING
    // StatusCode -22 always means pending authorization
    const isPending = isPendingAuthorization || txStatus === 'PENDING' || txStatus === 'INDETERMINATE';
    const isFailed = !isPendingAuthorization && txStatus === 'FAILED';

    if (isFailed) {
      await supabase.from('instant_withdrawals')
        .update({ payout_status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', instantRecord.id);
      return respond(false, { error: "Payout failed at mobile money provider" });
    }

    const txRef = txRefMatch?.[1]?.trim() || ref;
    const finalStatus = isPending ? 'pending_approval' : 'success';

    // Deduct from wallet via ledger (deduct immediately even if pending approval)
    const ledgerRef = `INSTANT-WD-${instantRecord.id}`;
    const { data: ledgerRow, error: ledgerErr } = await supabase.from('ledger_entries').insert({
      user_id: resolvedUserId,
      entry_type: 'WITHDRAWAL',
      amount: -numAmount,
      reference: ledgerRef,
      source_category: isOverdraftDraw ? 'OVERDRAFT_DRAW' : 'INSTANT_WITHDRAWAL',
      metadata: {
        type: 'instant_withdrawal',
        phone: cleanPhone,
        payout_ref: txRef,
        instant_withdrawal_id: instantRecord.id,
        yo_status: txStatus,
        wallet_portion: walletPortion,
        overdraft_portion: overdraftPortion,
        is_overdraft: isOverdraftDraw,
        interest_charged: upfrontInterest,
        interest_rate_bps: odInterestRateBps,
        // Yo payout has ALREADY succeeded at this point — the treasury/float
        // check must not block recording the user-side debit, otherwise the
        // user keeps the cash AND the wallet balance (real money leak).
        bypass_treasury_check: true,
      },
    }).select('id').single();

    if (ledgerErr) {
      // Critical: payout already left Yo, but we couldn't debit the wallet.
      // Flag the row for reconciliation and alert admins instead of silently
      // returning success and letting the user keep the float.
      console.error('[instant-withdrawal] CRITICAL: ledger debit failed after successful payout:', ledgerErr.message);
      await supabase.from('instant_withdrawals')
        .update({
          payout_status: 'reconciliation_needed',
          payout_ref: txRef,
          ledger_reference: ledgerRef,
          completed_at: isPending ? null : new Date().toISOString(),
        })
        .eq('id', instantRecord.id);

      // Best-effort admin alert
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: 'fauzakusa@greatpearlcoffee.com',
            ccEmails: ['operations@greatpearlcoffee.com'],
            idempotencyKey: `instant-wd-reconcile-${instantRecord.id}`,
            templateData: {
              title: 'URGENT: Instant withdrawal needs manual ledger reconciliation',
              message: `Yo payout of UGX ${numAmount.toLocaleString()} to ${cleanPhone} for ${employeeName} (${userEmail}) succeeded (ref ${txRef}) but the wallet debit failed: ${ledgerErr.message}. Please post the missing debit manually with reference ${ledgerRef}.`,
            },
          },
        });
      } catch (_) { /* swallow */ }

      return respond(false, {
        error: 'Payout was sent but wallet sync failed. Operations has been alerted to reconcile. Please do not retry.',
        payoutRef: txRef,
        ledgerRef,
      });
    }

    // Update tracking record
    await supabase.from('instant_withdrawals')
      .update({
        payout_status: finalStatus,
        payout_ref: txRef,
        ledger_reference: ledgerRef,
        completed_at: isPending ? null : new Date().toISOString(),
      })
      .eq('id', instantRecord.id);

    // Tiered withdrawal service fee (Yo Payments branch) — debit + treasury profit
    if (WITHDRAW_FEE > 0) {
      const feeRef = `WD-FEE-${instantRecord.id}`;
      const { error: feeErr } = await supabase.from('ledger_entries').insert({
        user_id: resolvedUserId,
        entry_type: 'FEE',
        amount: -WITHDRAW_FEE,
        reference: feeRef,
        source_category: 'WITHDRAW_FEE',
        metadata: {
          type: 'withdraw_service_fee',
          instant_withdrawal_id: instantRecord.id,
          payout_ref: txRef,
          provider: 'yo',
          fee_amount: WITHDRAW_FEE,
          description: `Withdrawal service fee (UGX ${WITHDRAW_FEE.toLocaleString()}) for instant withdrawal via Yo Payments`,
          bypass_treasury_check: true,
        },
      });
      if (feeErr) {
        console.error('[instant-withdrawal/yo] fee ledger insert failed:', feeErr.message);
      } else {
        try {
          await supabase.rpc('post_treasury_profit', {
            p_amount: WITHDRAW_FEE,
            p_description: `Withdrawal service fee — ${employeeName} instant withdrawal (Yo)`,
            p_reference: `PROFIT-WD-FEE-${instantRecord.id}`,
            p_user_email: userEmail,
            p_user_name: employeeName,
            p_metadata: { source: 'instant_withdrawal', instant_withdrawal_id: instantRecord.id, profit_type: 'withdraw_fee', provider: 'yo', fee_amount: WITHDRAW_FEE },
          });
        } catch (e) {
          console.error('[instant-withdrawal/yo] treasury profit post failed:', (e as Error).message);
        }
      }
    }

    // Sync overdraft account only if this draw actually consumed overdraft
    if (isOverdraftDraw && odAccountId) {
      try {
        const { data: acc2 } = await supabase
          .from('overdraft_accounts')
          .select('outstanding_balance, total_drawn, total_interest')
          .eq('id', odAccountId)
          .single();
        const newOut = Number(acc2?.outstanding_balance || 0) + overdraftPortion + upfrontInterest + overdraftAccessFee;
        await supabase.from('overdraft_accounts').update({
          outstanding_balance: newOut,
          total_drawn: Number(acc2?.total_drawn || 0) + overdraftPortion,
          total_interest: Number(acc2?.total_interest || 0) + upfrontInterest,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', odAccountId);
        await supabase.from('overdraft_transactions').insert({
          account_id: odAccountId,
          user_id: resolvedUserId,
          transaction_type: 'draw',
          amount: overdraftPortion,
          balance_after: Number(acc2?.outstanding_balance || 0) + overdraftPortion,
          ledger_entry_id: ledgerRow?.id || null,
          reference: ledgerRef,
          metadata: { source: 'instant_withdrawal', wallet_portion: walletPortion, interest_charged: upfrontInterest, access_fee: overdraftAccessFee },
        });
        if (overdraftAccessFee > 0) {
          await supabase.from('overdraft_transactions').insert({
            account_id: odAccountId,
            user_id: resolvedUserId,
            transaction_type: 'fee',
            amount: overdraftAccessFee,
            balance_after: Number(acc2?.outstanding_balance || 0) + overdraftPortion + overdraftAccessFee,
            ledger_entry_id: null,
            reference: ledgerRef + '-FEE',
            metadata: {
              source: 'instant_withdrawal',
              fee_rate: 0.0275,
              draw_amount: overdraftPortion,
              note: '2.75% access fee on draw, added to outstanding',
            },
          });
        }
        if (upfrontInterest > 0) {
          await supabase.from('overdraft_transactions').insert({
            account_id: odAccountId,
            user_id: resolvedUserId,
            transaction_type: 'interest',
            amount: upfrontInterest,
            balance_after: newOut,
            ledger_entry_id: null,
            reference: ledgerRef + '-INT',
            metadata: {
              source: 'instant_withdrawal',
              rate_bps: odInterestRateBps,
              draw_amount: overdraftPortion,
              description: `Upfront interest on overdraft draw (${odInterestRateBps / 100}%)`,
            },
          });
        }
      } catch (e) {
        console.error('[instant-withdrawal] overdraft sync failed:', (e as Error).message);
      }
    }

    console.log(`[instant-withdrawal] ${finalStatus}! Ref: ${txRef}`);

    // Send SMS (fire and forget)
    const yoolaSmsApiKey = Deno.env.get("YOOLA_SMS_API_KEY");
    if (yoolaSmsApiKey && empData?.phone) {
      let smsPhone = empData.phone.replace(/\D/g, "");
      if (smsPhone.startsWith("0")) smsPhone = "+256" + smsPhone.slice(1);
      else if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;
      else if (!smsPhone.startsWith("+")) smsPhone = "+256" + smsPhone;

      try {
        await fetch("https://yoolasms.com/api/v1/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: smsPhone,
            message: `Dear ${employeeName}, UGX ${numAmount.toLocaleString()} has been sent to ${depositPhone} from your wallet. Ref: ${txRef}. Great Agro Coffee.`,
            api_key: yoolaSmsApiKey,
          }),
        });
      } catch (smsErr) {
        console.error("SMS error:", smsErr);
      }
    }

    // Calculate remaining balance for email
    let remainingBalance: number | undefined;
    try {
      const { data: balRpc } = await supabase.rpc('get_user_balance_safe', { user_email: userEmail });
      const wallet = Number((balRpc as any)?.[0]?.wallet_balance);
      if (Number.isFinite(wallet)) {
        remainingBalance = Math.max(0, wallet);
      } else {
        // Fallback to summing ledger entries by resolved user id
        const { data: balData } = await supabase
          .from('ledger_entries')
          .select('amount')
          .eq('user_id', resolvedUserId);
        if (balData) {
          remainingBalance = Math.max(0, balData.reduce((sum: number, e: any) => sum + Number(e.amount), 0));
        }
      }
    } catch (e) {
      console.error("Balance calc error:", e);
    }

    // Send email confirmation (fire and forget)
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'instant-withdrawal-confirmation',
          recipientEmail: userEmail,
          idempotencyKey: `instant-wd-confirm-${instantRecord.id}`,
          templateData: {
            employeeName,
            amount: numAmount,
            phone: depositPhone,
            ref: txRef,
            status: finalStatus,
            remainingBalance,
          },
        },
      });
      console.log(`[instant-withdrawal] Email confirmation sent to ${userEmail}`);
    } catch (emailErr) {
      console.error("[instant-withdrawal] Email error (non-blocking):", emailErr);
    }

    // If pending authorization (-22), send emails to admins
    if (isPending) {
      const adminRecipients = [
        { name: 'Musema Wyclif', email: 'musemawyclif@greatpearlcoffee.com' },
        { name: 'Bwambale Denis', email: 'bwambaledenis@greatpearlcoffee.com' },
        { name: 'Fauza Kusa', email: 'fauzakusa@greatpearlcoffee.com' },
      ];

      for (const admin of adminRecipients) {
        try {
          // Yo Payments authorization email
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'withdrawal-auth-request',
              recipientEmail: admin.email,
              idempotencyKey: `wd-auth-${instantRecord.id}-${admin.email}`,
              templateData: {
                adminName: admin.name.split(' ')[0],
                employeeName,
                amount: numAmount,
                phone: cleanPhone,
                ref: txRef,
                walletBalance: remainingBalance ?? remainingAfter,
              },
            },
          });

          // System approval notification email
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'instant-withdrawal-approval-request',
              recipientEmail: admin.email,
              idempotencyKey: `wd-sys-approval-${instantRecord.id}-${admin.email}`,
              templateData: {
                approverName: admin.name.split(' ')[0],
                employeeName,
                amount: numAmount,
                phone: depositPhone,
                ref: txRef,
                remainingBalance,
                requestDate: new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              },
            },
          });

          console.log(`[instant-withdrawal] Auth + system approval emails sent to ${admin.email}`);
        } catch (adminEmailErr) {
          console.error(`[instant-withdrawal] Admin email error for ${admin.email}:`, adminEmailErr);
        }
      }
    }

    return respond(true, {
      success: true,
      message: isPending 
        ? "Withdrawal request created successfully. Awaiting admin approval — you'll be notified once processed." 
        : "Instant withdrawal processed successfully",
      status: finalStatus,
      ref: txRef,
      amount: numAmount,
      phone: cleanPhone,
    });
  } catch (error) {
    console.error("[instant-withdrawal] Unhandled error:", error);
    return respond(false, {
      error: error instanceof Error ? (error as Error).message : "Unknown error",
    });
  }
});
