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
    const m = raw.trim().match(/^([A-Za-z][A-Za-z\s'&/().]*?)\s*(?:[-:=]\s*|\s)([\d,]+)\s*$/);
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
  recentDescriptions?: string[]; // past paid meal plans, for item-by-item checks
  limit?: number;        // Settings override of MEAL_AUTO_APPROVAL_LIMIT
  usualMultiplier?: number; // Settings override of 1.5
}

export function evaluateMealAutoApproval(i: MealAutoInput): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const limit = i.limit ?? MEAL_AUTO_APPROVAL_LIMIT;
  const mult = i.usualMultiplier ?? 1.5;
  if (i.requestType !== 'meal_plan') return { ok: false, reasons: ['Only meal plans are approved automatically'] };
  if (!(i.amount > 0)) reasons.push('Amount is missing');
  if (i.amount > limit) reasons.push(`Amount is above UGX ${limit.toLocaleString()}`);
  if (i.requestedPaymentMethod === 'cash') reasons.push('Cash payments need Finance to hand over the money');
  if (i.autoApprovedToday) reasons.push('A meal plan was already approved automatically today');
  const items = parseMealItems(i.description);
  if (items.length === 0) reasons.push('No items to buy are listed with their prices');
  else {
    const sum = items.reduce((s, x) => s + x.amount, 0);
    if (sum !== i.amount) reasons.push(`Listed items add up to UGX ${sum.toLocaleString()}, not UGX ${i.amount.toLocaleString()}`);
  }
  if (i.payoutBalance < i.amount + i.payoutFee) reasons.push('Not enough money on GosentePay');
  // Item-by-item check (owner choice, Nov 2026): each item is compared with
  // that same item's past prices; fees/charges are skipped; new items wait.
  const history = new Map<string, number[]>();
  for (const d of i.recentDescriptions || []) for (const it of parseMealItems(d)) {
    const k = itemKey(it.name); if (it.amount > 0) history.set(k, [...(history.get(k) || []), it.amount]);
  }
  if (history.size > 0 && items.length > 0) {
    for (const it of items) {
      const k = itemKey(it.name);
      if (CHARGE_KEYS.has(k)) continue;
      const past = (history.get(k) || []).sort((a, b) => a - b);
      if (past.length === 0) { if (it.amount <= NEW_ITEM_ALLOWANCE) continue; reasons.push(`${it.name} has not been bought in recent meal plans`); continue; }
      const median = past[Math.floor(past.length / 2)];
      if (it.amount > median * mult) reasons.push(`${it.name} costs UGX ${it.amount.toLocaleString()}, usually about UGX ${median.toLocaleString()}`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

// Small new items (e.g. salt) do not block automatic approval.
export const NEW_ITEM_ALLOWANCE = 2000;
const CHARGE_KEYS = new Set(['charges', 'charge', 'fee', 'fees', 'transport', 'withdraw charges']);
export function itemKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim().replace(/(?<=\w{3})s$/, '');
}
