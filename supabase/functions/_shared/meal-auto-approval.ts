// Automatic Finance approval for meal plans (owner rules, Nov 2026):
// meal plans only, after Admin approval, itemised, at most UGX 50,000,
// one per company per Uganda day, enough GosentePay money, in line with
// recent meal plans. Anything else waits for Finance by hand.
export const MEAL_AUTO_APPROVAL_LIMIT = 50000;

export function kampalaDay(now: Date): string {
  return new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

export function parseMealItems(description: string): { name: string; amount: number }[] {
  const items: { name: string; amount: number }[] = [];
  for (const raw of String(description || '').split(/[\n,]+/)) {
    const m = raw.trim().match(/^([A-Za-z][A-Za-z\s'&/().]*?)\s*[-:=]\s*([\d,]+)\s*$/);
    if (m) items.push({ name: m[1].trim(), amount: Number(m[2].replace(/,/g, '')) });
  }
  return items;
}

export interface MealAutoInput {
  requestType: string;
  amount: number;
  description: string;
  requestedPaymentMethod: string | null;
  autoApprovedToday: boolean;
  payoutBalance: number;
  payoutFee: number;
  recentPaidAmounts: number[];
}

export function evaluateMealAutoApproval(i: MealAutoInput): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (i.requestType !== 'meal_plan') return { ok: false, reasons: ['Only meal plans are approved automatically'] };
  if (!(i.amount > 0)) reasons.push('Amount is missing');
  if (i.amount > MEAL_AUTO_APPROVAL_LIMIT) reasons.push(`Amount is above UGX ${MEAL_AUTO_APPROVAL_LIMIT.toLocaleString()}`);
  if (i.requestedPaymentMethod === 'cash') reasons.push('Cash payments need Finance to hand over the money');
  if (i.autoApprovedToday) reasons.push('A meal plan was already approved automatically today');
  const items = parseMealItems(i.description);
  if (items.length === 0) reasons.push('No items to buy are listed with their prices');
  else {
    const sum = items.reduce((s, x) => s + x.amount, 0);
    if (sum !== i.amount) reasons.push(`Listed items add up to UGX ${sum.toLocaleString()}, not UGX ${i.amount.toLocaleString()}`);
  }
  if (i.payoutBalance < i.amount + i.payoutFee) reasons.push('Not enough money on GosentePay');
  const recent = i.recentPaidAmounts.filter(n => n > 0).sort((a, b) => a - b);
  if (recent.length >= 3) {
    const median = recent[Math.floor(recent.length / 2)];
    if (i.amount > median * 1.5) reasons.push(`Amount is much higher than usual meal plans (usual about UGX ${median.toLocaleString()})`);
  }
  return { ok: reasons.length === 0, reasons };
}
