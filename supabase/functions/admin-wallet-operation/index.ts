import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Tiered withdrawal service fee — mirrors instant-withdrawal.
function computeWithdrawFee(amount: number): number {
  const a = Number(amount) || 0;
  if (a < 500) return 0;
  if (a <= 60_000) return 1_100;
  if (a <= 500_000) return 1_700;
  if (a <= 1_000_000) return 2_500;
  return 2_900;
}

// Overdraft access fee: 2.75% of the portion drawn from OD.
const OD_ACCESS_FEE_BPS = 275;

async function sendSms(
  supabase: any,
  phone: string | null,
  message: string,
  userName?: string,
  authHeader?: string,
  messageType = "admin_wallet_operation",
  recipientEmail?: string | null,
) {
  if (!phone) return;
  try {
    // Call send-sms directly with the caller's JWT — invoking via the
    // service-role client returns 401 (send-sms requires a bearer user token).
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anon,
        "Authorization": authHeader || `Bearer ${service}`,
      },
      body: JSON.stringify({
        phone,
        message,
        userName: userName || "User",
        messageType,
        recipientEmail: recipientEmail || undefined,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.warn("[admin-wallet-op] SMS send non-OK:", res.status, t.slice(0, 200));
    } else {
      await res.text().catch(() => "");
    }
  } catch (e) {
    console.warn("[admin-wallet-op] SMS send failed:", (e as Error).message);
  }
}

function ugx(n: number | null | undefined): string {
  return `UGX ${(Number(n) || 0).toLocaleString()}`;
}

/**
 * Single entry point for ALL user-facing notifications about admin wallet
 * operations (credit / debit / transfer / withdraw), both on success and on
 * failure. Sends SMS (BulkSMS premium route) AND a branded email, always
 * including the resulting wallet balance where known.
 */
async function notifyWalletOperation(supabase: any, args: {
  authHeader?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  title: string;
  smsText: string;
  lines: Array<[string, string]>;
  note?: string;
  failed?: boolean;
}) {
  const name = args.name || "User";
  let phone = args.phone || null;
  let email = args.email || null;
  if ((!phone || !email) && (args.email || args.name)) {
    try {
      const { data: emp } = await supabase
        .from("employees")
        .select("phone, email, name")
        .eq("email", args.email || "")
        .maybeSingle();
      phone = phone || emp?.phone || null;
      email = email || emp?.email || null;
    } catch (_) { /* best effort */ }
  }

  // ---- SMS (BulkSMS premium route for wallet operations)
  await sendSms(
    supabase,
    phone,
    args.smsText,
    name,
    args.authHeader,
    args.failed ? "admin_wallet_operation_failed" : "admin_wallet_operation",
    email,
  );

  // ---- Email
  if (!email) return;
  try {
    const rows = args.lines
      .map(([k, v]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${v}</td></tr>`)
      .join("");
    const html = `
      <p>Dear ${name},</p>
      <p>${args.failed
        ? "An administrator attempted a wallet operation on your account but it <strong>did not complete</strong>. No further action is required from you; the operation may be retried."
        : "An administrator has performed the following operation on your wallet."}</p>
      <table style="border-collapse:collapse;width:100%;max-width:520px;border:1px solid #eee">${rows}</table>
      ${args.note ? `<p style="color:#555">${args.note}</p>` : ""}
      <p style="color:#555">If you did not expect this, contact Administration or Finance immediately.</p>
      <p>— Great Agro Coffee</p>`;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        to: email,
        cc: "operations@greatpearlcoffee.com",
        subject: args.title,
        html,
        messageType: args.failed ? "admin_wallet_operation_failed" : "admin_wallet_operation",
      },
    });
  } catch (e) {
    console.warn("[admin-wallet-op] email send failed:", (e as Error).message);
  }
}


// ------------------------------------------------------------------ OTP utils
function generateOtp(): string {
  // 6-digit numeric, no leading zero problem (padded).
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
}

async function hashOtp(code: string, opId: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(`${opId}:${code}`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getLedgerBalance(supabase: any, userId: string): Promise<number> {
  const { data } = await supabase
    .from("ledger_entries")
    .select("entry_type, amount")
    .eq("user_id", userId);
  return (data || []).reduce((s: number, r: any) => {
    const amt = Number(r.amount) || 0;
    // Amounts are stored SIGNED (a DB trigger normalises debits to negative).
    // Never re-apply a sign to an already-negative amount — that turns debits
    // into credits and silently inflates the balance (missed overdraft fees).
    if (amt < 0) return s + amt;
    const credits = new Set([
      "DEPOSIT","LOYALTY_REWARD","BONUS","MONTHLY_SALARY","LOAN_DISBURSEMENT",
      "HOST_MEETING_BONUS","MEETING_ATTENDANCE_BONUS","REVERSAL","ADJUSTMENT",
    ]);
    return credits.has(r.entry_type) ? s + amt : s - amt;
  }, 0);
}

async function postLedger(supabase: any, args: {
  user_id: string;
  entry_type: "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT";
  amount: number;
  reference: string;
  source_category: string;
  metadata: Record<string, unknown>;
}) {
  const { error } = await supabase.from("ledger_entries").insert({
    user_id: args.user_id,
    entry_type: args.entry_type,
    amount: args.amount,
    reference: args.reference,
    source_category: args.source_category,
    metadata: args.metadata,
  });
  if (error) throw new Error(`ledger insert failed: ${error.message}`);
}

// Records an admin-initiated overdraft draw (and its access fee) on the
// overdraft account + transactions so it appears on the Overdraft page.
async function recordOverdraftUsage(supabase: any, args: {
  user_id: string;
  email?: string | null;
  name?: string | null;
  draw: number;
  fee: number;
  reference: string;
  reason?: string | null;
}) {
  try {
    if (!(args.draw > 0)) return;
    let { data: account } = await supabase
      .from("overdraft_accounts")
      .select("*")
      .eq("user_id", args.user_id)
      .eq("status", "active")
      .maybeSingle();

    if (!account) {
      const { data: created } = await supabase
        .from("overdraft_accounts")
        .insert({
          user_id: args.user_id,
          employee_email: args.email || null,
          employee_name: args.name || null,
          status: "active",
          approved_limit: Math.max(100000, Math.ceil((args.draw + args.fee) / 1000) * 1000),
          outstanding_balance: 0,
          total_drawn: 0,
          approved_by: "SYSTEM_ADMIN_WALLET_OP",
          approved_at: new Date().toISOString(),
          auto_managed: true,
        })
        .select("*")
        .maybeSingle();
      account = created;
    }
    if (!account) return;

    const total = args.draw + args.fee;
    const newOutstanding = Number(account.outstanding_balance || 0) + total;

    await supabase.from("overdraft_accounts").update({
      outstanding_balance: newOutstanding,
      total_drawn: Number(account.total_drawn || 0) + args.draw,
      last_used_at: new Date().toISOString(),
      first_negative_at: account.first_negative_at || new Date().toISOString(),
    }).eq("id", account.id);

    const rows: any[] = [{
      account_id: account.id,
      user_id: args.user_id,
      transaction_type: "draw",
      amount: args.draw,
      balance_after: newOutstanding,
      reference: `${args.reference}-ODDRAW`,
      metadata: { source: "admin_wallet_operation", reason: args.reason || null },
    }];
    if (args.fee > 0) {
      rows.push({
        account_id: account.id,
        user_id: args.user_id,
        transaction_type: "fee",
        amount: args.fee,
        balance_after: newOutstanding,
        reference: `${args.reference}-ODFEE`,
        metadata: { source: "admin_wallet_operation", fee_rate: 0.0275, draw_amount: args.draw },
      });
    }
    await supabase.from("overdraft_transactions").insert(rows);
  } catch (e) {
    console.error("[admin-wallet-op] overdraft record failed:", (e as Error).message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return respond(false, { error: "Unauthorized" });

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user?.email) return respond(false, { error: "Invalid token" });

    const actorId = userData.user.id;
    const actorEmail = userData.user.email;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify actor is an administrator
    const { data: actorEmp } = await supabase
      .from("employees")
      .select("role, name")
      .eq("email", actorEmail)
      .maybeSingle();
    const actorRole = actorEmp?.role || "";
    const isAdmin = actorRole === "Administrator" || actorRole === "Super Admin";
    if (!isAdmin) return respond(false, { error: "Forbidden: administrators only" });

    // Super administrators may execute wallet operations instantly (no co-signer).
    const SUPER_ADMIN_EMAILS = [
      "fauzakusa@greatpearlcoffee.com",
      "kelvifauza@gmail.com",
      "nickscott@greatpearlcoffee.com",
    ];
    const isSuperAdmin =
      actorRole === "Super Admin" || SUPER_ADMIN_EMAILS.includes((actorEmail || "").toLowerCase());

    const body = await req.json();
    const action = body.action as string;

    // ---------------------------------------------------------------- CREATE
    if (action === "create") {
      const {
        operation_type, target_email, amount, reason,
        destination_email, destination_phone, payout_provider, allow_overdraft,
        confirmation_method,
      } = body;

      if (!["credit", "debit", "transfer", "withdraw"].includes(operation_type)) {
        return respond(false, { error: "Invalid operation_type" });
      }
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) return respond(false, { error: "Amount must be > 0" });
      if (!target_email) return respond(false, { error: "target_email required" });
      if (!reason || String(reason).trim().length < 3) return respond(false, { error: "Reason required (min 3 chars)" });

      let confMethod: string =
        confirmation_method === "user_otp" ? "user_otp"
        : confirmation_method === "instant" ? "instant"
        : "second_admin";
      if (confMethod === "instant" && !isSuperAdmin) {
        return respond(false, { error: "Only a super administrator can execute instantly" });
      }

      const { data: target } = await supabase
        .from("employees")
        .select("id, name, email, phone")
        .eq("email", target_email)
        .maybeSingle();
      if (!target) return respond(false, { error: "Target employee not found" });

      const { data: targetUid } = await supabase.rpc("get_unified_user_id", { input_email: target.email });
      const targetUserId = targetUid || target.id;

      let destUserId: string | null = null;
      let destName: string | null = null;
      if (operation_type === "transfer") {
        if (!destination_email) return respond(false, { error: "destination_email required for transfer" });
        if (destination_email === target_email) return respond(false, { error: "Source and destination cannot be same" });
        const { data: dest } = await supabase
          .from("employees").select("id, name, email").eq("email", destination_email).maybeSingle();
        if (!dest) return respond(false, { error: "Destination employee not found" });
        const { data: destUid } = await supabase.rpc("get_unified_user_id", { input_email: dest.email });
        destUserId = destUid || dest.id;
        destName = dest.name;
      }

      let serviceFee = 0;
      if (operation_type === "withdraw") {
        if (!destination_phone) return respond(false, { error: "destination_phone required for withdraw" });
        if (!payout_provider || !["gosentepay", "yo", "cash"].includes(payout_provider)) {
          return respond(false, { error: "payout_provider required (gosentepay|yo|cash)" });
        }
        if (payout_provider !== "cash") serviceFee = computeWithdrawFee(numAmount);
      }

      // If OTP mode, phone is required so we can SMS the code.
      if (confMethod === "user_otp" && !target.phone) {
        return respond(false, { error: "Target user has no phone on file; OTP confirmation not possible." });
      }

      // Pre-generate OTP + hash so we can store it atomically with the row.
      let otpPlain: string | null = null;
      let otpHash: string | null = null;
      let otpExpiresAt: string | null = null;
      if (confMethod === "user_otp") {
        otpPlain = generateOtp();
        // hashOtp needs an ID; use a random ref (final ID unknown yet). We'll re-hash post-insert.
        otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
      }

      const { data: inserted, error: insErr } = await supabase
        .from("admin_wallet_operations")
        .insert({
          operation_type,
          target_user_id: targetUserId,
          target_email: target.email,
          target_name: target.name,
          target_phone: target.phone,
          amount: numAmount,
          reason: String(reason).trim(),
          destination_user_id: destUserId,
          destination_email: operation_type === "transfer" ? destination_email : null,
          destination_name: destName,
          destination_phone: operation_type === "withdraw" ? destination_phone : null,
          payout_provider: operation_type === "withdraw" ? payout_provider : null,
          service_fee: serviceFee,
          allow_overdraft: !!allow_overdraft,
          initiated_by: actorId,
          initiated_by_email: actorEmail,
          initiated_by_name: actorEmp?.name || actorEmail,
          confirmation_method: confMethod,
          otp_expires_at: otpExpiresAt,
        })
        .select("*")
        .single();
      if (insErr) return respond(false, { error: insErr.message });

      // Now that we have op.id, hash OTP and persist, then SMS the user.
      if (confMethod === "user_otp" && otpPlain) {
        const h = await hashOtp(otpPlain, inserted.id);
        await supabase.from("admin_wallet_operations")
          .update({ otp_hash: h })
          .eq("id", inserted.id);

        const opLabel =
          operation_type === "credit" ? `credit UGX ${numAmount.toLocaleString()} to your wallet` :
          operation_type === "debit" ? `debit UGX ${numAmount.toLocaleString()} from your wallet` :
          operation_type === "transfer" ? `transfer UGX ${numAmount.toLocaleString()} from your wallet to ${destName || destination_email}` :
          `withdraw UGX ${numAmount.toLocaleString()} from your wallet to ${destination_phone}`;

        const msg = `Great Agro: Admin ${actorEmp?.name || actorEmail} requests to ${opLabel}. Reason: ${String(reason).trim()}. Confirm with code ${otpPlain} (valid 15 min). If not you, reply STOP.`;
        await sendSms(supabase, target.phone, msg, target.name, authHeader);

        return respond(true, {
          operation: inserted,
          message: `OTP sent to ${target.name || target.email} for confirmation`,
          confirmation_method: "user_otp",
        });
      }

      return respond(true, {
        operation: inserted,
        message: confMethod === "instant"
          ? "Request created — executing instantly"
          : "Request created, awaiting second admin approval",
        confirmation_method: confMethod,
      });
    }

    // ---------------------------------------------------------------- REJECT
    if (action === "reject") {
      const { operation_id, rejected_reason } = body;
      if (!operation_id) return respond(false, { error: "operation_id required" });
      const { data: op } = await supabase
        .from("admin_wallet_operations").select("*").eq("id", operation_id).maybeSingle();
      if (!op) return respond(false, { error: "Operation not found" });
      if (op.status !== "pending") return respond(false, { error: `Cannot reject a ${op.status} operation` });

      await supabase.from("admin_wallet_operations").update({
        status: "rejected",
        approved_by: actorId,
        approved_by_email: actorEmail,
        approved_by_name: actorEmp?.name || actorEmail,
        approved_at: new Date().toISOString(),
        rejected_reason: rejected_reason || null,
      }).eq("id", operation_id);

      return respond(true, { message: "Operation rejected" });
    }

    // ---------------------------------------------------------------- APPROVE
    if (action === "approve" || action === "confirm_otp") {
      const { operation_id, otp_code } = body;
      if (!operation_id) return respond(false, { error: "operation_id required" });

      let op: any = null;
      let opErr: any = null;

      if (action === "approve") {
        // Atomic claim: pending -> approved.
        // Normal flow requires a *different* admin (second_admin). Super admins can
        // self-execute operations they created with confirmation_method = 'instant'.
        let q = supabase
          .from("admin_wallet_operations")
          .update({
            status: "approved",
            approved_by: actorId,
            approved_by_email: actorEmail,
            approved_by_name: actorEmp?.name || actorEmail,
            approved_at: new Date().toISOString(),
          })
          .eq("id", operation_id)
          .eq("status", "pending");
        if (isSuperAdmin) {
          q = q.in("confirmation_method", ["second_admin", "instant"]);
        } else {
          q = q.eq("confirmation_method", "second_admin").neq("initiated_by", actorId);
        }
        const res = await q.select("*").maybeSingle();
        op = res.data; opErr = res.error;
        if (opErr) return respond(false, { error: opErr.message });
        if (!op) {
          return respond(false, {
            error: "Cannot approve: not pending, you initiated it, or it uses OTP confirmation.",
          });
        }
      } else {
        // confirm_otp — verify code and atomically claim.
        if (!otp_code || String(otp_code).trim().length < 4) {
          return respond(false, { error: "OTP code required" });
        }
        const { data: candidate } = await supabase
          .from("admin_wallet_operations")
          .select("*")
          .eq("id", operation_id)
          .maybeSingle();
        if (!candidate) return respond(false, { error: "Operation not found" });
        if (candidate.status !== "pending") return respond(false, { error: `Cannot confirm a ${candidate.status} operation` });
        if (candidate.confirmation_method !== "user_otp") return respond(false, { error: "This request does not use OTP confirmation" });
        if (!candidate.otp_hash || !candidate.otp_expires_at) return respond(false, { error: "OTP not set on this request" });
        if (new Date(candidate.otp_expires_at).getTime() < Date.now()) {
          return respond(false, { error: "OTP has expired. Ask the admin to re-issue the request." });
        }
        if ((candidate.otp_attempts || 0) >= 5) {
          return respond(false, { error: "Too many attempts. Ask the admin to re-issue the request." });
        }
        const givenHash = await hashOtp(String(otp_code).trim(), candidate.id);
        if (givenHash !== candidate.otp_hash) {
          await supabase.from("admin_wallet_operations")
            .update({ otp_attempts: (candidate.otp_attempts || 0) + 1 })
            .eq("id", operation_id);
          return respond(false, { error: "Invalid OTP code" });
        }
        // Atomic claim
        const res = await supabase
          .from("admin_wallet_operations")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            otp_confirmed_at: new Date().toISOString(),
            otp_confirmed_by: actorEmail,
            approved_by_email: actorEmail,
            approved_by_name: actorEmp?.name || actorEmail,
            approved_by: actorId,
          })
          .eq("id", operation_id)
          .eq("status", "pending")
          .select("*")
          .maybeSingle();
        op = res.data; opErr = res.error;
        if (opErr) return respond(false, { error: opErr.message });
        if (!op) return respond(false, { error: "Request status changed; refresh and retry." });
      }

      // ------------------------------------------------------------ EXECUTE
      const ref = `AWO-${op.id.slice(0, 8)}-${Date.now()}`;
      const amount = Number(op.amount);
      let overdraftAccessFee = 0;
      let odPortion = 0;

      try {
        if (op.operation_type === "credit") {
          await postLedger(supabase, {
            user_id: op.target_user_id,
            entry_type: "DEPOSIT",
            amount,
            reference: ref,
            source_category: "ADMIN_ADJUSTMENT",
            metadata: {
              description: `Admin credit: ${op.reason}`,
              admin_wallet_operation_id: op.id,
              initiated_by: op.initiated_by_email,
              approved_by: actorEmail,
            },
          });
          const newBal = await getLedgerBalance(supabase, op.target_user_id);
          await notifyWalletOperation(supabase, {
            authHeader,
            email: op.target_email,
            phone: op.target_phone,
            name: op.target_name,
            title: `Wallet Credited — ${ugx(amount)}`,
            smsText: `Dear ${op.target_name || "User"}, ${ugx(amount)} has been CREDITED to your wallet by admin. Reason: ${op.reason}. New balance: ${ugx(newBal)}. Ref ${ref}.`,
            lines: [
              ["Operation", "Credit"],
              ["Amount", ugx(amount)],
              ["Reason", String(op.reason || "-")],
              ["New wallet balance", ugx(newBal)],
              ["Reference", ref],
              ["Approved by", String(actorEmail || "-")],
            ],
          });

        }

        else if (op.operation_type === "debit") {
          const bal = await getLedgerBalance(supabase, op.target_user_id);
          const afterBal = bal - amount;
          if (afterBal < 0 && !op.allow_overdraft) {
            throw new Error(`Insufficient funds. Balance UGX ${bal.toLocaleString()}, requested UGX ${amount.toLocaleString()}. Enable "allow overdraft" to proceed.`);
          }
          if (afterBal < 0) {
            odPortion = Math.min(amount, -afterBal);
            overdraftAccessFee = Math.round((odPortion * OD_ACCESS_FEE_BPS) / 10000);
          }
          await postLedger(supabase, {
            user_id: op.target_user_id, entry_type: "WITHDRAWAL", amount, reference: ref,
            source_category: odPortion > 0 ? "OVERDRAFT_DRAW" : "ADMIN_ADJUSTMENT",
            metadata: {
              description: `Admin debit: ${op.reason}`,
              admin_wallet_operation_id: op.id,
              overdraft_portion: odPortion,
            },
          });
          if (overdraftAccessFee > 0) {
            await postLedger(supabase, {
              user_id: op.target_user_id, entry_type: "WITHDRAWAL", amount: overdraftAccessFee, reference: `${ref}-ODFEE`,
              source_category: "OVERDRAFT_FEE",
              metadata: { description: "2.75% overdraft access fee", admin_wallet_operation_id: op.id },
            });
          }
          await recordOverdraftUsage(supabase, {
            user_id: op.target_user_id, email: op.target_email, name: op.target_name,
            draw: odPortion, fee: overdraftAccessFee, reference: ref, reason: op.reason,
          });
          const newBal = await getLedgerBalance(supabase, op.target_user_id);
          await notifyWalletOperation(supabase, {
            authHeader,
            email: op.target_email,
            phone: op.target_phone,
            name: op.target_name,
            title: `Wallet Debited — ${ugx(amount)}`,
            smsText: `Dear ${op.target_name || "User"}, ${ugx(amount)} has been DEBITED from your wallet by admin. Reason: ${op.reason}.${overdraftAccessFee > 0 ? ` Overdraft fee: ${ugx(overdraftAccessFee)}.` : ""} New balance: ${ugx(newBal)}. Ref ${ref}.`,
            lines: [
              ["Operation", "Debit"],
              ["Amount", ugx(amount)],
              ...(overdraftAccessFee > 0 ? [["Overdraft drawn", ugx(odPortion)] as [string, string], ["Overdraft access fee (2.75%)", ugx(overdraftAccessFee)] as [string, string]] : []),
              ["Reason", String(op.reason || "-")],
              ["New wallet balance", ugx(newBal)],
              ["Reference", ref],
              ["Approved by", String(actorEmail || "-")],
            ],
            note: newBal < 0 ? "Your wallet is currently in overdraft (negative balance). It will be recovered automatically from future credits." : undefined,
          });

        }

        else if (op.operation_type === "transfer") {
          const bal = await getLedgerBalance(supabase, op.target_user_id);
          const afterBal = bal - amount;
          if (afterBal < 0 && !op.allow_overdraft) {
            throw new Error(`Insufficient funds. Balance UGX ${bal.toLocaleString()}.`);
          }
          if (afterBal < 0) {
            odPortion = Math.min(amount, -afterBal);
            overdraftAccessFee = Math.round((odPortion * OD_ACCESS_FEE_BPS) / 10000);
          }
          await postLedger(supabase, {
            user_id: op.target_user_id, entry_type: "WITHDRAWAL", amount, reference: `${ref}-OUT`,
            source_category: "TRANSFER_OUT",
            metadata: {
              description: `Admin transfer to ${op.destination_name || op.destination_email}: ${op.reason}`,
              admin_wallet_operation_id: op.id,
              destination_email: op.destination_email,
            },
          });
          if (overdraftAccessFee > 0) {
            await postLedger(supabase, {
              user_id: op.target_user_id, entry_type: "WITHDRAWAL", amount: overdraftAccessFee, reference: `${ref}-ODFEE`,
              source_category: "OVERDRAFT_FEE",
              metadata: { description: "2.75% overdraft access fee", admin_wallet_operation_id: op.id },
            });
          }
          await recordOverdraftUsage(supabase, {
            user_id: op.target_user_id, email: op.target_email, name: op.target_name,
            draw: odPortion, fee: overdraftAccessFee, reference: ref, reason: op.reason,
          });
          await postLedger(supabase, {
            user_id: op.destination_user_id!, entry_type: "DEPOSIT", amount, reference: `${ref}-IN`,
            source_category: "TRANSFER_IN",
            metadata: {
              description: `Admin transfer from ${op.target_name || op.target_email}: ${op.reason}`,
              admin_wallet_operation_id: op.id,
              source_email: op.target_email,
            },
          });
          const smsSource = `Dear ${op.target_name || "User"}, UGX ${amount.toLocaleString()} has been transferred from your wallet to ${op.destination_name || op.destination_email} by admin. Reason: ${op.reason}.`;
          const smsDest = `Dear ${op.destination_name || "User"}, UGX ${amount.toLocaleString()} has been credited to your wallet from ${op.target_name || op.target_email} by admin.`;
          await sendSms(supabase, op.target_phone, smsSource, op.target_name, authHeader);
          // Fetch destination phone
          const { data: destEmp } = await supabase.from("employees").select("phone").eq("email", op.destination_email).maybeSingle();
          await sendSms(supabase, destEmp?.phone, smsDest, op.destination_name, authHeader);
        }

        else if (op.operation_type === "withdraw") {
          const bal = await getLedgerBalance(supabase, op.target_user_id);
          const totalDebit = amount + Number(op.service_fee);
          const afterBal = bal - totalDebit;
          if (afterBal < 0 && !op.allow_overdraft) {
            throw new Error(`Insufficient funds. Balance UGX ${bal.toLocaleString()}, need UGX ${totalDebit.toLocaleString()}.`);
          }
          if (afterBal < 0) {
            odPortion = Math.min(totalDebit, -afterBal);
            overdraftAccessFee = Math.round((odPortion * OD_ACCESS_FEE_BPS) / 10000);
          }

          // Post wallet debit for principal
          await postLedger(supabase, {
            user_id: op.target_user_id, entry_type: "WITHDRAWAL", amount, reference: ref,
            source_category: "INSTANT_WITHDRAWAL",
            metadata: {
              description: `Admin-initiated withdrawal to ${op.destination_phone} (${op.payout_provider}): ${op.reason}`,
              admin_wallet_operation_id: op.id,
              destination_phone: op.destination_phone,
              provider: op.payout_provider,
            },
          });
          if (Number(op.service_fee) > 0) {
            await postLedger(supabase, {
              user_id: op.target_user_id, entry_type: "WITHDRAWAL", amount: Number(op.service_fee),
              reference: `${ref}-FEE`, source_category: "WITHDRAW_FEE",
              metadata: { description: "Withdrawal service fee", admin_wallet_operation_id: op.id },
            });
          }
          if (overdraftAccessFee > 0) {
            await postLedger(supabase, {
              user_id: op.target_user_id, entry_type: "WITHDRAWAL", amount: overdraftAccessFee,
              reference: `${ref}-ODFEE`, source_category: "OVERDRAFT_FEE",
              metadata: { description: "2.75% overdraft access fee", admin_wallet_operation_id: op.id },
            });
          }
          await recordOverdraftUsage(supabase, {
            user_id: op.target_user_id, email: op.target_email, name: op.target_name,
            draw: odPortion, fee: overdraftAccessFee, reference: ref, reason: op.reason,
          });

          // Trigger payout
          let gatewayRef: string | null = null;
          if (op.payout_provider === "gosentepay") {
            const gwRef = `AWO${Date.now()}${op.id.slice(0, 6)}`;
            const res = await gosenteWithdraw({
              phone: op.destination_phone,
              amount,
              email: op.target_email || "admin@greatpearlcoffee.com",
              reason: op.reason.slice(0, 120),
              ref: gwRef,
            });
            gatewayRef = gwRef;
            if (!isGosenteSuccess(res.status, res.body)) {
              throw new Error(`GosentePay payout failed: ${JSON.stringify(res.body).slice(0, 300)}`);
            }
          } else if (op.payout_provider === "yo") {
            const yoRes = await yoPayout({
              phone: normalizePhone(op.destination_phone),
              amount,
              narrative: `Wallet withdrawal - ${ref}`.slice(0, 120),
            });
            gatewayRef = yoRes.transactionRef || `YO-${Date.now()}`;
            // StatusCode -22 = accepted by Yo, awaiting extra authorization.
            // Treat as queued (not a failure) so we never double-submit.
            const yoPending = (yoRes.statusMessage || "").includes("StatusCode:-22");
            if (yoPending) {
              gatewayRef = yoRes.transactionRef || `YO-PENDING-AUTH-${Date.now()}`;
            } else if (!yoRes.success) {
              throw new Error(`Yo payout failed: ${yoRes.errorMessage || "unknown error"}`);
            }
          } else {
            gatewayRef = `CASH-${Date.now()}`;
          }

          const smsMsg = `Dear ${op.target_name || "User"}, UGX ${amount.toLocaleString()} has been withdrawn from your wallet by admin to ${op.destination_phone}. Fee: UGX ${Number(op.service_fee).toLocaleString()}${overdraftAccessFee > 0 ? `, OD fee: UGX ${overdraftAccessFee.toLocaleString()}` : ""}. Reason: ${op.reason}.`;
          await sendSms(supabase, op.target_phone, smsMsg, op.target_name, authHeader);

          await supabase.from("admin_wallet_operations").update({
            gateway_reference: gatewayRef,
          }).eq("id", op.id);
        }

        await supabase.from("admin_wallet_operations").update({
          status: "completed",
          executed_at: new Date().toISOString(),
          ledger_reference: ref,
          overdraft_access_fee: overdraftAccessFee,
          metadata: { ...(op.metadata || {}), overdraft_portion: odPortion },
        }).eq("id", op.id);

        return respond(true, { message: "Operation approved and executed", reference: ref });
      } catch (execErr) {
        const errMsg = (execErr as Error).message || "Execution failed";
        console.error("[admin-wallet-op] execution error:", errMsg);
        // Roll the operation back to pending so a second admin can retry.
        // Keep the approval audit fields so we know who tried last.
        await supabase.from("admin_wallet_operations").update({
          status: "pending",
          execution_error: errMsg,
          approved_by: null,
          approved_by_email: null,
          approved_by_name: null,
          approved_at: null,
        }).eq("id", op.id);
        return respond(false, { error: errMsg, retryable: true });
      }
    }

    return respond(false, { error: `Unknown action: ${action}` });
  } catch (err) {
    console.error("[admin-wallet-operation] fatal:", err);
    return respond(false, { error: (err as Error).message || "Internal error" });
  }
});