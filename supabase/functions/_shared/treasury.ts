// Treasury pool guard for direct (non-wallet) company payouts.
// Every payment the company sends out must first draw from a named treasury
// account. If that account is empty the payout is blocked before any money
// leaves Yo Payments / GosentePay.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TreasuryAccount =
  | "general"
  | "operations"
  | "loans_overdrafts"
  | "invest_earn"
  | "profits"
  | "fees_income"
  | "loyalty_fund"
  | "user_wallets";

function svc() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface TreasuryReserveArgs {
  account: TreasuryAccount;
  amount: number;
  reference: string;
  description?: string;
  email?: string | null;
  name?: string | null;
  performedBy?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Draw money out of a treasury account before sending it.
 * Returns { ok: false, error } when the account cannot cover the payout —
 * the caller MUST abort the payout in that case.
 */
export async function treasuryReserve(
  args: TreasuryReserveArgs,
): Promise<{ ok: boolean; error?: string }> {
  const params = {
    p_account: args.account,
    p_amount: args.amount,
    p_reference: args.reference,
    p_description: args.description ?? null,
    p_email: args.email ?? null,
    p_name: args.name ?? null,
    p_performed_by: args.performedBy ?? "system",
    p_metadata: args.metadata ?? {},
  };

  // The RPC is idempotent by reference, so transient gateway resets can be
  // retried without debiting the treasury account twice.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { data, error } = await svc().rpc("treasury_external_payout", params);
      if (!error) return { ok: !!(data as any)?.ok };

      const msg = String(error.message || error);
      const isTransient = /upstream connect|disconnect|connection reset|connection termination|fetch failed|timeout|temporarily unavailable/i.test(msg);
      if (!isTransient || attempt === 3) {
        console.error("[treasury] reserve failed:", msg);
        return { ok: false, error: msg.replace(/^.*TREASURY_INSUFFICIENT:\s*/, "") };
      }
      console.warn(`[treasury] transient reserve failure; retrying (${attempt}/3):`, msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isTransient = /upstream connect|disconnect|connection reset|connection termination|fetch failed|timeout|temporarily unavailable/i.test(msg);
      if (!isTransient || attempt === 3) {
        console.error("[treasury] reserve error:", msg);
        return { ok: false, error: msg };
      }
      console.warn(`[treasury] transient reserve error; retrying (${attempt}/3):`, msg);
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }

  return { ok: false, error: "Treasury connection failed after retries" };
}

/** Put the money back when the payout did not go through. */
export async function treasuryRelease(args: {
  account: TreasuryAccount;
  amount: number;
  reference: string;
  description?: string;
  performedBy?: string | null;
}): Promise<void> {
  try {
    await svc().rpc("treasury_external_reverse", {
      p_account: args.account,
      p_amount: args.amount,
      p_reference: args.reference,
      p_description: args.description ?? "Payout failed — funds returned",
      p_performed_by: args.performedBy ?? "system",
    });
  } catch (e) {
    console.error("[treasury] release error:", e);
  }
}
