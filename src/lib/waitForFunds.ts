/**
 * Retries a payout while the paying account is short of money.
 * Tries immediately, then every 20s for up to 2 minutes. Stops early on
 * success or on any error that is not about funding.
 */
const FUNDING_WORDS = /insufficient|cannot cover|float|empty|not funded|TREASURY_INSUFFICIENT|balance/i;

export const isFundingError = (data: any, error: any) => {
  const text = `${data?.code || ''} ${data?.error || ''} ${error?.message || ''}`;
  // "Part-paid" refusals mention the remaining balance but are not funding
  // problems — retrying them for 2 minutes hides the real instruction.
  if (/part-paid/i.test(text)) return false;
  return FUNDING_WORDS.test(text);
};

export async function waitForFunds<T = any>(
  attempt: () => Promise<{ data: any; error: any }>,
  onWaiting?: (secondsLeft: number) => void,
  windowMs = 120_000,
  everyMs = 20_000,
): Promise<{ data: any; error: any; timedOut: boolean }> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await attempt();
    if (!res.error && res.data?.ok) return { ...res, timedOut: false };
    if (!isFundingError(res.data, res.error)) return { ...res, timedOut: false };
    const left = windowMs - (Date.now() - start);
    if (left <= 0) return { ...res, timedOut: true };
    const wait = Math.min(everyMs, left);
    const until = Date.now() + wait;
    while (Date.now() < until) {
      onWaiting?.(Math.ceil((windowMs - (Date.now() - start)) / 1000));
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
