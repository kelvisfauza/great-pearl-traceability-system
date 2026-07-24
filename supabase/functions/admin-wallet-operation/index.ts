import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gosenteWithdraw, isGosenteSuccess } from "../_shared/gosentepay.ts";

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

async function sendSms(supabase: any, phone: string | null, message: string, userName?: string) {
  if (!phone) return;
  try {
    await supabase.functions.invoke("send-sms", {
      body: { phone, message, userName: userName || "User", messageType: "admin_wallet_op" },
    });
  } catch (e) {
    console.warn("[admin-wallet-op] SMS send failed:", (e as Error).message);
  }
}

async function getLedgerBalance(supabase: any, userId: string): Promise<number> {
  const { data } = await supabase
    .from("ledger_entries")
    .select("entry_type, amount")
    .eq("user_id", userId);
  return (data || []).reduce((s: number, r: any) => {
    const amt = Number(r.amount) || 0;
    return r.entry_type === "CREDIT" ? s + amt : s - amt;
  }, 0);
}

async function postLedger(supabase: any, args: {
  user_id: string;
  entry_type: "CREDIT" | "DEBIT";
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

    const body = await req.json();
    const action = body.action as string;

    // ---------------------------------------------------------------- CREATE
    if (action === "create") {
      const {
        operation_type, target_email, amount, reason,
        destination_email, destination_phone, payout_provider, allow_overdraft,
      } = body;

      if (!["credit", "debit", "transfer", "withdraw"].includes(operation_type)) {
        return respond(false, { error: "Invalid operation_type" });
      }
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) return respond(false, { error: "Amount must be > 0" });
      if (!target_email) return respond(false, { error: "target_email required" });
      if (!reason || String(reason).trim().length < 3) return respond(false, { error: "Reason required (min 3 chars)" });

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
        })
        .select("*")
        .single();
      if (insErr) return respond(false, { error: insErr.message });

      return respond(true, { operation: inserted, message: "Request created, awaiting second admin approval" });
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
    if (action === "approve") {
      const { operation_id } = body;
      if (!operation_id) return respond(false, { error: "operation_id required" });

      // Atomic claim: only pending -> approved, and only by a different admin
      const { data: op, error: opErr } = await supabase
        .from("admin_wallet_operations")
        .update({
          status: "approved",
          approved_by: actorId,
          approved_by_email: actorEmail,
          approved_by_name: actorEmp?.name || actorEmail,
          approved_at: new Date().toISOString(),
        })
        .eq("id", operation_id)
        .eq("status", "pending")
        .neq("initiated_by", actorId)
        .select("*")
        .maybeSingle();

      if (opErr) return respond(false, { error: opErr.message });
      if (!op) {
        return respond(false, {
          error: "Cannot approve: request is not pending, or you initiated it (second admin required).",
        });
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
            entry_type: "CREDIT",
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
          const smsMsg = `Dear ${op.target_name || "User"}, UGX ${amount.toLocaleString()} has been credited to your wallet by admin. Reason: ${op.reason}.`;
          await sendSms(supabase, op.target_phone, smsMsg, op.target_name);
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
            user_id: op.target_user_id, entry_type: "DEBIT", amount, reference: ref,
            source_category: odPortion > 0 ? "OVERDRAFT_DRAW" : "ADMIN_ADJUSTMENT",
            metadata: {
              description: `Admin debit: ${op.reason}`,
              admin_wallet_operation_id: op.id,
              overdraft_portion: odPortion,
            },
          });
          if (overdraftAccessFee > 0) {
            await postLedger(supabase, {
              user_id: op.target_user_id, entry_type: "DEBIT", amount: overdraftAccessFee, reference: `${ref}-ODFEE`,
              source_category: "OVERDRAFT_FEE",
              metadata: { description: "2.75% overdraft access fee", admin_wallet_operation_id: op.id },
            });
          }
          const smsMsg = `Dear ${op.target_name || "User"}, UGX ${amount.toLocaleString()} has been debited from your wallet by admin. Reason: ${op.reason}${overdraftAccessFee > 0 ? `. Overdraft fee: UGX ${overdraftAccessFee.toLocaleString()}` : ""}.`;
          await sendSms(supabase, op.target_phone, smsMsg, op.target_name);
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
            user_id: op.target_user_id, entry_type: "DEBIT", amount, reference: ref,
            source_category: "TRANSFER_OUT",
            metadata: {
              description: `Admin transfer to ${op.destination_name || op.destination_email}: ${op.reason}`,
              admin_wallet_operation_id: op.id,
              destination_email: op.destination_email,
            },
          });
          if (overdraftAccessFee > 0) {
            await postLedger(supabase, {
              user_id: op.target_user_id, entry_type: "DEBIT", amount: overdraftAccessFee, reference: `${ref}-ODFEE`,
              source_category: "OVERDRAFT_FEE",
              metadata: { description: "2.75% overdraft access fee", admin_wallet_operation_id: op.id },
            });
          }
          await postLedger(supabase, {
            user_id: op.destination_user_id!, entry_type: "CREDIT", amount, reference: ref,
            source_category: "TRANSFER_IN",
            metadata: {
              description: `Admin transfer from ${op.target_name || op.target_email}: ${op.reason}`,
              admin_wallet_operation_id: op.id,
              source_email: op.target_email,
            },
          });
          const smsSource = `Dear ${op.target_name || "User"}, UGX ${amount.toLocaleString()} has been transferred from your wallet to ${op.destination_name || op.destination_email} by admin. Reason: ${op.reason}.`;
          const smsDest = `Dear ${op.destination_name || "User"}, UGX ${amount.toLocaleString()} has been credited to your wallet from ${op.target_name || op.target_email} by admin.`;
          await sendSms(supabase, op.target_phone, smsSource, op.target_name);
          // Fetch destination phone
          const { data: destEmp } = await supabase.from("employees").select("phone").eq("email", op.destination_email).maybeSingle();
          await sendSms(supabase, destEmp?.phone, smsDest, op.destination_name);
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
            user_id: op.target_user_id, entry_type: "DEBIT", amount, reference: ref,
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
              user_id: op.target_user_id, entry_type: "DEBIT", amount: Number(op.service_fee),
              reference: `${ref}-FEE`, source_category: "WITHDRAW_FEE",
              metadata: { description: "Withdrawal service fee", admin_wallet_operation_id: op.id },
            });
          }
          if (overdraftAccessFee > 0) {
            await postLedger(supabase, {
              user_id: op.target_user_id, entry_type: "DEBIT", amount: overdraftAccessFee,
              reference: `${ref}-ODFEE`, source_category: "OVERDRAFT_FEE",
              metadata: { description: "2.75% overdraft access fee", admin_wallet_operation_id: op.id },
            });
          }

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
            // Yo payout is handled by admin manually — mark reference, rely on ops.
            gatewayRef = `YO-MANUAL-${Date.now()}`;
          } else {
            gatewayRef = `CASH-${Date.now()}`;
          }

          const smsMsg = `Dear ${op.target_name || "User"}, UGX ${amount.toLocaleString()} has been withdrawn from your wallet by admin to ${op.destination_phone}. Fee: UGX ${Number(op.service_fee).toLocaleString()}${overdraftAccessFee > 0 ? `, OD fee: UGX ${overdraftAccessFee.toLocaleString()}` : ""}. Reason: ${op.reason}.`;
          await sendSms(supabase, op.target_phone, smsMsg, op.target_name);

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
        await supabase.from("admin_wallet_operations").update({
          status: "failed",
          execution_error: errMsg,
        }).eq("id", op.id);
        return respond(false, { error: errMsg });
      }
    }

    return respond(false, { error: `Unknown action: ${action}` });
  } catch (err) {
    console.error("[admin-wallet-operation] fatal:", err);
    return respond(false, { error: (err as Error).message || "Internal error" });
  }
});