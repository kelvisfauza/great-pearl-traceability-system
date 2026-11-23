type Rpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;
type ProviderReply = { status: number; body: any };

/** Never throw for bookkeeping after acceptance: callers must not refund paid money. */
export async function recordedPayout(
  reference: string,
  amount: number,
  send: () => Promise<ProviderReply>,
  accepted: (status: number, body: any) => boolean,
  rpc: Rpc,
  warn: (message: string) => void,
): Promise<ProviderReply> {
  const claimed = await rpc("prepare_gosentepay_payout", { p_reference: reference, p_amount: amount });
  if (claimed !== true) throw new Error("Payout reference already exists; check its status before sending again.");
  const result = await send();
  const paid = accepted(result.status, result.body);
  // Server failures are uncertain, not evidence that money was rejected.
  if (paid || (result.status >= 400 && result.status < 500)) {
    try {
      const saved = await rpc("mark_gosentepay_payout_outcome", { p_reference: reference, p_accepted: paid });
      if (saved !== true) throw new Error("Provider outcome was not saved");
      if (paid) {
        const accounted = await rpc("settle_gosentepay_payout", { p_reference: reference });
        if (accounted !== true) throw new Error("Payout accounting was not confirmed");
      }
    } catch {
      warn(`Payout ${reference} requires accounting recovery; do not resend or refund it.`);
    }
  }
  return result;
}

export function treasuryAlertPresentation(alertTypes: string[]) {
  const funding = alertTypes.some(type => type === "insufficient" || type === "low_balance" || type === "blocked_payout");
  return {
    title: funding ? "Treasury accounts need attention" : "Treasury reconciliation needs review",
    instruction: funding
      ? "Open Treasury to review the difference and any accounts that need funding. Do not fund accounts just to hide a reconciliation difference."
      : "Open Treasury to investigate the payment and cash records. Do not add funding just to hide this difference.",
  };
}