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
  try {
    const { data, error } = await svc().rpc("treasury_external_payout", {
      p_account: args.account,
      p_amount: args.amount,
      p_reference: args.reference,
      p_description: args.description ?? null,
      p_email: args.email ?? null,
      p_name: args.name ?? null,
      p_performed_by: args.performedBy ?? "system",
      p_metadata: args.metadata ?? {},
    });
    if (error) {
      const msg = String(error.message || error);
      console.error("[treasury] reserve failed:", msg);
      return { ok: false, error: msg.replace(/^.*TREASURY_INSUFFICIENT:\s*/, "") };
    }
    return { ok: !!(data as any)?.ok };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[treasury] reserve error:", msg);
    return { ok: false, error: msg };
  }
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
